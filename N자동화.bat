@echo off
chcp 65001 >nul 2>nul
cd /d "%~dp0"
title N자동화 v1.0.0
color 0A
echo.
echo  ============================================
echo    N자동화 v1.0.0 - 네이버 블로그 자동화
echo  ============================================
echo.

:: Node.js 확인
where node >nul 2>nul
if %errorlevel% neq 0 (
    echo  [오류] Node.js가 설치되지 않았습니다!
    echo  https://nodejs.org 에서 설치 후 다시 실행하세요.
    pause
    exit
)

:: Git 자동 업데이트 (git 있으면)
where git >nul 2>nul
if %errorlevel% equ 0 (
    if exist ".git" (
        echo  [업데이트] 최신 버전 확인 중...
        git pull --quiet 2>nul
        echo  [완료] 최신 상태
        echo.
    )
)

:: node_modules 없으면 자동 설치
if not exist "node_modules\playwright" (
    echo  [설치] 필요한 파일 설치 중... (최초 1회, 2~3분 소요)
    echo.
    call npm install
    call npx playwright install chromium
    echo.
    echo  [완료] 설치 끝!
    echo.
)

:: 서버 시작 + 브라우저 열기
echo  대시보드: http://localhost:8000
echo  (이 창을 닫으면 서버가 종료됩니다)
echo.
echo  ============================================
echo.

start "" cmd /c "timeout /t 2 /nobreak >nul && start http://localhost:8000"

node server\index.js
