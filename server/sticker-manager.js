/**
 * 스티커 관리 - 네이버 블로그 에디터 스티커(이모티콘) 미리보기 및 선택
 * 
 * Playwright로 에디터 스티커 패널을 열어서 보유 스티커팩 목록을 가져오고,
 * 사용자가 선택한 팩에서 자동 삽입
 */

const fs = require('fs');
const path = require('path');

const DATA_DIR = path.join(__dirname, '..', 'data');
const STICKERS_FILE = path.join(DATA_DIR, 'stickers.json');

class StickerManager {
    constructor() {
        this._ensureDir();
        this.data = this._load();
    }

    _ensureDir() {
        if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });
    }

    _load() {
        try {
            if (fs.existsSync(STICKERS_FILE)) {
                return JSON.parse(fs.readFileSync(STICKERS_FILE, 'utf-8'));
            }
        } catch (e) { /* ignore */ }
        return {
            packs: [],          // 보유 스티커팩 목록
            selectedPackId: null, // 선택된 팩 ID
            lastFetched: null     // 마지막 불러오기 시간
        };
    }

    _save() {
        fs.writeFileSync(STICKERS_FILE, JSON.stringify(this.data, null, 2), 'utf-8');
    }

    /** 보유 스티커팩 목록 */
    getPacks() {
        return this.data.packs;
    }

    /** 선택된 팩 */
    getSelectedPack() {
        if (!this.data.selectedPackId) return null;
        return this.data.packs.find(p => p.id === this.data.selectedPackId) || null;
    }

    /** 팩 선택 */
    selectPack(packId) {
        this.data.selectedPackId = packId;
        this._save();
    }

    /** 스티커 데이터 저장 (Playwright에서 가져온 후) */
    savePacks(packs) {
        this.data.packs = packs;
        this.data.lastFetched = new Date().toISOString();
        this._save();
    }

    /** 마지막 불러오기 시간 */
    getLastFetched() {
        return this.data.lastFetched;
    }

    /**
     * ★ Playwright로 스티커팩 목록 스크래핑
     * 이 함수는 NaverAutomation에서 호출됨
     */
    async fetchStickersFromEditor(page, logFn) {
        const packs = [];

        try {
            await logFn('정보', '스티커 패널 열기...');

            // 스티커/이모티콘 버튼 클릭
            const emoBtn = await page.$(
                'button[aria-label*="이모티콘"], button[aria-label*="스티커"], ' +
                '.se-toolbar button[data-name="sticker"], .se-sticker-button'
            );

            if (!emoBtn) {
                // 더보기 메뉴에서 찾기
                const moreBtn = await page.$('.se-toolbar-more, button[aria-label="더보기"]');
                if (moreBtn) {
                    await moreBtn.click();
                    await this._delay(500);
                }
                const stickerItem = await page.$('[data-name="sticker"], [aria-label*="이모티콘"]');
                if (stickerItem) await stickerItem.click();
                else { await logFn('오류', '스티커 버튼을 찾을 수 없음'); return []; }
            } else {
                await emoBtn.click();
            }

            await this._delay(2000);

            // 스티커팩 탭/목록 수집
            const packElements = await page.$$(
                '.se-sticker-pack-item, .sticker_pack_item, ' +
                '.se-emoticon-tab, .emoticon_tab_item'
            );

            await logFn('정보', `스티커팩 ${packElements.length}개 발견`);

            for (let i = 0; i < packElements.length; i++) {
                try {
                    const pack = packElements[i];

                    // 팩 정보 추출
                    const packName = await pack.getAttribute('title') ||
                                     await pack.getAttribute('aria-label') ||
                                     await pack.innerText() ||
                                     `스티커팩 ${i + 1}`;

                    const packImg = await pack.$('img');
                    const packThumbnail = packImg ? await packImg.getAttribute('src') : '';

                    // 팩 클릭하여 스티커 목록 가져오기
                    await pack.click();
                    await this._delay(1000);

                    const stickerElements = await page.$$(
                        '.se-sticker-item img, .sticker_item img, .emoticon_item img'
                    );

                    const stickers = [];
                    for (let j = 0; j < Math.min(stickerElements.length, 20); j++) {
                        const src = await stickerElements[j].getAttribute('src');
                        if (src) stickers.push({ index: j, src });
                    }

                    packs.push({
                        id: `pack_${i}`,
                        name: packName.trim(),
                        thumbnail: packThumbnail,
                        stickerCount: stickerElements.length,
                        stickers: stickers.slice(0, 10), // 미리보기용 10개만
                        tabIndex: i
                    });

                    await logFn('정보', `  팩 ${i + 1}: ${packName.trim()} (${stickerElements.length}개)`);
                } catch (e) {
                    // 개별 팩 에러는 무시
                }
            }

            // 패널 닫기 (ESC 또는 바깥 클릭)
            await page.keyboard.press('Escape');
            await this._delay(500);

            // 저장
            this.savePacks(packs);
            await logFn('완료', `스티커팩 ${packs.length}개 불러오기 완료`);

            return packs;
        } catch (e) {
            await logFn('오류', `스티커 불러오기 실패: ${e.message}`);
            return [];
        }
    }

    /**
     * ★ 선택된 팩에서 스티커 삽입 (자동화 시)
     */
    async insertSticker(page, logFn, stickerIndex = -1) {
        const selectedPack = this.getSelectedPack();

        try {
            // 스티커 버튼 클릭
            const emoBtn = await page.$(
                'button[aria-label*="이모티콘"], button[aria-label*="스티커"], ' +
                '.se-toolbar button[data-name="sticker"]'
            );
            if (!emoBtn) {
                const moreBtn = await page.$('.se-toolbar-more');
                if (moreBtn) { await moreBtn.click(); await this._delay(500); }
                const item = await page.$('[data-name="sticker"]');
                if (item) await item.click();
                else return;
            } else {
                await emoBtn.click();
            }
            await this._delay(1500);

            // 선택된 팩으로 이동
            if (selectedPack) {
                const packTabs = await page.$$(
                    '.se-sticker-pack-item, .sticker_pack_item, .se-emoticon-tab'
                );
                if (packTabs[selectedPack.tabIndex]) {
                    await packTabs[selectedPack.tabIndex].click();
                    await this._delay(1000);
                }
            }

            // 스티커 선택
            const stickers = await page.$$(
                '.se-sticker-item, .sticker_item, .emoticon_item'
            );

            if (stickers.length > 0) {
                let idx = stickerIndex;
                if (idx < 0 || idx >= stickers.length) {
                    idx = Math.floor(Math.random() * Math.min(stickers.length, 20));
                }
                await stickers[idx].click();
                await this._delay(500);

                // 확인 버튼 (있으면)
                const confirmBtn = await page.$('button:has-text("확인"), button:has-text("삽입")');
                if (confirmBtn) await confirmBtn.click();

                await logFn('완료', `스티커 삽입 (${selectedPack?.name || '기본'})`);
            }

            await this._delay(500);
        } catch (e) {
            await logFn('오류', `스티커 삽입 실패: ${e.message}`);
        }
    }

    _delay(ms) { return new Promise(r => setTimeout(r, ms)); }
}

module.exports = { StickerManager };
