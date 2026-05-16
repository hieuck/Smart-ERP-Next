---
name: shared-lib-design
description: Thiết kế thư viện chung @smart-erp/shared, chuẩn hoá i18n, kiểm tra encoding/format, commit thông minh
metadata:
  type: reference
---

# Thiết kế thư viện chung `@smart-erp/shared`

## Mục tiêu
- Tập trung lại **UI components**, **utils**, **types**, **validation**, **i18n** thành một package chung để **native** cho `web`, `mobile`, `desktop`.
- Đảm bảo **bản địa hoá toàn bộ** (không còn hard‑code Vietnamese), **UTF‑8 + LF**, không lỗi định dạng.
- Cài đặt **pipeline i18n tự động** và **pre‑commit hook** để ngăn commit vi phạm.
- Thêm **kiểm tra encoding/format** vào CI và log vào `ActivityService`.

## Cấu trúc thư mục
```
packages/shared/
├─ ui/            # component chung (React, React‑Native, Tauri)
│   ├─ Button.tsx
│   └─ ...
├─ utils/         # hàm tiện ích không phụ thuộc môi trường
│   ├─ format.ts
│   └─ ...
├─ types/         # định nghĩa TypeScript dùng chung
│   ├─ api.d.ts
│   └─ ...
├─ validation/    # Zod (frontend) & class‑validator (backend) schemas
│   └─ product.ts
└─ i18n/          # wrapper t() và helper tạo key
    └─ index.ts
```

## Quy trình i18n tự động
1. **Script `scripts/i18n-scan.ts`**
   - Duyệt toàn bộ source (`src/**/*.tsx|ts|js`).
   - Phát hiện literal string có ký tự Unicode (> ASCII) không nằm trong `t()`.
   - Tạo key tự động theo quy tắc `module.key` và ghi vào `en/common.json` & `vi/common.json`.
   - Thay thế literal bằng `t('module.key')`.
2. **Pre‑commit hook** (`husky` + `lint‑staged`)
   - Chạy `npm run i18n:scan -- --check`.
   - Nếu còn literal, block commit và hiển thị danh sách file.
3. **CI**: chạy `npm run i18n:scan -- --check` để bảo vệ main branch.

## Kiểm tra encoding & format
- **ESLint + Prettier** chung cho toàn bộ workspace (root `.eslintrc.js`, `.prettierrc`).
- **Script `scripts/check-utf8.ts`**: đọc mỗi file, báo lỗi nếu có BOM hoặc không phải UTF‑8.
- **CI**: chạy `npm run lint`, `npm run format:check`, `npm run check-utf8`.
- **Activity log**: khi phát hiện lỗi, ghi `ActivityService.log({action:'failed',entityType:'code_quality',details:{file}})`.

## Tài liệu
- `docs/superpowers/specs/2026-05-16-shared-lib-design.md` (đây là file hiện tại).
- `packages/shared/README.md` mô tả cách publish, import.
- `docs/i18n-guide.md` hướng dẫn viết key, chạy script.

## Quy trình commit thông minh
1. `git add .` (chỉ các file thay đổi).
2. Commit mẫu:
```
feat(shared): tái cấu trúc shared lib, chuẩn hoá i18n, kiểm tra UTF‑8

- Thêm package @smart-erp/shared
- Tự động thay thế literal Vietnamese bằng i18n keys
- Thêm pre‑commit hook và CI checks

Co-Authored-By: Claude Opus 4.7 <noreply@anthropic.com>
```
3. Pre‑commit hook sẽ ngăn commit nếu script i18n‑scan phát hiện lỗi.

---
*Spec ready for review and commit.*