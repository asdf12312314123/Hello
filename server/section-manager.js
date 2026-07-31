/**
 * 섹션 관리 - 카테고리별 글 구조(섹션 순서) 설정
 * 사용자가 섹션을 추가/삭제/순서변경 가능
 */

const fs = require('fs');
const path = require('path');

const DATA_DIR = path.join(__dirname, '..', 'data');
const SECTIONS_FILE = path.join(DATA_DIR, 'sections.json');

// 기본 섹션 프리셋
const DEFAULT_SECTIONS = {
    '맛집': [
        { id: 'reason', title: '맛집에 가게 된 이유 (짤막하게)', description: '1~2문장으로 간단히. 이모티콘으로 시작. "블로그 글 스타트~" 느낌', hasPhoto: false, hasMap: false, hasEmoticon: true },
        { id: 'map', title: '위치/지도', description: '가게 위치, 교통편, 주차 정보 + 네이버 지도', hasPhoto: false, hasMap: true, hasEmoticon: false },
        { id: 'atmosphere', title: '가게 분위기', description: '인테리어, 좌석, 전체 느낌', hasPhoto: true, hasMap: false, hasEmoticon: false },
        { id: 'menu_price', title: '메뉴 및 가격', description: '메뉴판, 가격대, 대표메뉴 소개', hasPhoto: true, hasMap: false, hasEmoticon: false },
        { id: 'my_order', title: '내가 시킨 메뉴', description: '실제로 먹은 메뉴 리뷰, 맛 평가', hasPhoto: true, hasMap: false, hasEmoticon: false },
        { id: 'summary', title: '총정리', description: '재방문 의사, 추천 대상, 한줄평', hasPhoto: false, hasMap: false, hasEmoticon: true }
    ],
    '여행': [
        { id: 'intro', title: '여행 가게 된 이유', description: '여행 계기, 동행, 기대감', hasPhoto: false, hasMap: false, hasEmoticon: false },
        { id: 'overview', title: '코스 요약', description: '전체 동선, 기간, 이동수단', hasPhoto: false, hasMap: true, hasEmoticon: false },
        { id: 'spot1', title: '첫 번째 장소', description: '첫 방문지 소개, 느낀점', hasPhoto: true, hasMap: true, hasEmoticon: false },
        { id: 'food', title: '먹은 것', description: '맛집, 카페, 간식 등', hasPhoto: true, hasMap: true, hasEmoticon: false },
        { id: 'accommodation', title: '숙소', description: '숙소 정보, 가격, 시설, 뷰', hasPhoto: true, hasMap: false, hasEmoticon: false },
        { id: 'spot2', title: '추가 장소', description: '다른 방문지들', hasPhoto: true, hasMap: true, hasEmoticon: false },
        { id: 'cost', title: '경비 정리', description: '총 비용 요약', hasPhoto: false, hasMap: false, hasEmoticon: false },
        { id: 'summary', title: '총정리', description: '다시 가고싶은지, 추천 대상, 팁', hasPhoto: false, hasMap: false, hasEmoticon: true }
    ],
    '일상': [
        { id: 'intro', title: '시작하게 된 계기', description: '왜 이걸 하게 됐는지', hasPhoto: false, hasMap: false, hasEmoticon: false },
        { id: 'process', title: '과정/경험', description: '실제로 한 것, 겪은 것', hasPhoto: true, hasMap: false, hasEmoticon: false },
        { id: 'result', title: '결과/변화', description: '달라진 점, 느낀 점', hasPhoto: true, hasMap: false, hasEmoticon: false },
        { id: 'tip', title: '팁/추천', description: '도움 되는 정보, 추천할 것', hasPhoto: false, hasMap: false, hasEmoticon: false },
        { id: 'summary', title: '마무리', description: '앞으로 계획, 독자에게 한마디', hasPhoto: false, hasMap: false, hasEmoticon: true }
    ],
    '정보': [
        { id: 'intro', title: '이 정보가 필요한 이유', description: '왜 이게 중요한지, 공감', hasPhoto: false, hasMap: false, hasEmoticon: false },
        { id: 'main_info', title: '핵심 정보', description: '조건, 자격, 대상 등 메인 내용', hasPhoto: false, hasMap: false, hasEmoticon: false },
        { id: 'how_to', title: '방법/절차', description: '단계별 방법, 신청 절차', hasPhoto: true, hasMap: false, hasEmoticon: false },
        { id: 'comparison', title: '비교/분석', description: '옵션 비교, 장단점', hasPhoto: false, hasMap: false, hasEmoticon: false },
        { id: 'tip', title: '꿀팁/주의사항', description: '알면 좋은 팁', hasPhoto: false, hasMap: false, hasEmoticon: false },
        { id: 'summary', title: '총정리', description: '핵심 요약', hasPhoto: false, hasMap: false, hasEmoticon: true }
    ]
};

class SectionManager {
    constructor() {
        this._ensureDir();
        this.sections = this._load();
    }

    _ensureDir() {
        if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });
    }

    _load() {
        try {
            if (fs.existsSync(SECTIONS_FILE)) {
                return JSON.parse(fs.readFileSync(SECTIONS_FILE, 'utf-8'));
            }
        } catch (e) { /* ignore */ }
        return { ...DEFAULT_SECTIONS };
    }

    _save() {
        fs.writeFileSync(SECTIONS_FILE, JSON.stringify(this.sections, null, 2), 'utf-8');
    }

    /** 카테고리별 섹션 조회 */
    getSections(category) {
        return this.sections[category] || DEFAULT_SECTIONS[category] || [];
    }

    /** 모든 카테고리 섹션 조회 */
    getAllSections() {
        return this.sections;
    }

    /** 카테고리 섹션 업데이트 (순서 변경, 추가/삭제 포함) */
    updateSections(category, sections) {
        this.sections[category] = sections;
        this._save();
    }

    /** 섹션 추가 */
    addSection(category, section) {
        if (!this.sections[category]) this.sections[category] = [];
        this.sections[category].push({
            id: section.id || 'section_' + Date.now(),
            title: section.title,
            description: section.description || '',
            hasPhoto: section.hasPhoto || false,
            hasMap: section.hasMap || false,
            hasEmoticon: section.hasEmoticon || false
        });
        this._save();
    }

    /** 섹션 삭제 */
    removeSection(category, sectionId) {
        if (!this.sections[category]) return;
        this.sections[category] = this.sections[category].filter(s => s.id !== sectionId);
        this._save();
    }

    /** 섹션 순서 변경 */
    reorderSections(category, sectionIds) {
        const current = this.sections[category] || [];
        const reordered = sectionIds.map(id => current.find(s => s.id === id)).filter(Boolean);
        this.sections[category] = reordered;
        this._save();
    }

    /** 기본값으로 리셋 */
    resetToDefault(category) {
        this.sections[category] = [...(DEFAULT_SECTIONS[category] || [])];
        this._save();
    }

    /**
     * ★ 프롬프트용 섹션 구조 텍스트 생성
     */
    buildPromptStructure(category, dividerType = 'emoticon') {
        const sections = this.getSections(category);
        if (sections.length === 0) return '';

        let structure = '## 글 구조 (이 순서대로 반드시 작성)\n\n';

        sections.forEach((section, idx) => {
            structure += `### 섹션 ${idx + 1}: ${section.title}\n`;
            structure += `${section.description}\n`;

            const markers = [];
            if (section.hasPhoto) markers.push('[사진: 적절한 설명]');
            if (section.hasMap) markers.push('[네이버지도: 장소명]');
            if (section.hasEmoticon && dividerType === 'emoticon') markers.push('[이모티콘]');

            if (markers.length > 0) {
                structure += `이 섹션에 포함: ${markers.join(', ')}\n`;
            }

            // 섹션 사이 구분
            if (idx < sections.length - 1) {
                if (dividerType === 'line') {
                    structure += `\n[구분선]\n\n`;
                } else if (dividerType === 'emoticon') {
                    structure += `\n[이모티콘]\n\n`;
                } else {
                    structure += `\n`;
                }
            }
        });

        return structure;
    }
}

module.exports = { SectionManager, DEFAULT_SECTIONS };
