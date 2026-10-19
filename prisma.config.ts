import 'dotenv/config';
import { globSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { definePrismaConfig } from 'prisma/config';
import { defineConfig as ormConfig } from '@prisma/orm-postgres/config';

let orm = ormConfig({
  contract: './src/prisma/models/**/*.prisma',
  output: './src/prisma/generated',
  db: {
    connection: process.env['DATABASE_URL']!,
  },
});

// cli-engine 0.7.0 resolves globs to backslashes on Windows, escaping wildcards.
// Expand them before Prisma resolves paths; each config load includes new files.
if (process.platform === 'win32' && orm.contract) {
  const { source } = orm.contract;
  orm = {
    ...orm,
    contract: {
      ...orm.contract,
      source: {
        ...source,
        inputs: [
          ...globSync(source.inputs ?? [], {
            cwd: fileURLToPath(new URL('.', import.meta.url)),
          }),
        ],
      },
    },
  };
}

export default definePrismaConfig({ orm });
