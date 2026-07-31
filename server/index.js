/**
 * N자동화 v1.0.0 - 메인 서버
 * 순수 Node.js (외부 패키지 없음)
 */

const http = require('http');
const fs = require('fs');
const path = require('path');
const { URL } = require('url');
const { WebSocketServer } = require('./websocket');
const { Config } = require('./config');
const { PromptEngine } = require('./prompt-engine');
const { LogManager } = require('./log-manager');
const { TopicManager } = require('./topic-manager');
const { ToneManager } = require('./tone-manager');
const { SectionManager } = require('./section-manager');
const { StickerManager } = require('./sticker-manager');
const { StyleRuleManager } = require('./style-rules');

const PORT = 8000;
const FRONTEND_DIR = path.join(__dirname, '..', 'frontend');

// 전역 인스턴스
const config = new Config();
const promptEngine = new PromptEngine();
const logManager = new LogManager();
const topicManager = new TopicManager();
const toneManager = new ToneManager();
const sectionManager = new SectionManager();
const stickerManager = new StickerManager();
const styleRuleManager = new StyleRuleManager();

// MIME 타입
const MIME_TYPES = {
    '.html': 'text/html',
    '.css': 'text/css',
    '.js': 'application/javascript',
    '.json': 'application/json',
    '.png': 'image/png',
    '.jpg': 'image/jpeg',
    '.svg': 'image/svg+xml',
    '.ico': 'image/x-icon'
};

// HTTP 서버
const server = http.createServer(async (req, res) => {
    const url = new URL(req.url, `http://localhost:${PORT}`);
    const pathname = url.pathname;

    // CORS
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

    if (req.method === 'OPTIONS') {
        res.writeHead(204);
        res.end();
        return;
    }

    // API 라우팅
    if (pathname.startsWith('/api/')) {
        await handleAPI(req, res, pathname);
        return;
    }

    // 정적 파일 서빙
    serveStatic(req, res, pathname);
});

// WebSocket 서버
const wsServer = new WebSocketServer(server);
logManager.setWebSocket(wsServer);

// API 핸들러
async function handleAPI(req, res, pathname) {
    const method = req.method;
    let body = '';

    if (method === 'POST' || method === 'PUT') {
        body = await getBody(req);
    }

    try {
        let result;

        // 상태
        if (pathname === '/api/status' && method === 'GET') {
            const cfg = config.load();
            result = {
                version: '1.0.0',
                naver_connected: !!cfg.naver?.username,
                blog_id: cfg.naver?.blog_id || '',
                schedule_enabled: cfg.schedule?.enabled || false
            };
        }
        // 설정 조회
        else if (pathname === '/api/config' && method === 'GET') {
            const cfg = config.load();
            if (cfg.naver?.password) cfg.naver.password = '********';
            result = cfg;
        }
        // 네이버 설정
        else if (pathname === '/api/config/naver' && method === 'POST') {
            const data = JSON.parse(body);
            if (data.password === '********') {
                const current = config.load();
                data.password = current.naver?.password || '';
            }
            config.update('naver', data);
            await logManager.add({ level: '완료', message: '네이버 설정 저장 완료' });
            result = { status: 'ok' };
        }
        // 프롬프트 설정
        else if (pathname === '/api/config/prompt' && method === 'POST') {
            config.update('prompt', JSON.parse(body));
            await logManager.add({ level: '완료', message: '프롬프트 설정 저장 완료' });
            result = { status: 'ok' };
        }
        // 스케줄 설정
        else if (pathname === '/api/config/schedule' && method === 'POST') {
            config.update('schedule', JSON.parse(body));
            await logManager.add({ level: '완료', message: '스케줄 설정 저장 완료' });
            result = { status: 'ok' };
        }
        // 자동화 설정
        else if (pathname === '/api/config/automation' && method === 'POST') {
            config.update('automation', JSON.parse(body));
            await logManager.add({ level: '완료', message: '자동화 설정 저장 완료' });
            result = { status: 'ok' };
        }
        // 톤 목록
        else if (pathname === '/api/prompt/tones' && method === 'GET') {
            result = promptEngine.getAvailableTones();
        }
        // 스타일 목록
        else if (pathname === '/api/prompt/styles' && method === 'GET') {
            result = promptEngine.getAvailableStyles();
        }
        // 프롬프트 생성
        else if (pathname === '/api/prompt/generate' && method === 'POST') {
            const data = JSON.parse(body);
            const prompt = promptEngine.generateBlogPrompt(data);
            await logManager.add({ level: '완료', message: `프롬프트 생성 완료 - 주제: ${data.topic}` });
            result = { prompt };
        }
        // 카드뉴스 프롬프트
        else if (pathname === '/api/prompt/card-news' && method === 'POST') {
            const data = JSON.parse(body);
            const prompt = promptEngine.generateCardNewsPrompt(data);
            await logManager.add({ level: '완료', message: `카드뉴스 프롬프트 생성 - 주제: ${data.topic}` });
            result = { prompt };
        }
        // 주제 연구 프롬프트
        else if (pathname === '/api/prompt/research' && method === 'POST') {
            const data = JSON.parse(body);
            const prompt = promptEngine.generateResearchPrompt(data);
            await logManager.add({ level: '완료', message: `주제 연구 프롬프트 생성 - 카테고리: ${data.category}` });
            result = { prompt };
        }
        // ★ 메모 기반 프롬프트 생성 (카테고리별)
        else if (pathname === '/api/prompt/from-memo' && method === 'POST') {
            const data = JSON.parse(body);
            const prompt = promptEngine.generateFromMemo(data);
            await logManager.add({ level: '완료', message: `메모 기반 프롬프트 생성 - [${data.category}]` });
            result = { prompt };
        }
        // 카테고리 필드 조회
        else if (pathname === '/api/categories/fields' && method === 'GET') {
            result = promptEngine.getAllCategoryFields();
        }
        // ★ 말투 관리 API
        else if (pathname === '/api/tones' && method === 'GET') {
            result = toneManager.getAll();
        }
        else if (pathname === '/api/tones/presets' && method === 'GET') {
            result = toneManager.getPresets();
        }
        else if (pathname === '/api/tones/custom' && method === 'GET') {
            result = toneManager.getCustom();
        }
        else if (pathname === '/api/tones/custom' && method === 'POST') {
            const data = JSON.parse(body);
            const id = data.id || 'custom_' + Date.now();
            toneManager.addCustomTone(id, data);
            await logManager.add({ level: '완료', message: `말투 추가: ${data.name}` });
            result = { status: 'ok', id };
        }
        else if (pathname.startsWith('/api/tones/custom/') && method === 'DELETE') {
            const id = pathname.split('/').pop();
            toneManager.removeCustomTone(id);
            result = { status: 'ok' };
        }
        // ★ 서식 규칙 API
        else if (pathname === '/api/style-rules' && method === 'GET') {
            result = styleRuleManager.getAllRules();
        }
        else if (pathname === '/api/style-rules/options' && method === 'GET') {
            result = styleRuleManager.getFormatOptions();
        }
        else if (pathname.startsWith('/api/style-rules/') && method === 'POST') {
            const cat = decodeURIComponent(pathname.split('/api/style-rules/')[1]);
            const data = JSON.parse(body);
            styleRuleManager.updateRules(cat, data.rules);
            await logManager.add({ level: '완료', message: `[${cat}] 서식 규칙 저장` });
            result = { status: 'ok' };
        }
        // ★ 스티커 관리 API
        else if (pathname === '/api/stickers' && method === 'GET') {
            result = { packs: stickerManager.getPacks(), selected: stickerManager.getSelectedPack(), lastFetched: stickerManager.getLastFetched() };
        }
        else if (pathname === '/api/stickers/select' && method === 'POST') {
            const data = JSON.parse(body);
            stickerManager.selectPack(data.packId);
            await logManager.add({ level: '완료', message: `스티커팩 선택: ${data.packId}` });
            result = { status: 'ok' };
        }
        else if (pathname === '/api/stickers/fetch' && method === 'POST') {
            await logManager.add({ level: '정보', message: '스티커팩 불러오기 시작...' });
            result = await fetchStickers();
        }
        // ★ 섹션 관리 API
        else if (pathname === '/api/sections' && method === 'GET') {
            result = sectionManager.getAllSections();
        }
        else if (pathname.startsWith('/api/sections/') && method === 'GET') {
            const cat = decodeURIComponent(pathname.split('/api/sections/')[1]);
            result = sectionManager.getSections(cat);
        }
        else if (pathname.startsWith('/api/sections/') && method === 'POST') {
            const cat = decodeURIComponent(pathname.split('/api/sections/')[1]);
            const data = JSON.parse(body);
            sectionManager.updateSections(cat, data.sections);
            await logManager.add({ level: '완료', message: `[${cat}] 섹션 구조 저장` });
            result = { status: 'ok' };
        }
        else if (pathname === '/api/sections/reset' && method === 'POST') {
            const data = JSON.parse(body);
            sectionManager.resetToDefault(data.category);
            result = { status: 'ok' };
        }
        // 다음 주제 자동 추천
        else if (pathname === '/api/topics/next' && method === 'GET') {
            result = topicManager.getNextTopic();
        }
        // 특정 카테고리 주제 추천
        else if (pathname === '/api/topics/category' && method === 'POST') {
            const data = JSON.parse(body);
            result = topicManager.getCategoryTopics(data.category, data.count || 5);
        }
        // 주제 통계
        else if (pathname === '/api/topics/stats' && method === 'GET') {
            result = topicManager.getStats();
        }
        // 자동화 실행
        else if (pathname === '/api/automation/run' && method === 'POST') {
            const data = JSON.parse(body);
            await logManager.add({ level: '정보', message: `자동화 실행 시작 - 제목: ${data.title}` });
            // Playwright 자동화 실행 (별도 프로세스)
            result = await runAutomation(data);
        }
        // 로그인 테스트
        else if (pathname === '/api/automation/login-test' && method === 'POST') {
            await logManager.add({ level: '정보', message: '로그인 테스트...' });
            result = await testLogin();
        }
        // 로그 조회
        else if (pathname === '/api/logs' && method === 'GET') {
            result = { logs: logManager.getRecent(100) };
        }
        // 로그 삭제
        else if (pathname === '/api/logs' && method === 'DELETE') {
            logManager.clear();
            result = { status: 'ok' };
        }
        else {
            res.writeHead(404, { 'Content-Type': 'application/json; charset=utf-8' });
            res.end(JSON.stringify({ error: 'Not Found' }));
            return;
        }

        res.writeHead(200, { 'Content-Type': 'application/json; charset=utf-8' });
        res.end(JSON.stringify(result));

    } catch (e) {
        console.error('API Error:', e);
        res.writeHead(500, { 'Content-Type': 'application/json; charset=utf-8' });
        res.end(JSON.stringify({ error: e.message }));
    }
}

// 스티커 불러오기
async function fetchStickers() {
    const cfg = config.load();
    const { NaverAutomation } = require('./naver-automation');
    const automation = new NaverAutomation(cfg, logManager);

    try {
        await automation.initialize();
        const logged = await automation.checkLoginStatus();
        if (!logged) {
            if (!await automation.login()) return { status: 'error', error: '로그인 실패' };
        }
        if (!await automation.openEditor()) return { status: 'error', error: '에디터 열기 실패' };

        const { StickerManager } = require('./sticker-manager');
        const sm = new StickerManager();
        const packs = await sm.fetchStickersFromEditor(automation.page, (level, message) => logManager.add({ level, message }));

        return { status: 'ok', packs };
    } catch (e) {
        return { status: 'error', error: e.message };
    } finally {
        await automation.close();
    }
}

// 자동화 실행
async function runAutomation(data) {
    const cfg = config.load();
    const { NaverAutomation } = require('./naver-automation');
    const automation = new NaverAutomation(cfg, logManager);

    try {
        const result = await automation.run(data);
        return { status: result ? 'ok' : 'error', result };
    } catch (e) {
        await logManager.add({ level: '오류', message: `자동화 실패: ${e.message}` });
        return { status: 'error', error: e.message };
    }
}

// 로그인 테스트
async function testLogin() {
    const cfg = config.load();
    const { NaverAutomation } = require('./naver-automation');
    const automation = new NaverAutomation(cfg, logManager);

    try {
        const result = await automation.testLogin();
        return { status: result ? 'ok' : 'error', logged_in: result };
    } catch (e) {
        return { status: 'error', error: e.message };
    }
}

// 정적 파일 서빙
function serveStatic(req, res, pathname) {
    if (pathname === '/' || pathname === '/index.html') {
        pathname = '/index.html';
    }

    // /static/ 경로는 frontend 디렉토리에서 서빙
    let filePath;
    if (pathname.startsWith('/static/')) {
        filePath = path.join(FRONTEND_DIR, pathname.replace('/static/', ''));
    } else {
        filePath = path.join(FRONTEND_DIR, pathname);
    }

    const ext = path.extname(filePath);
    const contentType = MIME_TYPES[ext] || 'application/octet-stream';

    fs.readFile(filePath, (err, data) => {
        if (err) {
            res.writeHead(404);
            res.end('Not Found');
            return;
        }
        res.writeHead(200, { 'Content-Type': contentType + '; charset=utf-8' });
        res.end(data);
    });
}

// Body 읽기
function getBody(req) {
    return new Promise((resolve) => {
        let data = '';
        req.on('data', chunk => data += chunk);
        req.on('end', () => resolve(data));
    });
}

// 서버 시작
server.listen(PORT, '0.0.0.0', async () => {
    console.log('='.repeat(50));
    console.log('  N자동화 v1.0.0 - 네이버 블로그 자동화 대시보드');
    console.log('='.repeat(50));
    console.log();
    console.log(`  대시보드: http://localhost:${PORT}`);
    console.log();
    console.log('='.repeat(50));

    await logManager.add({ level: '정보', message: 'N자동화 v1.0.0 시작' });
    await logManager.add({ level: '완료', message: `서버 시작 - http://localhost:${PORT}` });
});
