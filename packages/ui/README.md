# @smart-erp/ui - Shared UI Components

## Tổng quan

Package UI dùng chung cho tất cả các nền tảng (Web, Desktop, Mobile), được xây dựng với React, TypeScript và Tailwind CSS (hoặc CSS variables).

## Tính năng

- **Button**: Hỗ trợ nhiều variants (default, destructive, outline, secondary, ghost, link) và sizes
- **ThemeProvider**: Chủ đề sáng/tối/hệ thống
- **cn utility**: Hợp nhất class names với Tailwind merge

## Sử dụng

```tsx
import { Button, ThemeProvider, useTheme } from '@smart-erp/ui';

function App() {
  return (
    <ThemeProvider>
      <MyComponent />
    </ThemeProvider>
  );
}

function MyComponent() {
  const { theme, setTheme } = useTheme();
  return (
    <Button variant="default" size="lg">
      Click me
    </Button>
  );
}
```

## Encoding

Tất cả file đều lưu với **UTF-8 không BOM** để hỗ trợ tiếng Việt trong comments và chuỗi.

## Tích hợp vào các app

Thêm vào `package.json` của từng app:

```json
"dependencies": {
  "@smart-erp/ui": "workspace:*"
}
```
