# Smart ERP Next – Mobile (React Native + Expo)

## Tổng quan

Ứng dụng mobile native cho Smart ERP Next, được xây dựng với **React Native** và **Expo**, tái sử dụng các package từ monorepo (`@smart-erp/sync`, `@smart-erp/i18n`, `@smart-erp/types`).

## Tính năng chính

- ⚡ **Offline‑first** – làm việc không cần mạng, dữ liệu lưu trữ trên thiết bị (SQLite)
- 🔄 **Sync CRDT** – giải quyết xung đột tự động khi có mạng nhờ vector clock
- 🌍 **Bản địa hóa** – tiếng Việt mặc định, dễ dàng thêm ngôn ngữ khác qua `packages/i18n`
- 📱 **Native UX** – trải nghiệm React Native thuần, không phải web view

## Cài đặt & chạy

```bash
# Cài dependencies (từ thư mục gốc)
pnpm install

# Chạy development server
cd apps/mobile
pnpm start

# Chạy trên Android
pnpm android

# Chạy trên iOS (chỉ macOS)
pnpm ios
```

## Tích hợp monorepo

- **Sync**: `@smart-erp/sync` cung cấp `SyncService` và offline database (sẽ dùng Expo SQLite thay IndexedDB trong tương lai)
- **I18n**: `@smart-erp/i18n` đã cấu hình sẵn locale tiếng Việt
- **Types**: dùng chung kiểu dữ liệu

## Encoding

Tất cả file nguồn và file JSON đều lưu với **UTF‑8 không BOM** để hiển thị đúng tiếng Việt.

## Build production

Tuân theo hướng dẫn của Expo:
```bash
eas build --platform android
eas build --platform ios
```