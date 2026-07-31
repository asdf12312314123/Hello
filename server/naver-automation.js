/**
 * 네이버 블로그 자동화 - Playwright
 * 기능: 로그인 → 에디터 → 서식 적용 글 입력 → 사진 삽입 → 이모티콘 → 지도 → 저장
 */

const path = require('path');
const fs = require('fs');
const { FormatParser } = require('./format-parser');

const DATA_DIR = path.join(__dirname, '..', 'data');
const STATE_FILE = path.join(DATA_DIR, 'browser_state.json');
const PHOTOS_DIR = path.join(__dirname, '..', 'photos');

class NaverAutomation {
    constructor(config, logManager) {
        this.config = config;
        this.naver = config.naver || {};
        this.autoConfig = config.automation || {};
        this.logManager = logManager;
        this.formatParser = new FormatParser();
        this.browser = null;
        this.context = null;
        this.page = null;
        this.photoIndex = 0;
    }

    async log(level, message) { await this.logManager.add({ level, message }); }

    async initialize() {
        await this.log('정보', '브라우저 초기화...');
        let pw;
        try { pw = require('playwright'); }
        catch (e) { await this.log('오류', 'Playwright 미설치'); throw e; }

        this.browser = await pw.chromium.launch({
            headless: this.autoConfig.headless || false,
            args: ['--no-sandbox', '--disable-blink-features=AutomationControlled']
        });
        const opts = {
            viewport: { width: 1280, height: 900 },
            userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
        };
        if (fs.existsSync(STATE_FILE)) opts.storageState = STATE_FILE;
        this.context = await this.browser.newContext(opts);
        this.page = await this.context.newPage();
        await this.log('완료', '브라우저 준비 완료');
    }

    // ===== 로그인 =====
    async login() {
        const { username, password } = this.naver;
        await this.log('정보', '네이버 로그인 페이지 열기...');
        try {
            await this.page.goto('https://nid.naver.com/nidlogin.login', { waitUntil: 'networkidle' });
            await this._delay(1000);

            // 아이디/비번 있으면 자동 입력 시도
            if (username && password) {
                await this.log('정보', '자동 입력 시도...');
                try {
                    await this.page.evaluate((id) => { const e=document.querySelector('#id'); if(e){e.value=id;e.dispatchEvent(new Event('input',{bubbles:true}));} }, username);
                    await this._delay(300);
                    await this.page.evaluate((pw) => { const e=document.querySelector('#pw'); if(e){e.value=pw;e.dispatchEvent(new Event('input',{bubbles:true}));} }, password);
                    await this._delay(300);
                    await this.page.click('#log\\.login');
                } catch (e) {
                    // 자동 입력 실패해도 괜찮음 - 수동으로 하면 됨
                }
            }

            await this.log('정보', '★ 브라우저에서 직접 로그인해주세요! (최대 120초 대기)');

            // 최대 120초 동안 로그인 완료 대기
            for (let i = 0; i < 120; i++) {
                await this._delay(1000);
                const url = this.page.url();
                // 로그인 성공하면 네이버 메인이나 다른 페이지로 이동됨
                if (!url.includes('nidlogin') && !url.includes('nid.naver.com')) {
                    await this._saveState();
                    await this.log('완료', '로그인 성공! 세션 저장됨 (다음부터 자동 로그인)');
                    return true;
                }
                // 10초마다 안내
                if (i > 0 && i % 10 === 0) {
                    await this.log('정보', `로그인 대기 중... (${i}초/${120}초)`);
                }
            }

            await this.log('오류', '120초 초과 - 로그인 실패. 다시 시도해주세요.');
            return false;
        } catch (e) { await this.log('오류', `로그인 오류: ${e.message}`); return false; }
    }

    async checkLoginStatus() {
        // 저장된 세션 파일이 있으면 로그인 된 것으로 간주
        if (fs.existsSync(STATE_FILE)) {
            await this.log('정보', '저장된 세션 발견 - 로그인 시도 생략');
            return true;
        }
        return false;
    }

    async openEditor() {
        const blogId = this.naver.blog_id;
        if (!blogId) { await this.log('오류', '블로그 ID 미설정'); return false; }
        await this.log('정보', `에디터 열기 - ${blogId}`);
        await this.page.goto(`https://blog.naver.com/${blogId}/postwrite`, { waitUntil: 'networkidle' });
        await this._delay(3000);
        await this.log('완료', '에디터 열림');
        return true;
    }

    // ===== ★ 서식 적용 글 작성 =====
    async writePostWithFormat({ title, content, category, tags, mapPlaces, photos }) {
        await this.log('정보', '글 작성 시작 (서식 적용 모드)...');
        const delay = (this.autoConfig.delay_between_actions || 1.5) * 1000;

        // 사진 목록 준비
        this.photoFiles = this._getPhotoFiles(photos);
        this.photoIndex = 0;

        try {
            // 제목 입력
            await this.log('정보', '제목 입력...');
            const titleArea = await this.page.$('.se-title-text, [placeholder*="제목"]');
            if (titleArea) { await titleArea.click(); await this._delay(300); await this.page.keyboard.type(title, { delay: 50 }); }
            await this._delay(delay);

            // 본문: 서식 파싱 후 적용
            await this.log('정보', '본문 입력 (서식 적용 중)...');
            const contentArea = await this.page.$('.se-text-paragraph, .se-component-content');
            if (contentArea) await contentArea.click();
            await this._delay(300);

            const commands = this.formatParser.parse(content);
            let cmdCount = 0;

            for (const cmd of commands) {
                switch (cmd.type) {
                    case 'newline':
                        await this.page.keyboard.press('Enter');
                        break;

                    case 'text':
                        await this._typeFormattedSegments(cmd.segments);
                        await this.page.keyboard.press('Enter');
                        break;

                    case 'photo':
                        await this._insertPhoto(cmd.description);
                        break;

                    case 'emoticon':
                        await this._insertEmoticon();
                        break;

                    case 'divider':
                        await this._insertDivider();
                        break;

                    case 'map':
                        await this._insertMap(cmd.place);
                        break;
                }

                cmdCount++;
                if (cmdCount % 20 === 0) {
                    await this.log('정보', `본문 입력 중... (${cmdCount}/${commands.length})`);
                }
                await this._delay(100);
            }

            await this.log('완료', '본문 입력 완료 (서식 적용됨)');
            await this._delay(delay);

            // 추가 지도 첨부
            if (mapPlaces?.length > 0) {
                for (const place of mapPlaces) {
                    await this._insertMap(place);
                    await this._delay(delay);
                }
            }

            // 카테고리 / 태그
            if (category) await this._setCategory(category);
            if (tags?.length > 0) await this._setTags(tags);
            await this._delay(delay);

            // 저장/발행
            if (this.autoConfig.auto_publish) await this._publish();
            else if (this.autoConfig.auto_save !== false) await this._saveDraft();

            return true;
        } catch (e) { await this.log('오류', `글 작성 오류: ${e.message}`); return false; }
    }

    // ===== ★ 서식 적용 텍스트 입력 =====
    async _typeFormattedSegments(segments) {
        for (const seg of segments) {
            if (!seg.format) {
                // 일반 텍스트
                await this.page.keyboard.type(seg.text, { delay: 15 });
            } else {
                // 서식 시작
                const startPos = await this._getCurrentCursorPos();
                await this.page.keyboard.type(seg.text, { delay: 15 });

                // 텍스트 선택 (Shift+왼쪽화살표 * 글자수)
                for (let i = 0; i < seg.text.length; i++) {
                    await this.page.keyboard.press('Shift+ArrowLeft');
                }
                await this._delay(100);

                // 서식 적용
                switch (seg.format) {
                    case 'bold':
                        await this.page.keyboard.press('Control+b');
                        break;
                    case 'underline':
                        await this.page.keyboard.press('Control+u');
                        break;
                    case 'color':
                        await this._applyColor(seg.color);
                        break;
                }

                // 커서를 텍스트 끝으로
                await this.page.keyboard.press('ArrowRight');
                await this._delay(50);

                // 서식 해제 (다음 텍스트에 영향 안 주도록)
                if (seg.format === 'bold') await this.page.keyboard.press('Control+b');
                if (seg.format === 'underline') await this.page.keyboard.press('Control+u');
            }
        }
    }

    // ===== 색상 적용 =====
    async _applyColor(colorCode) {
        try {
            // 네이버 에디터 글자색 버튼
            const colorBtn = await this.page.$('.se-toolbar button[aria-label*="글자색"], .se-text-color-button');
            if (colorBtn) {
                await colorBtn.click();
                await this._delay(500);

                // 색상 팔레트에서 색상 선택 (커스텀 색상 입력)
                const colorInput = await this.page.$('input[type="text"][placeholder*="색상"], .color-input');
                if (colorInput) {
                    await colorInput.fill(colorCode);
                    await this.page.keyboard.press('Enter');
                } else {
                    // 미리 정의된 색상 버튼 클릭
                    const presetColor = await this.page.$(`[data-color="${colorCode}"], [style*="${colorCode}"]`);
                    if (presetColor) await presetColor.click();
                }
                await this._delay(300);
            }
        } catch (e) {
            await this.log('오류', `색상 적용 실패: ${e.message}`);
        }
    }

    // ===== ★ 사진 삽입 =====
    async _insertPhoto(description) {
        try {
            await this.log('정보', `사진 삽입${description ? ': ' + description : ''}...`);

            // 삽입할 사진 파일 결정
            const photoFile = this._getNextPhoto();
            if (!photoFile) {
                await this.log('오류', '삽입할 사진 없음 (photos/ 폴더에 이미지 넣기)');
                return;
            }

            // 에디터 이미지 추가 버튼 클릭
            const imgBtn = await this.page.$(
                'button[aria-label*="사진"], button[aria-label*="이미지"], ' +
                '.se-toolbar button[data-name="image"], .se-image-button'
            );

            if (imgBtn) {
                await imgBtn.click();
                await this._delay(1000);

                // 파일 업로드 input 감지
                const fileInput = await this.page.$('input[type="file"][accept*="image"]');
                if (fileInput) {
                    await fileInput.setInputFiles(photoFile);
                    await this._delay(3000); // 업로드 대기
                    await this.log('완료', `사진 삽입 완료: ${path.basename(photoFile)}`);
                } else {
                    // 드래그앤드롭 또는 다른 방법
                    await this.log('오류', '파일 업로드 input을 찾을 수 없음');
                }
            } else {
                await this.log('오류', '사진 추가 버튼을 찾을 수 없음');
            }
        } catch (e) {
            await this.log('오류', `사진 삽입 실패: ${e.message}`);
        }
    }

    _getPhotoFiles(photoPaths) {
        // 직접 경로가 주어진 경우
        if (photoPaths && photoPaths.length > 0) {
            return photoPaths.filter(p => fs.existsSync(p));
        }
        // photos/ 폴더에서 자동 수집
        if (!fs.existsSync(PHOTOS_DIR)) {
            fs.mkdirSync(PHOTOS_DIR, { recursive: true });
            return [];
        }
        const exts = ['.jpg', '.jpeg', '.png', '.gif', '.webp'];
        return fs.readdirSync(PHOTOS_DIR)
            .filter(f => exts.includes(path.extname(f).toLowerCase()))
            .sort()
            .map(f => path.join(PHOTOS_DIR, f));
    }

    _getNextPhoto() {
        if (!this.photoFiles || this.photoFiles.length === 0) return null;
        const file = this.photoFiles[this.photoIndex % this.photoFiles.length];
        this.photoIndex++;
        return file;
    }

    // ===== ★ 구분선 삽입 =====
    async _insertDivider() {
        try {
            await this.log('정보', '구분선 삽입...');

            // 에디터 구분선 버튼
            const dividerBtn = await this.page.$(
                'button[aria-label*="구분선"], button[aria-label*="라인"], ' +
                '.se-toolbar button[data-name="horizontalRule"], ' +
                'button[data-name="line"]'
            );

            if (dividerBtn) {
                await dividerBtn.click();
                await this._delay(500);

                // 구분선 스타일 선택 (첫 번째 or 기본)
                const lineStyles = await this.page.$$('.se-line-item, .line_style_item');
                if (lineStyles.length > 0) {
                    await lineStyles[0].click(); // 첫 번째 스타일
                    await this._delay(500);
                }

                await this.log('완료', '구분선 삽입 완료');
            } else {
                // 더보기 메뉴에서 찾기
                const moreBtn = await this.page.$('.se-toolbar-more, button[aria-label="더보기"]');
                if (moreBtn) {
                    await moreBtn.click();
                    await this._delay(500);
                    const lineItem = await this.page.$('[data-name="horizontalRule"], [aria-label*="구분선"]');
                    if (lineItem) { await lineItem.click(); await this._delay(500); }
                }
            }
        } catch (e) {
            await this.log('오류', `구분선 삽입 실패: ${e.message}`);
        }
    }

    // ===== ★ 이모티콘 삽입 =====
    async _insertEmoticon() {
        try {
            const { StickerManager } = require('./sticker-manager');
            const sm = new StickerManager();
            const logFn = async (level, message) => { await this.logManager.add({ level, message }); };
            await sm.insertSticker(this.page, logFn);
        } catch (e) {
            await this.logManager.add({ level: '오류', message: `이모티콘 삽입 실패: ${e.message}` });
        }
    }

    // ===== 네이버 지도 삽입 =====
    async _insertMap(placeName) {
        try {
            await this.log('정보', `네이버 지도: ${placeName}`);
            const placeBtn = await this.page.$(
                'button[data-name="map"], button[aria-label*="장소"], button[aria-label*="지도"]'
            );
            if (!placeBtn) {
                const moreBtn = await this.page.$('.se-toolbar-more, button[aria-label="더보기"]');
                if (moreBtn) { await moreBtn.click(); await this._delay(500); }
                const mapItem = await this.page.$('[data-name="map"], [aria-label*="장소"]');
                if (mapItem) await mapItem.click();
                else { await this.log('오류', '장소 버튼 없음'); return; }
            } else {
                await placeBtn.click();
            }
            await this._delay(1500);

            const searchInput = await this.page.$('.se-map-search-input, input[placeholder*="장소"], input[placeholder*="검색"]');
            if (searchInput) {
                await searchInput.click();
                await searchInput.fill('');
                await this.page.keyboard.type(placeName, { delay: 30 });
                await this._delay(500);
                const searchBtn = await this.page.$('.se-map-search-button, button[aria-label="검색"]');
                if (searchBtn) await searchBtn.click();
                else await this.page.keyboard.press('Enter');
                await this._delay(2000);

                const firstResult = await this.page.$('.se-map-search-item:first-child, .se-place-item:first-child');
                if (firstResult) { await firstResult.click(); await this._delay(500); }

                const insertBtn = await this.page.$('button:has-text("확인"), button:has-text("삽입"), button:has-text("추가")');
                if (insertBtn) { await insertBtn.click(); await this._delay(1000); }

                await this.log('완료', `지도 삽입: ${placeName}`);
            }
        } catch (e) { await this.log('오류', `지도 실패: ${e.message}`); }
    }

    // ===== 카테고리/태그/저장 =====
    async _setCategory(category) {
        try {
            const btn = await this.page.$('.se-category-button, .post_category');
            if (btn) { await btn.click(); await this._delay(1000);
                const items = await this.page.$$('.se-category-item, .category_item');
                for (const item of items) { if ((await item.innerText()).includes(category)) { await item.click(); break; } }
            }
        } catch (e) { /* ignore */ }
    }

    async _setTags(tags) {
        try {
            const input = await this.page.$('.se-tag-input, input[placeholder*="태그"]');
            if (input) { await input.click();
                for (const tag of tags.slice(0, 10)) { await this.page.keyboard.type(tag.trim(), { delay: 30 }); await this.page.keyboard.press('Enter'); await this._delay(300); }
                await this.log('완료', `태그 ${tags.length}개`);
            }
        } catch (e) { /* ignore */ }
    }

    async _saveDraft() {
        await this.log('정보', '임시저장...');
        await this.page.keyboard.down('Control'); await this.page.keyboard.press('s'); await this.page.keyboard.up('Control');
        await this._delay(2000);
        await this.log('완료', '임시저장 완료');
    }

    async _publish() {
        await this.log('정보', '발행...');
        const btn = await this.page.$('button:has-text("발행")');
        if (btn) { await btn.click(); await this._delay(3000); }
        await this.log('완료', '발행 완료');
    }

    async _saveState() {
        try { if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true }); await this.context.storageState({ path: STATE_FILE }); } catch (e) { /* */ }
    }

    async close() {
        try { if (this.context) await this._saveState(); if (this.browser) await this.browser.close(); } catch (e) { /* */ }
    }

    // ===== 전체 자동화 =====
    async run(data) {
        await this.log('정보', '=== 자동화 시작 ===');
        try {
            await this.initialize();
            if (!await this.checkLoginStatus()) { if (!await this.login()) return false; }
            if (!await this.openEditor()) return false;
            const result = await this.writePostWithFormat(data);
            await this.log('정보', '=== 자동화 완료 ===');
            return result;
        } finally { await this.close(); }
    }

    async testLogin() {
        try { await this.initialize(); if (await this.checkLoginStatus()) return true; return await this.login(); }
        finally { await this.close(); }
    }

    _delay(ms) { return new Promise(r => setTimeout(r, ms)); }
}

module.exports = { NaverAutomation };
