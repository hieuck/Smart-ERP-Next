# Production Setup Guide — Smart ERP Next

This guide walks you through setting up Smart ERP Next in a production environment.

## Prerequisites

### Hardware Requirements
- **CPU**: 2+ cores (4+ recommended)
- **RAM**: 4GB minimum (8GB recommended)
- **Storage**: 20GB+ free space
- **Network**: Stable internet connection

### Software Requirements
- **Operating System**: Ubuntu 20.04+, CentOS 8+, or Windows Server 2019+
- **Docker**: 20.10+
- **Docker Compose**: 1.29+
- **Git**: For code updates

### Domain & SSL
- Domain name (e.g., `erp.yourcompany.com`)
- SSL certificate (Let's Encrypt recommended)

## Quick Start (10 Minutes)

### 1. Server Setup
```bash
# Update system
sudo apt update && sudo apt upgrade -y

# Install Docker
curl -fsSL https://get.docker.com -o get-docker.sh
sudo sh get-docker.sh

# Install Docker Compose
sudo curl -L "https://github.com/docker/compose/releases/latest/download/docker-compose-$(uname -s)-$(uname -m)" -o /usr/local/bin/docker-compose
sudo chmod +x /usr/local/bin/docker-compose

# Add user to docker group
sudo usermod -aG docker $USER
```

### 2. Deploy Smart ERP Next
```bash
# Clone repository
git clone https://github.com/smart-erp/smart-erp-next.git
cd smart-erp-next

# Copy production configuration
cp .env.production.example .env.production

# Edit configuration
nano .env.production
```

### 3. Configure Environment
Edit `.env.production` with your values:

```env
# Required: Database
DB_PASSWORD=your_strong_password_here

# Required: JWT Secret (min 32 chars)
JWT_SECRET=generate_with: openssl rand -base64 32

# Required: Public API URL
NEXT_PUBLIC_API_URL=https://api.yourdomain.com

# Required: Public web URL, used by metadata, robots.txt and sitemap.xml
NEXT_PUBLIC_SITE_URL=https://app.yourdomain.com

# Security: CORS Origins
CORS_ORIGINS=https://app.yourdomain.com

# Ports (adjust if needed)
API_PORT=3000
WEB_PORT=3001
AI_FORECAST_PORT=8000
```

## Public Launch Checklist

Before posting public marketing content or sending users to the product, verify:

- The public URL opens `/` without login and shows the Smart ERP Next landing page.
- `/register` creates a new workspace and redirects the user to `/dashboard`.
- `/robots.txt` allows `/`, `/register`, `/login`, `/privacy`, and `/terms`.
- `/sitemap.xml` uses the real public domain, not `localhost`.
- `NEXT_PUBLIC_API_URL` points to the public API origin.
- `NEXT_PUBLIC_SITE_URL` points to the public web origin.
- `CORS_ORIGINS` contains the exact public web origin.
- HTTPS is enabled for both web and API.
- Database backup, health monitoring, and a support contact/channel are ready.

### 4. Start Production Services
```bash
# Make deployment script executable
chmod +x scripts/deploy-production.sh

# Deploy to production
./scripts/deploy-production.sh production
```

## Advanced Configuration

### SSL with Nginx
1. Install Nginx and Certbot:
```bash
sudo apt install nginx certbot python3-certbot-nginx
```

2. Create Nginx configuration at `nginx/nginx.conf`:
```nginx
server {
    listen 80;
    server_name erp.yourcompany.com;
    return 301 https://$server_name$request_uri;
}

server {
    listen 443 ssl http2;
    server_name erp.yourcompany.com;

    ssl_certificate /etc/letsencrypt/live/erp.yourcompany.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/erp.yourcompany.com/privkey.pem;

    location / {
        proxy_pass http://localhost:3001;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
    }

    location /api/ {
        proxy_pass http://localhost:3000;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
    }
}
```

3. Obtain SSL certificate:
```bash
sudo certbot --nginx -d erp.yourcompany.com
```

### Database Backups
Automatic daily backups are configured. To restore:
```bash
# List available backups
ls -la backups/

# Restore from backup
docker-compose -f docker-compose.production.yml exec -T postgres psql -U smart_erp_prod -d smart_erp < backups/20250101_000000/database_backup.sql
```

### Monitoring Setup
```bash
# Make monitoring script executable
chmod +x scripts/monitor-health.sh

# Test health check
./scripts/monitor-health.sh

# Set up cron job for regular monitoring
crontab -e
# Add: */5 * * * * /path/to/smart-erp-next/scripts/monitor-health.sh --alert
```

## Security Best Practices

### 1. Firewall Configuration
```bash
# Configure UFW firewall
sudo ufw allow 22/tcp    # SSH
sudo ufw allow 80/tcp    # HTTP
sudo ufw allow 443/tcp   # HTTPS
sudo ufw enable
```

### 2. Database Security
- Change default PostgreSQL password
- Enable SSL for database connections
- Regular security updates

### 3. Application Security
- Regular dependency updates: `pnpm update`
- Security scanning: `npm audit`
- Log monitoring for suspicious activities

## Scaling

### Vertical Scaling (More Resources)
Update `docker-compose.production.yml`:
```yaml
services:
  api:
    deploy:
      resources:
        limits:
          memory: 2G
          cpus: '2'
```

### Horizontal Scaling (More Instances)
```bash
# Scale API instances
docker-compose -f docker-compose.production.yml up -d --scale api=3

# Add load balancer
# (Consider using Traefik or Nginx as load balancer)
```

## Maintenance

### Regular Tasks
1. **Daily**: Check logs and monitoring alerts
2. **Weekly**: Review backup success and disk space
3. **Monthly**: Update dependencies and security patches

### Update Procedure
```bash
# Pull latest code
git pull origin main

# Backup current deployment
./scripts/deploy-production.sh backup

# Deploy updates
./scripts/deploy-production.sh production
```

### Troubleshooting
```bash
# View logs
docker-compose -f docker-compose.production.yml logs -f

# Check service status
docker-compose -f docker-compose.production.yml ps

# Restart specific service
docker-compose -f docker-compose.production.yml restart api

# Access database
docker-compose -f docker-compose.production.yml exec postgres psql -U smart_erp_prod -d smart_erp
```

## Support

### Getting Help
- **Documentation**: Check `docs/` directory
- **Issues**: GitHub Issues: https://github.com/smart-erp/smart-erp-next/issues
- **Community**: Discord/Slack channel (if available)

### Emergency Contacts
- System Administrator: admin@yourcompany.com
- Development Team: dev@yourcompany.com

## Performance Optimization

### Database Optimization
```sql
-- Regular maintenance
VACUUM ANALYZE;

-- Index optimization
CREATE INDEX CONCURRENTLY idx_orders_tenant_id ON orders(tenant_id);
```

### Caching Strategy
- Redis is configured for session storage
- Consider implementing query caching for frequent queries
- Use CDN for static assets

---

**Last Updated**: 2026-06-15  
**Version**: Smart ERP Next v0.1.0
