import { CorsOptions } from '@nestjs/common/interfaces/external/cors-options.interface';

const DEV_ORIGINS = [
  'http://localhost:3457',
  'http://localhost:3467',
  'http://localhost:3456',
  'http://localhost:3001',
  'http://localhost:3000',
];

function isValidProductionOrigin(origin: string): boolean {
  try {
    const url = new URL(origin);
    return url.protocol === 'https:';
  } catch {
    return false;
  }
}

export function buildCorsOptions(): CorsOptions {
  const isProduction = process.env.NODE_ENV === 'production';
  const configuredOrigins = process.env.CORS_ORIGINS
    ?.split(',')
    .map((o) => o.trim())
    .filter(Boolean);

  let origin: CorsOptions['origin'];

  if (configuredOrigins?.length) {
    if (configuredOrigins.includes('*')) {
      if (isProduction) {
        throw new Error('CORS_ORIGINS cannot include wildcard (*) in production');
      }
      origin = '*';
    } else {
      if (isProduction) {
        const invalid = configuredOrigins.filter((o) => !isValidProductionOrigin(o));
        if (invalid.length) {
          throw new Error(
            `Invalid production CORS origins (must be HTTPS URLs): ${invalid.join(', ')}`,
          );
        }
      }
      origin = configuredOrigins;
    }
  } else if (isProduction) {
    throw new Error('CORS_ORIGINS must be configured in production');
  } else {
    origin = DEV_ORIGINS;
  }

  return {
    origin,
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-API-Version', 'Idempotency-Key', 'X-API-Key'],
    maxAge: 86400,
  };
}
