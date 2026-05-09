# Smart ERP Next

> Hệ thống ERP thông minh, native đa nền tảng, vượt trội hơn ERPNext/Odoo/VietERP/KiotViet/Nhanh.vn/Misa

## 🎯 Tầm nhìn

Smart ERP Next không chỉ là một ERP - đó là nền tảng quản trị doanh nghi nghiệp toàn diện với:

- **Native trên mọi nền tảng**: Web, Mobile (iOS/Android), Desktop (Windows/Mac/Linux)
- **Kiến trúc packages/apps/shared**: Tái sử dụng code tối đa, dễ bảo trì và mở rộng
- **Bản địa hóa sâu**: Hỗ trợ tiếng Việt, tiếng Anh ngay từ đầu
- **Hiệu năng vượt trội**: Response time < 100ms
- **Tuân thủ pháp lý Việt Nam**: Hóa đơn điện tử, chữ ký số, báo cáo tài chính

## 🏗️ Kiến trúc

```
smart-erp-next/
├── apps/
│   ├── web/          # Next.js 15 (Web app)
│   ├── mobile/       # React Native Expo (iOS/Android)
│   └── desktop/      # Tauri v2 (Windows/Mac/Linux)
├── packages/
│   ├── core/         # Business logic, entities, Zod schemas
│   ├── database/     # Drizzle ORM, migrations
│   ├── api/          # tRPC routers
│   ├── ui/           # Design system
│   ├── i18n/         # i18next with Vietnamese default
│   └── utils/        # Helpers, formatting
└── shared/           # Code shared across native platforms
```

## 🚀 Bắt đầu nhanh

```bash
cd E:\GitHub\smart-erp-next
npm install
npm run dev
```

## 📦 Packages

| Package | Mô tả | Tech stack |
|---------|-------|-------------|
| `@smarterp/core` | Business logic, entities | TypeScript, Zod |
| `@smarterp/i18n` | Internationalization | i18next |

## 📄 License

Proprietary — © Smart ERP Team

---

**Built with ❤️ using Next.js, React Native, Tauri, and TurboRepo**
