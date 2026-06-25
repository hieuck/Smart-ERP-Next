# Smart ERP Next — Fix pnpm workspace symlinks on Windows
# pnpm on Windows often fails to create node_modules symlinks in workspace packages.
# This script manually creates the missing links.
# Usage: pwsh -ExecutionPolicy Bypass ./scripts/fix-workspace-links.ps1

$ErrorActionPreference = "Continue"

$ROOT = Split-Path -Parent $PSScriptRoot
$STORE = "$ROOT\node_modules\.pnpm"

function Ensure-Symlink {
    param($Target, $Link)
    $linkDir = Split-Path $Link -Parent
    if (-not (Test-Path $linkDir)) { New-Item -ItemType Directory -Force $linkDir | Out-Null }
    if (Test-Path $Link) { return }  # already exists
    try {
        New-Item -ItemType Junction -Path $Link -Target $Target -Force | Out-Null
        Write-Host "  ✓ $Link" -ForegroundColor Green
    } catch {
        try {
            New-Item -ItemType SymbolicLink -Path $Link -Target $Target -Force | Out-Null
            Write-Host "  ✓ $Link (symlink)" -ForegroundColor Green
        } catch {
            Write-Host "  ✗ $Link — $($_.Exception.Message)" -ForegroundColor Red
        }
    }
}

function Find-StorePath {
    param($Pattern)
    $items = Get-ChildItem "$STORE\$Pattern*" -Name -ErrorAction SilentlyContinue
    if ($items) { return "$STORE\$($items[0])\node_modules" }
    return $null
}

Write-Host "=== Fixing pnpm workspace symlinks ===" -ForegroundColor Cyan

# 1. Workspace package symlinks
$workspaceLinks = @(
    @{ Pkg = "packages/hooks"; Dep = "@smart-erp/utils"; Target = "$ROOT\packages\utils" },
    @{ Pkg = "packages/hooks"; Dep = "@smart-erp/tsconfig"; Target = "$ROOT\packages\config-typescript" },
    @{ Pkg = "packages/utils"; Dep = "@smart-erp/tsconfig"; Target = "$ROOT\packages\config-typescript" },
    @{ Pkg = "packages/validation"; Dep = "@smart-erp/tsconfig"; Target = "$ROOT\packages\config-typescript" },
    @{ Pkg = "packages/types"; Dep = "@smart-erp/tsconfig"; Target = "$ROOT\packages\config-typescript" }
)

foreach ($link in $workspaceLinks) {
    $linkPath = "$ROOT\$($link.Pkg)\node_modules\$($link.Dep)"
    if (-not (Test-Path $linkPath)) {
        Ensure-Symlink -Target $link.Target -Link $linkPath
    }
}

# 2. @types/* symlinks from pnpm store
$typeLinks = @(
    @{ Pkg = "packages/hooks"; Dep = "@types/node"; Ver = "@types+node@" },
    @{ Pkg = "packages/hooks"; Dep = "@types/react"; Ver = "@types+react@" }
)

foreach ($link in $typeLinks) {
    $linkPath = "$ROOT\$($link.Pkg)\node_modules\$($link.Dep)"
    if (-not (Test-Path $linkPath)) {
        $storePath = Find-StorePath $link.Ver
        if ($storePath) {
            Ensure-Symlink -Target "$storePath\$($link.Dep)" -Link $linkPath
        }
    }
}

# 3. Runtime package symlinks from pnpm store (for inlined deps)
$runtimeLinks = @(
    @{ Pkg = "apps/web"; Dep = "zustand"; Ver = "zustand@" }
)

foreach ($link in $runtimeLinks) {
    $linkPath = "$ROOT\$($link.Pkg)\node_modules\$($link.Dep)"
    if (-not (Test-Path $linkPath)) {
        $storePath = Find-StorePath $link.Ver
        if ($storePath) {
            Ensure-Symlink -Target "$storePath\$($link.Dep)" -Link $linkPath
        }
    }
}

Write-Host "`n=== Done ===" -ForegroundColor Cyan
Write-Host "Run 'pnpm install --no-frozen-lockfile' after this if packages changed." -ForegroundColor Yellow
