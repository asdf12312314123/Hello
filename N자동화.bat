@echo off
chcp 65001 >nul 2>nul
title N자동화 v1.0.0
color 0A
echo.
echo  ============================================
echo    N자동화 v1.0.0 - 네이버 블로그 자동화
echo  ============================================
echo.
echo  서버 시작 중...
echo.

:: Node.js 확인
where node >nul 2>nul
if %errorlevel% neq 0 (
    echo  [오류] Node.js가 설치되지 않았습니다!
    echo  https://nodejs.org 에서 설치 후 다시 실행하세요.
    pause
    exit
)

:: Playwright 확인
if not exist "node_modules\playwright" (
    echo  [설치] Playwright 설치 중... (최초 1회)
    call npm install playwright
    call npx playwright install chromium
    echo.
)

:: 서버 시작 + 브라우저 열기
echo  대시보드: http://localhost:8000
echo  (이 창을 닫으면 서버가 종료됩니다)
echo.
echo  ============================================
echo.

:: 2초 후 브라우저 열기
start "" cmd /c "timeout /t 2 /nobreak >nul && start http://localhost:8000"

:: 서버 실행
node server\index.js
