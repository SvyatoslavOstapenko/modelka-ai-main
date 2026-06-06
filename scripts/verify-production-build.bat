@echo off
REM ===================================
REM Локальная проверка продакшен сборки (Windows)
REM ===================================

setlocal enabledelayedexpansion

echo.
echo 🔍 Starting production build verification...
echo.

set IMAGE_NAME=modelka-verify-test
set CONTAINER_NAME=modelka-verify-container
set TEST_PORT=3001

echo 1️⃣  Building production Docker image...
echo    This may take a few minutes...
docker build -t %IMAGE_NAME% . || (
  echo.
  echo ❌ Docker build FAILED!
  echo    Fix the build errors before pushing to production.
  exit /b 1
)

echo.
echo ✅ Build successful!
echo.

echo 2️⃣  Creating test environment file...
(
  echo # Тестовые переменные для проверки сборки
  echo DATABASE_URL=postgresql://test:test@localhost:5432/test_db
  echo AUTH_SECRET=test-secret-for-verification-must-be-32-chars-long
  echo AUTH_GOOGLE_ID=test-google-id
  echo AUTH_GOOGLE_SECRET=test-google-secret
  echo AUTH_YANDEX_ID=test-yandex-id
  echo AUTH_YANDEX_SECRET=test-yandex-secret
  echo FAL_KEY=test-fal-key
  echo FASHN_API_KEY=test-fashn-key
  echo NODE_ENV=production
  echo AUTH_TRUST_HOST=true
  echo SKIP_MIGRATIONS=true
) > .env.verify.tmp

echo ✅ Test environment created
echo.

echo 3️⃣  Starting test container...
docker run -d --name %CONTAINER_NAME% --env-file .env.verify.tmp -p %TEST_PORT%:3000 %IMAGE_NAME% || (
  echo.
  echo ❌ Container failed to start!
  del .env.verify.tmp
  goto cleanup
)

del .env.verify.tmp

echo ✅ Container started
echo.

echo 4️⃣  Waiting for application to be ready...
timeout /t 5 /nobreak >nul

echo    Checking if container is still running...
docker ps | findstr %CONTAINER_NAME% >nul || (
  echo.
  echo ❌ Container stopped unexpectedly!
  echo    Logs:
  docker logs %CONTAINER_NAME%
  goto cleanup
)

echo ✅ Container is running
echo.

echo 5️⃣  Testing HTTP endpoint...
set /a ATTEMPTS=0
:check_endpoint
set /a ATTEMPTS+=1
curl -f -s -o nul http://localhost:%TEST_PORT%
if %ERRORLEVEL% EQU 0 (
  echo ✅ Application is responding!
  goto endpoint_ok
)
if %ATTEMPTS% GEQ 10 (
  echo.
  echo ❌ Application is not responding after 10 attempts
  echo    Container logs:
  docker logs %CONTAINER_NAME%
  goto cleanup
)
echo    Attempt %ATTEMPTS%/10 - waiting...
timeout /t 2 /nobreak >nul
goto check_endpoint

:endpoint_ok
echo.

echo 6️⃣  Checking image size...
for /f "tokens=*" %%i in ('docker images %IMAGE_NAME% --format "{{.Size}}"') do set IMAGE_SIZE=%%i
echo    Image size: %IMAGE_SIZE%

echo.
echo ╔════════════════════════════════════════════╗
echo ║                                            ║
echo ║  ✅  PRODUCTION BUILD VERIFICATION PASSED  ║
echo ║                                            ║
echo ╚════════════════════════════════════════════╝
echo.
echo Your application is ready for deployment!
echo.
echo 📊 Summary:
echo    • Image name: %IMAGE_NAME%
echo    • Image size: %IMAGE_SIZE%
echo    • Test URL:   http://localhost:%TEST_PORT%
echo.
echo 💡 Next steps:
echo    • Review the logs above for any warnings
echo    • If everything looks good, commit and push your changes
echo    • The CI/CD pipeline will deploy to production
echo.

:cleanup
echo.
echo 🧹 Cleaning up...
docker stop %CONTAINER_NAME% 2>nul
docker rm %CONTAINER_NAME% 2>nul
docker rmi %IMAGE_NAME% 2>nul
echo ✅ Cleanup complete
echo.

endlocal
