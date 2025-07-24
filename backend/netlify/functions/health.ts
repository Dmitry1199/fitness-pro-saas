import { Handler, HandlerEvent, HandlerContext } from '@netlify/functions';

export const handler: Handler = async (event: HandlerEvent, context: HandlerContext) => {
  console.log('🏥 Health check function called');

  try {
    // Basic health check
    const healthData = {
      status: 'healthy',
      uptime: process.uptime(),
      timestamp: new Date().toISOString(),
      environment: 'netlify-serverless',
      version: '1.0.0',
      services: {
        api: 'running',
        database: 'needs-connection', // Would check database in real implementation
        messaging: 'serverless-mode',
      },
      deployment: {
        platform: 'netlify',
        region: process.env.AWS_REGION || 'unknown',
        function: 'health',
      },
    };

    return {
      statusCode: 200,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'Content-Type, Authorization',
        'Access-Control-Allow-Methods': 'GET, OPTIONS',
        'Cache-Control': 'no-cache',
      },
      body: JSON.stringify(healthData),
    };

  } catch (error) {
    console.error('Health check error:', error);

    return {
      statusCode: 500,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
      },
      body: JSON.stringify({
        status: 'unhealthy',
        error: error instanceof Error ? error.message : 'Unknown error',
        timestamp: new Date().toISOString(),
        environment: 'netlify-serverless',
      }),
    };
  }
};
