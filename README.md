# Nest-RBAC

A minimal, dependency-free NestJS RBAC starter kit with ready-to-use snippets for roles, guards,
and decorators. Skip the initial setup and plug it into your project — then expand it however you
like.

> This is intentionally not a boilerplate or production-grade solution. It's a simple starting point.

## Prerequisites

- **Node.js** `^22.18.0 || ^24.11.0 || >=26.0.0`
- **Bun** — used as the package manager
- **`vp` CLI** _(optional)_ — install globally for shorthand commands; without it, use `bun run <script>` instead

```powershell
# Windows — install the global vp CLI (optional)
irm https://vite.plus/ps1 | iex

# Activate in the current terminal after installation
. "$env:APPDATA\vite-plus\env.ps1"
```

## Toolchain

[Vite+](https://viteplus.dev) 1.3.0 — Vite, Vitest, Oxlint, and Oxfmt unified under the `vp` CLI.
Configuration lives in `vite.config.ts`; e2e tests select their file pattern with `--mode e2e`.
The Vite alias and Vitest override in `package.json` keep dependencies on the bundled toolchain versions.

## Setup

```bash
vp install
```

Bun is inferred from `bun.lock`; its version is currently unpinned. To pin a version explicitly,
use `vp env pin bun@<version> --target package-manager`. The `packageManager` field then selects
the manager and version used by `vp install`, `vp add`, and `vp remove`.

Without the global CLI, run `bun install`, then use `bun run <script>` or `bunx --no-install vp <command>`.

## Development

```bash
vp run start:dev    # watch mode
vp run start:debug  # debug mode
```

`vp dev` starts the built-in Vite dev server. This backend uses Nest's watch server through
`vp run start:dev`. Use `vp run <task>` for scripts in `package.json`.

## Code Quality

```bash
vp check       # format, lint, and type-check
vp check --fix # auto-fix issues
```

## Testing

```bash
vp test                        # unit tests
vp test --watch                # watch mode
vp run test:e2e                # e2e tests
vp test run --coverage         # coverage
```

Unit tests match `**/*.spec.ts`; e2e tests match `**/*.e2e-spec.ts`. No test files are included yet,
so these commands currently exit with “No test files found”.
TypeScript path aliases use Vite's built-in resolver.

## Production

```bash
vp run build       # compile
vp run start:prod  # run built output
```

`vp run build` preserves Nest's compiler and decorator metadata. The built-in `vp build` targets
Vite applications and expects an entry such as `index.html`, which this backend does not have.

## License

UNLICENSED
