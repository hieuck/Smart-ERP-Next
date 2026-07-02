# Smart ERP Next v0.4.3

## Quick Start
```bash
docker run -p 3456:3456 -p 3457:3457 \
  -e DB_PASSWORD=yourpass -e JWT_SECRET=yoursecret \
  ghcr.io/hieuck/smart-erp-next:v0.4.3

# Web: http://localhost:3457
# API: http://localhost:3456 (header: X-API-Version: 1)
# Login: admin@smarterp.vn / admin123
```

## What's new
- **X-API-Version header** — root cause của mọi lỗi API từ frontend, đã fix
- **Container stability** — watchdog respawn + memory limit, không còn crash
- **CACHEBUST build** — Docker build luôn dùng code mới nhất
- **Reports module** — tất cả /reports/* endpoints hoạt động
- **2,059 tests** — 327 suites, tất cả xanh
- **0 TypeScript errors, 0 ESLint warnings**
- **181 GAPS closed**, 115+ architectural docs
- **Domain refactoring** — 48 flat modules → 12 domain modules
- **i18n 4 locales**: vi, en, pt, ru

## Tech Stack
- **Backend**: NestJS + Drizzle ORM + PostgreSQL
- **Frontend**: Next.js 15 + Tailwind CSS + lucide-react
- **Auth**: JWT + bcrypt
- **i18n**: react-i18next (4 locales)
- **Deploy**: Docker, GitHub Container Registry
