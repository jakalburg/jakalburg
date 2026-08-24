/// <reference types="express" />
import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { ExpressAdapter } from '@nestjs/platform-express';
import express from 'express';

import { AppModule } from './app.module';
import { env } from './config/env';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { requestIdMiddleware } from './common/middleware/request-id.middleware';

const server = express();
let cachedApp: any;

async function bootstrap() {
  if (!cachedApp) {
    const app = await NestFactory.create(AppModule, new ExpressAdapter(server));

    app.use(express.json({ limit: '10mb' }));
    app.use(express.urlencoded({ extended: true, limit: '10mb' }));

    app.setGlobalPrefix('api');

    // Global validation — strips unknown props and coerces DTO types.
    // (Enhancement over the reference; keeps controllers lean.)
    app.useGlobalPipes(
      new ValidationPipe({
        whitelist: true,
        forbidNonWhitelisted: false,
        transform: true,
        transformOptions: { enableImplicitConversion: true },
      }),
    );

    // Normalize each origin: split on commas, trim whitespace, strip any
    // stray leading '='/quotes (a common paste error in the Vercel env editor),
    // and drop a trailing slash so exact-match comparison stays robust.
    const parseOrigins = (value?: string) =>
      value
        ? value
            .split(',')
            .map((url) => url.trim().replace(/^[=\s"']+/, '').replace(/\/+$/, ''))
            .filter(Boolean)
        : [];

    const allowedOrigins = [
      ...parseOrigins(env.FRONTEND_URL),
      ...parseOrigins(env.FRONTEND_URL_PROD),
    ];

    app.enableCors({
      origin: (origin, callback) => {
        if (!origin) return callback(null, true);
        if (allowedOrigins.length === 0 || allowedOrigins.includes(origin)) {
          callback(null, true);
        } else {
          console.warn(`Blocked by CORS: ${origin}`);
          callback(new Error(`Not allowed by CORS: ${origin}`));
        }
      },
      methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
      credentials: true,
    });

    app.use(requestIdMiddleware);

    if (env.isProduction) {
      console.log(`Running in production: ${env.PRODUCTION_URL}`);
      console.log(`Frontend URL: ${env.FRONTEND_URL}`);
    } else {
      console.log('Running in development mode');
      console.log(`Frontend URL: ${env.FRONTEND_URL || '(none configured)'}`);

      const config = new DocumentBuilder()
        .setTitle('Jakalburg API')
        .setDescription(
          'Jakalburg server API (development only). Protected endpoints need a ' +
            'JWT — click **Authorize**, paste the `accessToken` from login/verify, ' +
            'and the lock icon marks which routes require it.',
        )
        .setVersion('1.0')
        .addTag(
          'Auth',
          'Registration, login, Google One Tap, OTP verification, and password management.',
        )
        .addTag('Products', 'Public product catalogue: list, detail, related.')
        .addTag('Cart', "The authenticated user's persistent cart (get + replace).")
        .addTag('Orders', 'Place orders and read your order history.')
        .addTag('Addresses', 'Saved address history for the authenticated user.')
        .addApiKey(
          { type: 'apiKey', name: 'x-api-key', in: 'header' },
          'apiKey',
        )
        .addBearerAuth(
          { type: 'http', scheme: 'bearer', bearerFormat: 'JWT' },
          'jwt',
        )
        .build();

      const document = SwaggerModule.createDocument(app, config);
      SwaggerModule.setup(env.SWAGGER_PATH, app, document, {
        swaggerOptions: { persistAuthorization: true },
      });
    }

    await app.init();

    // Ensure the admin user exists before any serverless freeze.
    const prismaService = app.get(
      require('./prisma/prisma.service').PrismaService,
    );
    await prismaService.checkAndCreateAdmin();

    cachedApp = app;
  }
  return server;
}

// Vercel serverless entrypoint.
export default async function handler(req: any, res: any) {
  const app = await bootstrap();
  return app(req, res);
}

// Local development fallback.
if (!process.env.VERCEL) {
  bootstrap().then(() => {
    server.listen(env.PORT, () => {
      console.log(
        `Swagger:  http://localhost:${env.PORT}${env.SWAGGER_PATH}`,
      );
      console.log(`Application is running on: http://localhost:${env.PORT}`);
    });
  });
}
