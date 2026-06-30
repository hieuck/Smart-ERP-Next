# Secrets Management

## Current approach

Secrets are managed through environment variables in `.env` files. For production, secrets must be set manually on the server or passed through Docker Compose.

## Production recommendations

### Option 1: Docker secrets (recommended for single-server)

```yaml
# docker-compose.prod.yml
services:
  api:
    secrets:
      - db_password
      - jwt_secret

secrets:
  db_password:
    file: ./secrets/db_password.txt
  jwt_secret:
    file: ./secrets/jwt_secret.txt
```

### Option 2: Environment variables (simpler)

Set via systemd EnvironmentFile or Docker Compose `environment:` block.
Never commit `.env` files to git. Use `.env.example` as template.

### Option 3: Cloud secret manager

For multi-server deployments, use:
- **Azure**: Key Vault with Managed Identity
- **AWS**: Secrets Manager / Parameter Store
- **HashiCorp Vault**: Self-hosted

## Required secrets

| Secret | Where used | Rotation |
|--------|-----------|----------|
| `JWT_SECRET` | API auth | Every 90 days |
| `DB_PASSWORD` | Database | Every 180 days |
| `SMTP_PASSWORD` | Email service | Every 180 days |
| API keys for integrations | Ecommerce, Xero | On compromise |

## Rotation playbook

1. Generate new secret
2. Update environment/config
3. Restart service
4. Verify functionality
5. Revoke old secret after 24h
