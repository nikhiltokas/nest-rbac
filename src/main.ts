import 'reflect-metadata';
import { Logger, ValidationPipe } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module.js';
import { PermissionConfigurationError } from './modules/auth/authorization/errors/permission-configuration.error.js';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  app.useGlobalPipes(
    new ValidationPipe({
      transform: true,
      whitelist: true,
      forbidNonWhitelisted: true,
    }),
  );
  app.enableShutdownHooks();
  try {
    await app.listen(process.env.PORT!);
  } catch (error) {
    if (!(error instanceof PermissionConfigurationError)) throw error;

    Logger.error(error.message, 'Permissions');
    process.exitCode = 1;
    await app.close();
  }
}
await bootstrap();
