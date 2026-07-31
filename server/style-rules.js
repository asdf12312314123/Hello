/**
 * 서식 규칙 관리 - 어떤 정보에 어떤 서식을 적용할지 설정
 */

const fs = require('fs');
const path = require('path');

const DATA_DIR = path.join(__dirname, '..', 'data');
const RULES_FILE = path.join(DATA_DIR, 'style_rules.json');

// 서식 옵션
const FORMAT_OPTIONS = {
    bold: '굵게',
    underline: '밑줄',
    color_red: '글자색 빨강',
    color_blue: '글자색 파랑',
    color_green: '글자색 초록',
    color_orange: '글자색 주황',
    color_purple: '글자색 보라',
    highlight_yellow: '형광펜 노랑',
    highlight_green: '형광펜 초록',
    highlight_pink: '형광펜 분홍',
    highlight_blue: '형광펜 파랑'
};

// 기본 서식 규칙
const DEFAULT_RULES = {
    '맛집': [
        { target: '가게명', formats: ['bold', 'color_blue'], example: '**성수 파스타공방**' },
        { target: '가격', formats: ['color_red'], example: '{{빨강}}15,000원{{/빨강}}' },
        { target: '추천 메뉴', formats: ['bold', 'underline'], example: '**__크림파스타__**' },
        { target: '위치/주소', formats: ['color_blue'], example: '{{파랑}}뚝섬역 3번출구{{/파랑}}' },
        { target: '핵심 한줄평', formats: ['highlight_yellow'], example: '{{형광노랑}}여기 진짜 맛있음{{/형광노랑}}' }
    ],
    '여행': [
        { target: '장소명', formats: ['bold', 'color_blue'], example: '**경포대**' },
        { target: '비용/가격', formats: ['color_red'], example: '{{빨강}}1박 8만원{{/빨강}}' },
        { target: '추천 포인트', formats: ['bold', 'highlight_yellow'], example: '**뷰 최고**' },
        { target: '이동 정보', formats: ['color_blue'], example: '{{파랑}}차로 2시간{{/파랑}}' },
        { target: '팁/주의', formats: ['underline'], example: '__주말엔 예약 필수__' }
    ],
    '일상': [
        { target: '핵심 키워드', formats: ['bold'], example: '**홈트**' },
        { target: '결과/숫자', formats: ['color_red', 'bold'], example: '**{{빨강}}2주 만에 -3kg{{/빨강}}**' },
        { target: '추천 제품/앱', formats: ['underline', 'color_blue'], example: '__{{파랑}}이 앱{{/파랑}}__' },
        { target: '느낀점 핵심', formats: ['highlight_yellow'], example: '{{형광노랑}}확실히 달라짐{{/형광노랑}}' }
    ],
    '정보': [
        { target: '핵심 조건/자격', formats: ['bold', 'color_red'], example: '**{{빨강}}만 19~34세{{/빨강}}**' },
        { target: '금액/숫자', formats: ['color_red'], example: '{{빨강}}최대 2억원{{/빨강}}' },
        { target: '기관/사이트명', formats: ['bold', 'color_blue'], example: '**{{파랑}}주택도시기금{{/파랑}}**' },
        { target: '주의사항', formats: ['underline', 'highlight_pink'], example: '__{{형광분홍}}서류 미비 시 반려{{/형광분홍}}__' },
        { target: '꿀팁', formats: ['highlight_yellow', 'bold'], example: '**{{형광노랑}}이거 먼저 준비{{/형광노랑}}**' }
    ]
};

class StyleRuleManager {
    constructor() {
        this._ensureDir();
        this.rules = this._load();
    }

    _ensureDir() {
        if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });
    }

    _load() {
        try {
            if (fs.existsSync(RULES_FILE)) {
                return JSON.parse(fs.readFileSync(RULES_FILE, 'utf-8'));
            }
        } catch (e) { /* ignore */ }
        return { ...DEFAULT_RULES };
    }

    _save() {
        fs.writeFileSync(RULES_FILE, JSON.stringify(this.rules, null, 2), 'utf-8');
    }

    /** 카테고리별 규칙 조회 */
    getRules(category) {
        return this.rules[category] || [];
    }

    /** 전체 규칙 조회 */
    getAllRules() {
        return this.rules;
    }

    /** 규칙 업데이트 */
    updateRules(category, rules) {
        this.rules[category] = rules;
        this._save();
    }

    /** 규칙 추가 */
    addRule(category, rule) {
        if (!this.rules[category]) this.rules[category] = [];
        this.rules[category].push(rule);
        this._save();
    }

    /** 규칙 삭제 */
    removeRule(category, index) {
        if (this.rules[category]) {
            this.rules[category].splice(index, 1);
            this._save();
        }
    }

    /** 기본값 리셋 */
    resetToDefault(category) {
        this.rules[category] = [...(DEFAULT_RULES[category] || [])];
        this._save();
    }

    /** 서식 옵션 목록 */
    getFormatOptions() {
        return FORMAT_OPTIONS;
    }

    /**
     * ★ 프롬프트에 삽입할 서식 규칙 텍스트 생성
     */
    buildPromptRules(category) {
        const rules = this.getRules(category);
        if (rules.length === 0) return '';

        let text = '## 서식 적용 규칙 (반드시 따라주세요)\n\n';
        text += '아래 규칙에 따라 서식 마킹을 적용하세요:\n\n';

        rules.forEach((rule, i) => {
            const formatNames = rule.formats.map(f => FORMAT_OPTIONS[f] || f).join(' + ');
            text += `${i + 1}. **${rule.target}** → ${formatNames}\n`;
            text += `   예시: ${rule.example}\n`;
        });

        text += '\n※ 위 규칙에 해당하는 텍스트가 나올 때마다 반드시 서식 마킹을 적용하세요.\n';
        return text;
    }
}

module.exports = { StyleRuleManager, FORMAT_OPTIONS, DEFAULT_RULES };
