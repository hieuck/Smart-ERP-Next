# Getting Started Guide — Smart ERP Next v0.1.0

**Beta testing has concluded. This is now the first stable release.**

For production deployment instructions, see [production-setup-guide.md](production-setup-guide.md).

---

## System Requirements

| Item | Minimum |
|------|---------|
| OS | Windows 10/11, macOS 12+, Ubuntu 20.04+ |
| RAM | 4 GB (recommended 8 GB) |
| Disk | 5 GB free space |
| Software | [Docker Desktop](https://www.docker.com/products/docker-desktop/) |

> **No need** to install Node.js, Python, PostgreSQL — Docker handles everything.

---

## Installation (5 minutes)

### Step 1 — Download source code

```bash
git clone https://github.com/smart-erp/smart-erp-next.git
cd smart-erp-next
```

Or download ZIP file from Releases page and extract.

### Step 2 — Configure environment

```bash
# Copy configuration template
cp .env.example .env
```

Open `.env` file and modify 3 required lines:

```env
DB_PASSWORD=your_strong_password_here
JWT_SECRET=random_string_at_least_32_characters
NEXT_PUBLIC_API_URL=http://localhost:3000
```

> If running on remote server (VPS), replace `localhost` with server IP:
> `NEXT_PUBLIC_API_URL=http://123.456.789.0:3000`

### Step 3 — Start the system

**Windows:**
```powershell
.\deploy.ps1
```

**macOS / Linux:**
```bash
docker-compose up -d --build
```

First build takes about 3–5 minutes (downloading dependencies). Subsequent builds take ~30 seconds.

### Step 4 — Access services

| Service | URL |
|---------|-----|
| 🌐 Web Dashboard | http://localhost:3001 |
| 📡 API Swagger | http://localhost:3000/api |
| 🤖 AI Forecast | http://localhost:8000/docs |

---

## Default Accounts

After the system starts, register a new account at `/register` or use seed data:

```bash
# Run seed data (creates sample tenant + admin)
docker-compose exec api node apps/api/dist/common/seeds/main.seed.js
```

Account after seeding:
- **Email**: `admin@demo.com`
- **Password**: `Admin@123456`

---

## Features to Test in v0.4.0

Priority testing for the latest features:

### 🎫 Helpdesk & Ticketing
- [ ] Create new ticket with priority (low/medium/high/urgent)
- [ ] Change ticket status (open → in_progress → resolved)
- [ ] Filter tickets by category

### 🤖 AI Demand Forecasting
- [ ] Go to **Analytics → Forecast** — view 30-day demand forecast
- [ ] Check automatic restocking suggestions
- [ ] View confidence level and MAPE

### 👥 HR / Payroll
- [ ] Add new employee at `/hr/employees`
- [ ] Create monthly payroll at `/hr/payroll`
- [ ] Check net salary calculation (base + allowances - deductions)

### 🎁 Loyalty Program
- [ ] Create loyalty card for customer
- [ ] Add/subtract reward points
- [ ] View rewards catalog

### 🏭 Fixed Assets
- [ ] Add new fixed asset
- [ ] View automatic depreciation (straight-line)
- [ ] Perform asset disposal

### 📋 Project Management
- [ ] Create project with budget and manager
- [ ] Add tasks and milestones
- [ ] Log time entry for task

### 🛒 Omnichannel
- [ ] Connect store (Shopee/Lazada/TikTok)
- [ ] Push inventory to marketplace
- [ ] View sync logs

### 📦 Advanced Inventory
- [ ] Create lot tracking for products
- [ ] Create warehouse transfer (draft → approved → shipped → received)
- [ ] Check reorder suggestions

---

## Bug Reporting

When encountering issues, please provide:

1. **Description**: What you were doing when the error occurred
2. **Screenshot** or error message
3. **Console logs** (F12 → Console in browser)
4. **API logs**: `docker-compose logs api --tail=50`

Submit reports via:
- GitHub Issues: https://github.com/smart-erp/smart-erp-next/issues
- Email: beta@smart-erp.vn

---

## Useful Commands

```bash
# View realtime logs
docker-compose logs -f

# View logs for specific service
docker-compose logs -f api
docker-compose logs -f web

# Restart a service
docker-compose restart api

# Stop all services
docker-compose down

# Stop and delete database (complete reset)
docker-compose down -v

# Update to new version
git pull
docker-compose up -d --build
```

---

## Frequently Asked Questions

**Q: Web shows "Cannot connect to API"?**  
A: Check `NEXT_PUBLIC_API_URL` in `.env` — must be IP/domain accessible from your browser, not `http://api:3000`.

**Q: Build error "out of memory"?**  
A: Increase RAM for Docker Desktop to at least 4 GB (Settings → Resources → Memory).

**Q: Port 3000/3001 already in use?**  
A: Change ports in `.env`: `API_PORT=3100`, `WEB_PORT=3101`.

**Q: Forgot admin password?**  
A: `docker-compose exec postgres psql -U smart_erp -c "UPDATE users SET password_hash='...' WHERE email='admin@demo.com'"`

---

*Smart ERP Next v0.4.0 — Beta Testing Guide*  
*Updated: 2026-05-17*
