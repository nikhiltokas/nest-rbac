# Nest-RBAC

A minimal and lightweight NestJS RBAC starter with role guards, feature policies, and
ownership checks.

The scope of this project is RBAC.

> This is not a boilerplate or production-grade solution. Registration and JWT login are included to support the sample routes. They are not a complete authentication design. Hence, bring your auth flows.

## No Dependency

- Built with NestJS guards, decorators, and plain TypeScript objects. No extra RBAC library.
- Policies live alongside their features.
- Guards and services share the same policy definitions.

It supports `CREATE`, `READ`, `UPDATE`, and `DELETE` with `OWN` and `ANY` access.
Field-level permissions and conditions such as a record's status are outside
the built-in rules. It does not include a full rules engine like CASL.

## Usage

The implementation lives in [the authorization folder](src/modules/auth/authorization).
Snippets omit imports; linked files contain the full code.

### Roles

Available roles: `SUPER_ADMIN`, `MODERATOR`, and `USER`.
Apply `@Roles()` to a controller or route:

```ts
@Controller('admin')
@Roles(Roles.SUPER_ADMIN, Roles.MODERATOR)
export class AdminController {
  @Get()
  overview() {
    return { message: 'Admin area' };
  }
}
```

`@Roles()` applies `RolesGuard` and accepts any of the listed roles. A route's
role list overrides the controller's role list.

See [the roles decorator](src/modules/auth/authorization/decorators/roles.decorator.ts).

### Policies and permissions

Define a feature's permissions in a policy. The
[note policy](src/modules/note/policy/note.policy.ts):

```ts
export const NOTE_POLICY: PermissionPolicy = {
  SUPER_ADMIN: [
    Permission.CREATE.OWN,
    Permission.READ.ANY,
    Permission.UPDATE.ANY,
    Permission.DELETE.ANY,
  ],
  MODERATOR: [
    Permission.CREATE.OWN,
    Permission.READ.ANY,
    Permission.UPDATE.OWN,
  ],
  USER: [Permission.READ.OWN],
};
```

`OWN` restricts access to the user's records; `ANY` allows access regardless of
ownership. Only explicitly listed actions are allowed. `SUPER_ADMIN` has no
automatic bypass.

Apply `@Policy()` to the controller and `@RequirePermissions()` to its routes:

```ts
@Controller('notes')
@Policy(NOTE_POLICY)
export class NoteController {
  constructor(private readonly noteService: NoteService) {}

  @Post()
  @RequirePermissions(Permissions.CREATE)
  create(@Body() input: NoteDto, @CurrentUser() actor: AuthorizationActor) {
    return this.noteService.create(input, actor);
  }
}
```

`PermissionsGuard` is registered globally in `AuthModule`. It checks the required
actions against the controller's policy. No per-route guard setup is needed.

`@RequirePermissions(Permissions.READ, Permissions.UPDATE)` requires both actions.
When combined with `@Roles()`, both the role and permission checks must pass.

See [the note controller](src/modules/note/note.controller.ts) for a full example.

### Ownership

`PermissionsGuard` checks actions, not record ownership. Enforce `OWN` access in
the service with `AuthorizationService`, using the same policy.

The note update uses `authorizedWhere()` to apply ownership to the database query:

```ts
const filter = this.authorization.authorizedWhere({
  actor,
  policy: NOTE_POLICY,
  action: Permissions.UPDATE,
  match: { id },
  ownerField: 'userId',
});

const note = await this.prismaService.db.orm.public.Note.where(filter).update({
  title: input.title,
  content: input.content,
});
```

With `NOTE_POLICY`, a moderator gets `{ id, userId: actor.id }`; a super admin gets
`{ id }`. Set `ownerField` in service code to the record's owner field.

For a record already loaded, use `AuthorizationService.assertCan()` and pass
`resource: { ownerId: note.userId }` along with the actor, policy, and action.

Both helpers are used in [the note service](src/modules/note/note.service.ts).
New records take their owner ID from the authenticated user.

### Public routes

Routes require authentication by default. Mark public routes with `@Public()`:

```ts
@Get()
@Public()
findAll(@Query() query: PaginationDto) {
  return this.noteService.findAll(query.limit, query.offset);
}
```

`@Public()` skips JWT authentication only when the route has no role or permission
requirements. It does not bypass those checks.

The sample note and comment read routes are public and do not enforce `READ`
permissions. Their write routes enforce permissions and ownership.

### Startup validation

The app validates route configuration at startup and reports:

- A route with required permissions but no controller policy.
- A route under a policy without required permissions, unless it is public and has no role restriction.
- Invalid roles, actions, or scopes in the rules.
- Permissions that do not match the route's HTTP method: `GET`/`HEAD` use `READ`,
  `POST` uses `CREATE`, `PUT`/`PATCH` use `UPDATE`, and `DELETE` uses `DELETE`.

For a `POST` that publishes an existing note, use
`@RequirePermissions(Permissions.UPDATE)` with
`@AllowPermissionMethodMismatch('Publishing updates an existing note.')`.
The exception allows the HTTP method mismatch; the permission remains required.

## Extending it

For a new feature, add a policy, declare route permissions, and enforce ownership
in its service. Import `AuthorizationModule` into modules that use its guards or
`AuthorizationService`. The [notes](src/modules/note) and
[comments](src/modules/comment) show the full setup.

To connect your authentication system, populate `request.user` with a trusted
user's `id` and `role` before authorization runs. `AuthModule` runs the JWT guard
before the permissions guard.

To add roles, update the
[`UserRole` enum](src/prisma/models/users.prisma),
[role constants](src/modules/auth/authorization/constants/role.constant.ts), and
the relevant policies.

## Prerequisites

- **Node.js** `^22.18.0 || ^24.11.0 || >=26.0.0`
- **Bun** — used as the package manager
- **PostgreSQL** 15 or newer — used by the example application
- **`vp` CLI** _(optional)_ — install globally for shorthand commands; without it, use `bun run <script>` instead

```powershell
# Windows — install the global vp CLI (optional)
irm https://vite.plus/ps1 | iex

# Activate in the current terminal after installation
. "$env:APPDATA\vite-plus\env.ps1"
```

## Toolchain

[Vite+](https://viteplus.dev) 1.3.0 brings Vite, Vitest, Oxlint, and Oxfmt together
under the `vp` CLI for development, tests, linting, and formatting.
Configuration lives in `vite.config.ts`; e2e tests select their file pattern with
`--mode e2e`. The Vite alias and Vitest override in `package.json` keep dependencies
on the bundled toolchain versions.

## Setup

```bash
vp install
```

Bun is selected from `bun.lock`; its version is currently unpinned. To pin a version,
use `vp env pin bun@<version> --target package-manager`. The `packageManager` field
then selects the manager and version used by `vp install`, `vp add`, and `vp remove`.

Without the global CLI, run `bun install`, then use `bun run <script>` or
`bunx --no-install vp <command>`.

Copy [`.env.example`](.env.example) to `.env`. Set `DATABASE_URL` to your PostgreSQL
connection string, set `JWT_SECRET` to a random secret of at least 32 characters,
and add `PORT=3000`. The example file includes a command to generate the secret.

For a new, empty database, generate the database types and create the tables:

```bash
vp run contract:emit
vp run db:init
```

Optionally run `vp run db:seed` to add one account for each role. The sample
accounts are listed in [the seed file](src/prisma/seed/users.seed.ts).

## Development

```bash
vp run start:dev    # watch mode
vp run start:debug  # debug mode
```

`vp dev` starts the built-in Vite dev server. This backend uses Nest's watch server
through `vp run start:dev`. Use `vp run <task>` for scripts in `package.json`.

## Code Quality

```bash
vp check       # format, lint, and type-check
vp check --fix # auto-fix issues
```

## Testing

```bash
vp test                       # unit tests and HTTP authorization tests
vp test --watch               # watch mode
vp run test:e2e               # e2e tests
vp test run --coverage        # coverage
```

Tests match `**/*.spec.ts`, including the HTTP authorization tests. The separate
e2e command matches `**/*.e2e-spec.ts`; no files use that pattern yet, so it
currently exits with "No test files found".
TypeScript path aliases use Vite's built-in resolver.

You can also try the API with the included
[Postman collection](postman/nest-rbac.postman_collection.json).

## Production

```bash
vp run build       # compile
vp run start:prod  # run built output
```

`vp run build` preserves Nest's compiler and decorator metadata. The built-in
`vp build` targets Vite applications and expects an entry such as `index.html`,
which this backend does not have.

## License

UNLICENSED
