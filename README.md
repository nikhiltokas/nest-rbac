# Nest-RBAC

A minimal, dependency-free NestJS RBAC starter kit with ready-to-use snippets for roles, guards,
and decorators. Skip the initial setup and plug it into your project — then expand it however you
like.

> This is intentionally not a boilerplate or production-grade solution. It's a simple starting point.

## Prerequisites

- **Node.js** `>=22.18.0`
- **Bun** — used as the package manager
- **`vp` CLI** _(optional)_ — install globally for shorthand commands; without it, use `bun run <script>` instead

```powershell
# Windows — install the global vp CLI (optional)
irm https://vite.plus/ps1 | iex
```

## Toolchain

[Vite+](https://viteplus.dev) — Vite, Vitest, Oxlint, and Oxfmt unified under the `vp` CLI.

## Setup

```bash
vp install
```

## Development

```bash
vp run start:dev    # watch mode
vp run start:debug  # debug mode
```

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

## Production

```bash
vp run build       # compile
vp run start:prod  # run built output
```

## License

UNLICENSED
