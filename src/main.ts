import 'reflect-metadata';
import { Logger } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { API_PREFIX, configureApp } from './common/configure-app';
import { AppConfigService } from './config/app-config.service';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  configureApp(app);
  app.enableShutdownHooks();
  const port = app.get(AppConfigService).get('PORT');
  await app.listen(port);
  Logger.log(`KopiKini API listening on http://localhost:${port}/${API_PREFIX}`, 'Bootstrap');
}

void bootstrap();
