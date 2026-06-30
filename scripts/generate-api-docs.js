/**
 * API Documentation Generator
 *
 * Generates OpenAPI 3.0 specification by starting the NestJS app
 * and capturing the Swagger document.
 *
 * Usage: node scripts/generate-api-docs.js [output-path]
 *
 * Prerequisites: DATABASE_URL must point to a running database
 */

const { execSync } = require('child_process');
const { writeFileSync } = require('fs');
const { join } = require('path');

const outputPath = process.argv[2] || join(__dirname, '..', 'docs', 'api-spec.json');

console.log('Generating OpenAPI spec...');

try {
  // Start the app in a child process with Swagger endpoint enabled
  const result = execSync(
    'pnpm --filter @smart-erp/api exec node -e "
      const { NestFactory } = require('@nestjs/core');
      const { SwaggerModule, DocumentBuilder } = require('@nestjs/swagger');
      const { AppModule } = require('./dist/apps/api/src/app.module');
      async function generate() {
        const app = await NestFactory.create(AppModule, { logger: false });
        const config = new DocumentBuilder()
          .setTitle('Smart ERP Next API')
          .setDescription('ERP system API for Vietnamese SMEs')
          .setVersion(process.env.npm_package_version || '1.0.0')
          .addBearerAuth()
          .addApiKey({ type: 'apiKey', name: 'x-api-key', in: 'header' }, 'api-key')
          .build();
        const document = SwaggerModule.createDocument(app, config);
        process.stdout.write(JSON.stringify(document, null, 2));
        await app.close();
      }
      generate().catch(console.error);
    "',
    { cwd: join(__dirname, '..'), encoding: 'utf8', timeout: 30000 }
  );

  writeFileSync(outputPath, result.stdout);
  console.log(`OpenAPI spec saved to: ${outputPath}`);
} catch (err) {
  console.error('Failed to generate API docs. Is the app built?');
  console.error('Run: pnpm build');
  console.error(err.stderr?.slice(0, 500) || err.message);
  process.exit(1);
}
