@echo off
setlocal enabledelayedexpansion

title Smart ERP Next Dev

if not exist .env (
  echo Creating .env from .env.example...
  copy .env.example .env >nul
) else (
  findstr /b "DATABASE_URL" .env >nul
  if errorlevel 1 (
    echo Adding DATABASE_URL to .env...
    echo DATABASE_URL=postgresql://smart_erp:smart_erp@localhost:5432/smart_erp > .env.tmp
    type .env >> .env.tmp
    move /y .env.tmp .env >nul
  )
)

echo Kiem tra PostgreSQL...
docker compose ps postgres --format "{{.Status}}" 2>nul | findstr /i "healthy" >nul
if errorlevel 1 (
  echo Dang khoi dong PostgreSQL...
  docker compose up -d postgres
  :waitpg
  timeout /t 2 /nobreak >nul
  docker compose exec -T postgres pg_isready -U smart_erp 2>nul | findstr "accept" >nul
  if errorlevel 1 goto waitpg
  echo PostgreSQL san sang
)

echo Running database migrations...
set DATABASE_URL=postgresql://smart_erp:smart_erp@localhost:5432/smart_erp
call pnpm --filter @smart-erp/database migrate

echo.
echo ============================================
echo  Smart ERP Next - Dev Server
echo ============================================
echo  API: http://localhost:3456
echo  Web: http://localhost:3457
echo ============================================
echo.

start "SmartERP-API" cmd /c "set PORT=3456 && call pnpm --filter @smart-erp/api dev"
start "SmartERP-Web" cmd /c "set PORT=3457 && call pnpm --filter @smart-erp/web dev"

echo Nhan phim bat ky de dung tat ca servers...
pause >nul
taskkill /f /fi "WINDOWTITLE eq SmartERP-API" >nul 2>nul
taskkill /f /fi "WINDOWTITLE eq SmartERP-Web" >nul 2>nul
echo Da dung.
