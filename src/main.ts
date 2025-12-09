import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { Logger } from '@nestjs/common';

async function bootstrap() {
  const logger = new Logger('Bootstrap');

  const app = await NestFactory.create(AppModule, {
    logger: ['log', 'error', 'warn', 'debug'],
  });

  const apiVersion = process.env.API_VERSION || 'api/v1';

  const port = process.env.PORT || 3000;
  await app.listen(port);
  logger.log(`Wallet Service Backend is running on: http://localhost:${port}/`);
  logger.log(`Home: http://localhost:${port}/${apiVersion}`);
  logger.log(`API Documentation available at: http://localhost:${port}/docs`);
  logger.log(`Health: http://localhost:${port}/${apiVersion}/health`);
}
bootstrap();
