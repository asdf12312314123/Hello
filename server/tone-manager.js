/**
 * 말투 관리 모듈 - 프리셋 + 사용자 커스텀 말투
 */

const fs = require('fs');
const path = require('path');

const DATA_DIR = path.join(__dirname, '..', 'data');
const TONES_FILE = path.join(DATA_DIR, 'custom_tones.json');

// 기본 프리셋 말투
const PRESET_TONES = {
    '친근한_반말': {
        name: '친근한 반말',
        description: 'ㅋㅋ 붙이면서 친구한테 말하듯이',
        example: '아 진짜 여기 맛있었음ㅋㅋ 크림파스타 한입 먹는데 눈 돌아갈뻔',
        prompt_instruction: '마치 친한 친구에게 카톡하듯이 편안한 반말체로 작성. "ㅋㅋ", "ㅎㅎ", "진짜", "대박" 같은 표현 자연스럽게 사용. 문장 끝에 "~임", "~었음", "~인듯" 같은 구어체 종결.'
    },
    '친근한_존댓말': {
        name: '친근한 존댓말',
        description: '편안하지만 존댓말, 블로그 이웃 느낌',
        example: '여기 진짜 분위기 좋았어요! 크림파스타 강추합니다 ㅎㅎ',
        prompt_instruction: '블로그 이웃에게 말하듯이 편안한 존댓말. "~했어요", "~인 것 같아요", "~추천해요" 형태. 이모지 적절히 사용. 친근하지만 예의 바른 느낌.'
    },
    '감탄형': {
        name: '감탄형 (와 대박)',
        description: '감탄사 많이, 신나는 느낌',
        example: '와!!!! 여기 진짜 미쳤다ㅠㅠ 이 맛을 이 가격에?? 매일 오고 싶어요ㅠㅜ',
        prompt_instruction: '감탄사를 많이 사용하는 스타일. "와", "헐", "대박", "미쳤다", "ㅠㅠ" 등 감정 표현 풍부하게. 느낌표/물음표 강조. 흥분한 듯한 에너지.'
    },
    '솔직후기': {
        name: '솔직 후기형',
        description: '좋은점도 아쉬운점도 솔직하게',
        example: '맛은 괜찮았는데 솔직히 가격 대비로 따지면... 음... 재방문은 고민될듯',
        prompt_instruction: '솔직하고 담백한 리뷰 스타일. 좋은 점과 아쉬운 점을 모두 언급. "솔직히", "개인적으로", "근데" 같은 표현으로 진짜 경험한 사람 느낌. 과장 없이 현실적인 평가.'
    },
    '정보전달_깔끔': {
        name: '정보 전달 깔끔형',
        description: '핵심만 딱딱 전달, 군더더기 없음',
        example: '위치: 성수역 3번출구 도보 5분\n메뉴: 크림파스타 15,000원\n주차: 건물 지하 (2시간 무료)',
        prompt_instruction: '군더더기 없이 핵심 정보만 전달하는 스타일. 짧은 문장, 리스트 활용, 불필요한 감정 표현 최소화. 독자가 원하는 정보를 빠르게 찾을 수 있게 구조적으로 작성.'
    },
    '감성_에세이': {
        name: '감성 에세이형',
        description: '문학적이고 서정적인 느낌',
        example: '골목 끝에 숨어있는 작은 파스타집. 문을 열면 은은한 올리브 향이 코끝을 스쳤다.',
        prompt_instruction: '감성적이고 서정적인 문체. 비유, 묘사, 감각적 표현 활용. 시간 순서대로 이야기를 풀어가듯 작성. 독자가 장면을 상상할 수 있게 디테일한 묘사.'
    },
    '유머러스': {
        name: '유머러스',
        description: '웃기면서 정보 전달',
        example: '파스타가 맛없으면 내가 여기까지 와서 글을 쓰겠냐고요... (쓸 맛이었음)',
        prompt_instruction: '재치있고 유머러스한 스타일. 셀프 디스, 과장, 반전 등 웃음 요소 포함. 정보 전달하면서도 독자가 웃을 수 있는 포인트 삽입. 유머가 과하지 않게 적절히 배분.'
    }
};

class ToneManager {
    constructor() {
        this._ensureDir();
        this.customTones = this._loadCustom();
    }

    _ensureDir() {
        if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });
    }

    _loadCustom() {
        try {
            if (fs.existsSync(TONES_FILE)) {
                return JSON.parse(fs.readFileSync(TONES_FILE, 'utf-8'));
            }
        } catch (e) { /* ignore */ }
        return {};
    }

    _saveCustom() {
        fs.writeFileSync(TONES_FILE, JSON.stringify(this.customTones, null, 2), 'utf-8');
    }

    /** 모든 말투 조회 (프리셋 + 커스텀) */
    getAll() {
        return { ...PRESET_TONES, ...this.customTones };
    }

    /** 프리셋만 */
    getPresets() {
        return PRESET_TONES;
    }

    /** 커스텀만 */
    getCustom() {
        return this.customTones;
    }

    /** 특정 말투 조회 */
    getTone(id) {
        return PRESET_TONES[id] || this.customTones[id] || null;
    }

    /** 말투의 프롬프트 지시사항 가져오기 */
    getPromptInstruction(id) {
        const tone = this.getTone(id);
        return tone ? tone.prompt_instruction : '';
    }

    /** 사용자 커스텀 말투 추가 */
    addCustomTone(id, data) {
        this.customTones[id] = {
            name: data.name,
            description: data.description || '',
            example: data.example || '',
            prompt_instruction: data.prompt_instruction || data.example || ''
        };
        this._saveCustom();
        return this.customTones[id];
    }

    /** 사용자 커스텀 말투 삭제 */
    removeCustomTone(id) {
        if (this.customTones[id]) {
            delete this.customTones[id];
            this._saveCustom();
            return true;
        }
        return false;
    }

    /** 말투 예시로부터 프롬프트 지시사항 자동 생성 */
    generateInstructionFromExample(example) {
        // 예시 글에서 특징을 분석하여 프롬프트 지시사항 생성
        let instruction = '다음 예시와 동일한 말투/톤으로 작성:\n\n';
        instruction += `"""${example}"""\n\n`;
        instruction += '위 예시의 말투, 어미, 표현 방식을 그대로 따라서 작성해주세요.';
        return instruction;
    }
}

module.exports = { ToneManager, PRESET_TONES };
