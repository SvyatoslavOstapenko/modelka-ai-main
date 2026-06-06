@echo off
REM =====================================
REM Установка Git Hooks для проверки сборки (Windows)
REM =====================================

setlocal

REM Определяем расположение .git директории
if exist ".git" (
  set GIT_DIR=.git
) else if exist "..\.git" (
  set GIT_DIR=..\.git
) else (
  echo ❌ Error: Not in a git repository
  echo    Make sure you're running this from the project directory
  exit /b 1
)

set HOOKS_DIR=%GIT_DIR%\hooks
set PRE_COMMIT_HOOK=%HOOKS_DIR%\pre-commit
set PRE_PUSH_HOOK=%HOOKS_DIR%\pre-push

echo.
echo 🔧 Installing Git hooks...
echo.

REM Создаем директорию hooks если её нет
if not exist "%HOOKS_DIR%" mkdir "%HOOKS_DIR%"

REM Создаем pre-commit hook для автогенерации миграций
(
  echo #!/bin/bash
  echo.
  echo # Pre-commit hook: Автоматическая генерация миграций
  echo # Запускается перед каждым git commit
  echo.
  echo # Переходим в директорию web ^(если мы в корне репозитория^)
  echo if [ -d "web" ]; then
  echo   cd web
  echo fi
  echo.
  echo # Проверяем, изменился ли schema.ts
  echo if git diff --cached --name-only ^| grep -q "src/db/schema.ts"; then
  echo   echo ""
  echo   echo "🔍 Detected changes in database schema..."
  echo   echo "📝 Generating migration files..."
  echo   echo ""
  echo.
  echo   # Генерируем миграции
  echo   npm run db:generate ^|^| {
  echo     echo ""
  echo     echo "❌ Migration generation failed!"
  echo     echo "   Fix the schema errors before committing."
  echo     echo "   Or use 'git commit --no-verify' to skip ^(NOT recommended^)."
  echo     exit 1
  echo   }
  echo.
  echo   # Добавляем сгенерированные миграции в коммит
  echo   git add drizzle/
  echo.
  echo   echo ""
  echo   echo "✅ Migrations generated and added to commit"
  echo   echo ""
  echo fi
  echo.
  echo exit 0
) > "%PRE_COMMIT_HOOK%"

REM Создаем pre-push hook
(
  echo #!/bin/bash
  echo.
  echo # Pre-push hook: Проверка продакшен сборки
  echo # Этот hook запускается перед каждым git push
  echo.
  echo echo ""
  echo echo "🔍 Running pre-push checks..."
  echo echo ""
  echo.
  echo # Переходим в директорию web ^(если мы в корне репозитория^)
  echo if [ -d "web" ]; then
  echo   cd web
  echo fi
  echo.
  echo echo "1️⃣  Running linter..."
  echo npm run lint ^|^| {
  echo   echo ""
  echo   echo "❌ Linting failed! Fix the issues before pushing."
  echo   echo "   Or use 'git push --no-verify' to skip this check."
  echo   exit 1
  echo }
  echo.
  echo echo "✅ Linting passed"
  echo echo ""
  echo.
  echo echo "2️⃣  Building Docker image..."
  echo echo "   ^(This ensures production build will work^)"
  echo docker build . -t modelka-pre-push-check ^|^| {
  echo   echo ""
  echo   echo "❌ Docker build failed!"
  echo   echo "   Your production deployment will fail with these changes."
  echo   echo "   Fix the build errors before pushing."
  echo   echo ""
  echo   echo "   Or use 'git push --no-verify' to skip this check ^(NOT recommended^)."
  echo   docker rmi modelka-pre-push-check 2^>/dev/null ^|^| true
  echo   exit 1
  echo }
  echo.
  echo echo "✅ Docker build successful"
  echo echo ""
  echo.
  echo # Cleanup
  echo docker rmi modelka-pre-push-check 2^>/dev/null ^|^| true
  echo.
  echo echo "✅ All pre-push checks passed!"
  echo echo "   Proceeding with push..."
  echo echo ""
  echo.
  echo exit 0
) > "%PRE_PUSH_HOOK%"

echo ✅ Git hooks installed successfully!
echo.
echo 📋 What was installed:
echo    • pre-commit hook: Auto-generates migrations when schema.ts changes
echo    • pre-push hook: Runs linter and Docker build before each push
echo.
echo 💡 Tips:
echo    • To skip hooks: git commit --no-verify / git push --no-verify
echo    • To uninstall: del %PRE_COMMIT_HOOK% %PRE_PUSH_HOOK%
echo.
echo 🎉 You're all set! Migrations will auto-generate on commit!
echo.

endlocal
