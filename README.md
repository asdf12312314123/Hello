# N자동화 v1.0.0

네이버 블로그 자동화 대시보드 - 메모 입력 → 프롬프트 생성 → Playwright 자동 발행

## 핵심 사용 흐름

```
1. 설정 (네이버 계정, 블로그 ID, 톤/스타일)
2. 메모 입력 (카테고리 선택 → 간단한 정보만 입력)
3. 프롬프트 생성 → 복사
4. Claude/ChatGPT에 붙여넣기 → 블로그 글 받기
5. 자동화 실행 → 네이버 블로그에 자동 글 작성 + 지도 첨부 + 임시저장
```

## 카테고리별 메모 입력

### 맛집
가게이름, 위치, 메뉴, 가격, 추천메뉴, 주차, 분위기, 웨이팅, 누구랑, 메모

### 여행
여행지, 기간, 이동수단, 코스, 숙소, 먹은것, 가볼만한곳, 경비, 팁, 메모

### 일상
주제, 뭘했는지, 계기, 결과/느낀점, 추천, 메모

### 정보
주제, 핵심내용, 출처, 비교대상, 방법/절차, 꿀팁, 메모

## 네이버 지도 자동 첨부

자동화 실행 시 장소명을 입력하면 Playwright가 에디터에서 자동으로 네이버 지도를 검색/삽입합니다.

## 설치 & 실행

```bash
# Playwright 설치 (최초 1회)
npm install playwright
npx playwright install chromium

# 실행
./start.sh
# 또는
node server/index.js
```

대시보드: http://localhost:8000

## 기술 스택

- **서버**: Node.js 순수 구현 (외부 패키지 0개)
- **프론트엔드**: HTML/CSS/JS (다크 테마 대시보드)
- **자동화**: Playwright (네이버 로그인 → 글쓰기 → 지도 첨부 → 저장)
- **실시간 로그**: WebSocket

## 프로젝트 구조

```
naver-blog-auto/
├── server/
│   ├── index.js            # HTTP + WebSocket 서버
│   ├── config.js           # 설정 관리
│   ├── prompt-engine.js    # 카테고리별 메모→프롬프트 엔진
│   ├── topic-manager.js    # 주제 자동 생성/로테이션
│   ├── naver-automation.js # Playwright 자동화 (지도 첨부 포함)
│   ├── log-manager.js      # 로그
│   └── websocket.js        # WebSocket 순수 구현
├── frontend/
│   ├── index.html          # 대시보드
│   ├── style.css           # 다크 테마
│   └── app.js              # 프론트 로직
├── start.sh
└── run.py
```
