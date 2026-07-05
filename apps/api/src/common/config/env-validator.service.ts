import { Injectable } from '@nestjs/common';

export const DEFAULT_PATTERNS = [
  'dev-secret', 'change-in-production', 'change_me', 'your-secret',
];

export function validateJwtSecret(secret: string | undefined): string[] {
  const issues: string[] = [];
  if (!secret || secret.length < 16) {
    issues.push('JWT_SECRET is missing or too short (must be at least 16 characters)');
  } else if (DEFAULT_PATTERNS.some((p) => secret.toLowerCase().includes(p))) {
    issues.push('JWT_SECRET appears to use a default/dev value — set a strong production secret');
  }
  return issues;
}

@Injectable()
export class EnvValidatorService {
  validate(): string[] {
    const issues: string[] = [];
    const required = {
      JWT_SECRET: 'JWT signing key',
      DATABASE_URL: 'PostgreSQL connection string',
      API_KEY_HMAC_SECRET: 'HMAC signing key for API key hashes',
    };

    for (const [key, description] of Object.entries(required)) {
      const value = process.env[key];
      if (!value) {
        issues.push(`Missing required env var: ${key} (${description})`);
      } else if (DEFAULT_PATTERNS.some((p) => value.toLowerCase().includes(p))) {
        issues.push(`${key} appears to use a default/dev value — set a strong production secret`);
      }
    }

    return issues;
  }
}
