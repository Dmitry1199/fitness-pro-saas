import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import { AppModule } from '../../src/app.module';
import { Handler, HandlerEvent, HandlerContext } from '@netlify/functions';

let app: any;

async function bootstrap() {
  if (!app) {
    app = await NestFactory.create(AppModule, {
      cors: {
        origin: process.env.FRONTEND_URL || '*',
        credentials: true,
      },
    });

    // Global validation pipe
    app.useGlobalPipes(new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }));

    // Global prefix for all routes
    app.setGlobalPrefix('api');

    // Swagger documentation setup
    const config = new DocumentBuilder()
      .setTitle('FitnessPro SaaS API')
      .setDescription('Comprehensive fitness training platform API')
      .setVersion('1.0')
      .addBearerAuth()
      .addTag('Authentication', 'User authentication and authorization')
      .addTag('Users', 'User management')
      .addTag('Trainers', 'Trainer-specific operations')
      .addTag('Clients', 'Client-specific operations')
      .addTag('Workouts', 'Workout management')
      .addTag('Sessions', 'Training session management')
      .addTag('Payments', 'Payment processing and subscriptions')
      .addTag('Messages', 'Real-time messaging system')
      .build();

    const document = SwaggerModule.createDocument(app, config);
    SwaggerModule.setup('api/docs', app, document);

    await app.init();
  }

  return app;
}

export const handler: Handler = async (event: HandlerEvent, context: HandlerContext) => {
  console.log('🚀 FitnessPro API Function called:', event.path);

  try {
    const app = await bootstrap();

    // Extract the path without the function prefix
    const path = event.path.replace('/.netlify/functions/api', '') || '/';

    // Create Express-like request object
    const req = {
      method: event.httpMethod,
      url: path,
      headers: event.headers,
      body: event.body,
      query: event.queryStringParameters || {},
      params: {},
    };

    // Create Express-like response object
    let statusCode = 200;
    let body = '';
    let headers = {
      'Content-Type': 'application/json',
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
      'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
    };

    const res = {
      status: (code: number) => {
        statusCode = code;
        return res;
      },
      json: (data: any) => {
        body = JSON.stringify(data);
        return res;
      },
      send: (data: any) => {
        body = typeof data === 'string' ? data : JSON.stringify(data);
        return res;
      },
      setHeader: (key: string, value: string) => {
        headers[key] = value;
        return res;
      },
    };

    // Handle CORS preflight
    if (event.httpMethod === 'OPTIONS') {
      return {
        statusCode: 200,
        headers,
        body: '',
      };
    }

    // Route to appropriate handlers based on path
    if (path === '/' || path === '/health') {
      return {
        statusCode: 200,
        headers,
        body: JSON.stringify({
          message: 'FitnessPro SaaS Backend API is running! 🚀',
          version: '1.0.0',
          timestamp: new Date().toISOString(),
          docs: '/api/docs',
          environment: 'netlify-serverless',
        }),
      };
    }

    // For now, return a basic API response
    // In a full implementation, you would integrate with NestJS request handling
    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        message: 'FitnessPro API endpoint',
        path: path,
        method: event.httpMethod,
        environment: 'netlify-serverless',
        note: 'Full NestJS integration coming soon',
      }),
    };

  } catch (error) {
    console.error('API function error:', error);
    return {
      statusCode: 500,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
      },
      body: JSON.stringify({
        error: 'Internal Server Error',
        message: error instanceof Error ? error.message : 'Unknown error',
      }),
    };
  }
};
