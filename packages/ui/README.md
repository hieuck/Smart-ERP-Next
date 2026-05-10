# @smart-erp/ui - Shared UI Components

## TŠĽēng quan

Package UI d√Ļng chung cho tŠļ•t cŠļ£ c√°c nŠĽĀn tŠļ£ng (Web, Desktop, Mobile), ńĎ∆įŠĽ£c x√Ęy dŠĽĪng vŠĽõi React, TypeScript v√† Tailwind CSS (hoŠļ∑c CSS variables).

## T√≠nh nńÉng

- **Button**: HŠĽó trŠĽ£ nhiŠĽĀu variants (default, destructive, outline, secondary, ghost, link) v√† sizes
- **ThemeProvider**: ChŠĽß ńĎŠĽĀ s√°ng/tŠĽĎi/hŠĽá thŠĽĎng
- **cn utility**: HŠĽ£p nhŠļ•t class names vŠĽõi Tailwind merge

## SŠĽ≠ dŠĽ•ng

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

TŠļ•t cŠļ£ file ńĎŠĽĀu l∆įu vŠĽõi **UTF-8 kh√īng BOM** ńĎŠĽÉ hŠĽó trŠĽ£ tiŠļŅng ViŠĽát trong comments v√† chuŠĽói.

## T√≠ch hŠĽ£p v√†o c√°c app

Th√™m v√†o `package.json` cŠĽßa tŠĽęng app:

```json
"dependencies": {
  "@smart-erp/ui": "workspace:*"
}
```