# exe 빌드 방법

## 방법 1: 간단하게 (.bat 더블클릭)

`N자동화.bat` 더블클릭하면 끝!
- Node.js 설치 필요 (https://nodejs.org)
- 최초 실행 시 Playwright 자동 설치됨
- 서버 켜지고 → 브라우저 자동으로 열림

---

## 방법 2: exe 파일로 빌드 (Electron)

### 준비
```bash
npm install
npm install --save-dev electron electron-builder
```

### package.json의 main 수정
```json
"main": "electron-main.js"
```

### exe 빌드
```bash
npm run build:win
```

### 결과
`dist/` 폴더에 설치 파일 생성:
- `N자동화 Setup 1.0.0.exe` (설치형)
- 또는 `dist/win-unpacked/N자동화.exe` (포터블)

---

## 방법 3: pkg로 단일 exe (Node.js 없이 실행 가능)

```bash
npm install -g pkg
pkg server/index.js --targets node18-win-x64 --output dist/N자동화.exe
```

이 방법은 서버만 exe로 만들어서, 실행하면 `http://localhost:8000` 에 접속하는 형태.

---

## 추천 순서

1. **지금 바로 쓰려면** → `N자동화.bat` 더블클릭
2. **배포하려면** → Electron 빌드 (방법 2)
3. **가볍게 exe만** → pkg (방법 3)
