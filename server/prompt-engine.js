/**
 * 프롬프트 엔진 - 카테고리별 메모 기반 블로그 글 프롬프트 생성
 * + 말투(ToneManager) + 서식 마킹(FormatParser) 통합
 */

const { ToneManager } = require('./tone-manager');
const { FormatParser } = require('./format-parser');
const { SectionManager } = require('./section-manager');
const { StyleRuleManager } = require('./style-rules');

const toneManager = new ToneManager();
const formatParser = new FormatParser();
const sectionManager = new SectionManager();
const styleRuleManager = new StyleRuleManager();

const TONE_TEMPLATES = {
    '친근한': '마치 친한 친구에게 이야기하듯이 편안하고 친근한 말투로',
    '전문적': '해당 분야의 전문가로서 신뢰감 있고 권위적인 말투로',
    '유머러스': '재치있고 유머러스한 말투로 독자가 웃으면서 읽을 수 있도록',
    '감성적': '감성적이고 서정적인 문체로 독자의 감정에 호소하듯이',
    '리뷰형': '실제로 경험해본 사람의 솔직한 후기 형태로',
    '정보전달형': '핵심 정보를 깔끔하게 정리하여 전달하는 말투로'
};

const STYLE_TEMPLATES = {
    '정보전달형': '핵심 정보를 체계적으로 정리하여 전달하는 글',
    '리뷰형': '직접 경험한 것처럼 장단점을 분석하는 리뷰 글',
    '일상형': '일상에서의 경험을 자연스럽게 풀어가는 글',
    '가이드형': '단계별로 따라할 수 있는 가이드/튜토리얼 형태의 글',
    '비교분석형': '여러 옵션을 비교 분석하여 선택을 도와주는 글',
    '트렌드형': '최신 트렌드를 소개하고 분석하는 글'
};

// 카테고리별 입력 필드 정의
const CATEGORY_FIELDS = {
    '맛집': {
        fields: [
            { id: 'storeName', label: '가게 이름', type: 'text', placeholder: '예: 성수 파스타집', required: true },
            { id: 'location', label: '위치', type: 'text', placeholder: '예: 성수 뚝섬역 3번출구 도보 5분' },
            { id: 'menu', label: '먹은 메뉴', type: 'text', placeholder: '예: 크림파스타, 스테이크, 에이드' },
            { id: 'price', label: '가격대', type: 'text', placeholder: '예: 1만5천원~2만5천원' },
            { id: 'recommend', label: '추천 메뉴', type: 'text', placeholder: '예: 크림파스타 존맛, 스테이크는 보통' },
            { id: 'parking', label: '주차', type: 'text', placeholder: '예: 건물 지하 가능 / 불가 / 근처 공영주차장' },
            { id: 'atmosphere', label: '분위기', type: 'text', placeholder: '예: 깔끔, 데이트하기 좋음, 조용한 편' },
            { id: 'waiting', label: '웨이팅', type: 'text', placeholder: '예: 주말 30분 대기 / 평일은 바로 입장' },
            { id: 'who', label: '누구랑', type: 'text', placeholder: '예: 친구, 연인, 혼밥' },
            { id: 'memo', label: '추가 메모', type: 'textarea', placeholder: '기억나는 거, 특이한 점 아무거나...' }
        ],
        defaultTone: '리뷰형',
        defaultStyle: '리뷰형',
        mapField: 'storeName' // 네이버 지도에 검색할 필드
    },
    '여행': {
        fields: [
            { id: 'destination', label: '여행지', type: 'text', placeholder: '예: 강릉', required: true },
            { id: 'duration', label: '기간', type: 'text', placeholder: '예: 1박2일, 당일치기' },
            { id: 'transport', label: '이동수단', type: 'text', placeholder: '예: 자차 2시간반 / KTX 1시간' },
            { id: 'course', label: '코스/동선', type: 'textarea', placeholder: '예: 주문진시장→카페→숙소체크인→경포대 산책→저녁' },
            { id: 'accommodation', label: '숙소', type: 'text', placeholder: '예: 에어비앤비 오션뷰, 1박 8만원' },
            { id: 'food', label: '먹은 것', type: 'text', placeholder: '예: 회, 커피, 감자빵' },
            { id: 'spots', label: '가볼만한 곳', type: 'text', placeholder: '예: 주문진해변, 안목카페거리, 경포대' },
            { id: 'cost', label: '총 경비', type: 'text', placeholder: '예: 2인 기준 약 20만원' },
            { id: 'tip', label: '팁/주의사항', type: 'text', placeholder: '예: 주말엔 주차 힘듦, 예약 필수' },
            { id: 'memo', label: '추가 메모', type: 'textarea', placeholder: '날씨, 느낀점, 기억에 남는 것...' }
        ],
        defaultTone: '친근한',
        defaultStyle: '가이드형',
        mapField: 'spots' // 여행지 스팟들 지도 첨부
    },
    '일상': {
        fields: [
            { id: 'title', label: '무슨 얘기?', type: 'text', placeholder: '예: 퇴근 후 홈트 시작한 이야기', required: true },
            { id: 'what', label: '뭘 했는지', type: 'textarea', placeholder: '예: 유튜브 보고 홈트 시작, 스쿼트 30개씩...' },
            { id: 'why', label: '왜/계기', type: 'text', placeholder: '예: 살이 쪄서, 건강검진 결과 보고' },
            { id: 'result', label: '결과/느낀점', type: 'textarea', placeholder: '예: 2주 했더니 확실히 체력 올라감' },
            { id: 'recommend', label: '추천할 것', type: 'text', placeholder: '예: 이 앱 좋음, 이 유튜버 따라하기' },
            { id: 'memo', label: '추가 메모', type: 'textarea', placeholder: '사진 설명, 추가 이야기...' }
        ],
        defaultTone: '친근한',
        defaultStyle: '일상형',
        mapField: null
    },
    '정보': {
        fields: [
            { id: 'topic', label: '주제', type: 'text', placeholder: '예: 2024 청년 전세자금대출 조건', required: true },
            { id: 'keyPoints', label: '핵심 내용', type: 'textarea', placeholder: '예: 조건: 만 19~34세, 연소득 5천만원 이하...' },
            { id: 'source', label: '출처/근거', type: 'text', placeholder: '예: 주택도시기금 홈페이지, 직접 경험' },
            { id: 'comparison', label: '비교 대상', type: 'text', placeholder: '예: A상품 vs B상품, 작년 vs 올해' },
            { id: 'steps', label: '방법/절차', type: 'textarea', placeholder: '예: 1. 서류준비 2. 은행방문 3. 심사...' },
            { id: 'tip', label: '꿀팁', type: 'text', placeholder: '예: 이 서류 미리 준비하면 빨라요' },
            { id: 'memo', label: '추가 메모', type: 'textarea', placeholder: '주의사항, 내 경험, 보충설명...' }
        ],
        defaultTone: '정보전달형',
        defaultStyle: '정보전달형',
        mapField: null
    }
};

class PromptEngine {

    /**
     * 카테고리별 메모 기반 프롬프트 생성 (메인 기능)
     */
    generateFromMemo({ category, memoData, tone, toneId, style, min_length = 1500, max_length = 3000 }) {
        const categoryConfig = CATEGORY_FIELDS[category];
        if (!categoryConfig) {
            return this.generateBlogPrompt({ topic: memoData.title || memoData.topic || category, keywords: [], tone, style, min_length, max_length });
        }

        // 말투 결정: toneId가 있으면 ToneManager에서 가져옴
        let toneInstruction = '';
        if (toneId) {
            const toneData = toneManager.getTone(toneId);
            if (toneData) {
                toneInstruction = toneData.prompt_instruction;
            }
        }
        if (!toneInstruction) {
            const finalTone = tone || categoryConfig.defaultTone;
            toneInstruction = TONE_TEMPLATES[finalTone] || finalTone;
        }

        const finalStyle = style || categoryConfig.defaultStyle;
        const styleDesc = STYLE_TEMPLATES[finalStyle] || finalStyle;

        // 서식 마킹 가이드
        const sectionDivider = memoData._sectionDivider || 'emoticon';
        const formattingGuide = formatParser.getFormattingGuide(sectionDivider);

        // ★ 카테고리별 섹션 구조
        const sectionStructure = sectionManager.buildPromptStructure(category, sectionDivider);

        let prompt = '';

        switch (category) {
            case '맛집':
                prompt = this._buildFoodPrompt(memoData, toneInstruction, styleDesc, min_length, max_length);
                break;
            case '여행':
                prompt = this._buildTravelPrompt(memoData, toneInstruction, styleDesc, min_length, max_length);
                break;
            case '일상':
                prompt = this._buildDailyPrompt(memoData, toneInstruction, styleDesc, min_length, max_length);
                break;
            case '정보':
                prompt = this._buildInfoPrompt(memoData, toneInstruction, styleDesc, min_length, max_length);
                break;
            default:
                prompt = this._buildGenericPrompt(memoData, toneInstruction, styleDesc, min_length, max_length);
        }

        // 서식 마킹 가이드 + 섹션 구조 + 서식 규칙 삽입
        const styleRules = styleRuleManager.buildPromptRules(category);
        prompt += '\n' + sectionStructure;
        prompt += '\n' + styleRules;
        prompt += '\n' + formattingGuide;

        return prompt;
    }

    _buildFoodPrompt(data, toneDesc, styleDesc, minLen, maxLen) {
        return `당신은 네이버 블로그 맛집 리뷰 전문 작성자입니다.

## 내가 제공하는 정보 (실제 방문 기반)

- **가게 이름**: ${data.storeName || '미입력'}
- **위치**: ${data.location || '미입력'}
- **먹은 메뉴**: ${data.menu || '미입력'}
- **가격대**: ${data.price || '미입력'}
- **추천 메뉴**: ${data.recommend || '미입력'}
- **주차**: ${data.parking || '미입력'}
- **분위기**: ${data.atmosphere || '미입력'}
- **웨이팅**: ${data.waiting || '미입력'}
- **누구랑 갔는지**: ${data.who || '미입력'}
- **추가 메모**: ${data.memo || '없음'}

## 작성 요청

위 정보를 바탕으로 네이버 블로그 맛집 리뷰 글을 작성해주세요.

**말투**: ${toneDesc}
**스타일**: ${styleDesc}
**글자수**: ${minLen}자 ~ ${maxLen}자

## 작성 규칙

1. **제목**: 가게명 + 지역 + 핵심 키워드 포함 (클릭 유도)
   - 예: "성수 파스타 맛집 ○○○ | 크림파스타가 미쳤다"
2. **서론**: 방문 계기를 자연스럽게 (친구랑 약속, 검색해서 찾음 등)
3. **가게 정보**: 위치, 주차, 영업시간 등 깔끔하게 정리
4. **메뉴 리뷰**: 각 메뉴별 맛 평가, 사진 위치 표시
5. **총평**: 재방문 의사, 추천 대상 (데이트/혼밥/모임 등)

## 네이버 SEO 규칙

- 제목에 "지역명 + 음식종류 + 맛집" 키워드 배치
- 본문에 가게명 3~5회 자연스럽게 반복
- 소제목 활용 (메뉴, 분위기, 총평 등)
- 문단 짧게 (2~3문장), 모바일 가독성 확보
- [사진] 표시로 이미지 삽입 위치 안내
- [네이버지도: ${data.storeName || '가게명'}] 표시로 지도 첨부 위치 안내

## 금지 사항

- 안 먹은 메뉴를 먹은 것처럼 쓰지 말 것
- 내가 준 정보 외에 가격/메뉴를 지어내지 말 것
- AI 느낌 나는 딱딱한 표현 금지
- 광고 받은 것 같은 과장 금지

## 출력 형식

제목: [제목]

---

[본문]

---

태그: [관련 태그 5~10개]
`;
    }

    _buildTravelPrompt(data, toneDesc, styleDesc, minLen, maxLen) {
        return `당신은 네이버 블로그 여행 후기 전문 작성자입니다.

## 내가 제공하는 정보 (실제 여행 기반)

- **여행지**: ${data.destination || '미입력'}
- **기간**: ${data.duration || '미입력'}
- **이동수단**: ${data.transport || '미입력'}
- **코스/동선**: ${data.course || '미입력'}
- **숙소**: ${data.accommodation || '미입력'}
- **먹은 것**: ${data.food || '미입력'}
- **가볼만한 곳**: ${data.spots || '미입력'}
- **총 경비**: ${data.cost || '미입력'}
- **팁/주의사항**: ${data.tip || '없음'}
- **추가 메모**: ${data.memo || '없음'}

## 작성 요청

위 정보를 바탕으로 네이버 블로그 여행 후기 글을 작성해주세요.

**말투**: ${toneDesc}
**스타일**: ${styleDesc}
**글자수**: ${minLen}자 ~ ${maxLen}자

## 작성 규칙

1. **제목**: 여행지 + 기간 + 핵심 키워드
   - 예: "강릉 1박2일 여행 코스 | 바다뷰 숙소 + 맛집 총정리"
2. **서론**: 여행 가게 된 계기, 떠나기 전 설렘
3. **코스 소개**: 시간 순서대로 동선 설명
4. **스팟별 리뷰**: 각 장소의 분위기, 추천 포인트
5. **숙소 리뷰**: 가격, 위치, 시설 등
6. **경비 정리**: 총 비용 요약
7. **총평**: 다시 가고 싶은지, 누구에게 추천하는지

## 네이버 SEO 규칙

- 제목에 "여행지명 + 기간 + 여행" 키워드
- 각 장소마다 [네이버지도: 장소명] 표시
- 소제목으로 코스별 구분
- 문단 짧게, 사진 위치 [사진: 설명] 표시
- 실용 정보 (주차, 입장료, 영업시간) 포함

## 금지 사항

- 안 간 곳을 간 것처럼 쓰지 말 것
- 내가 준 정보 외에 장소를 추가하지 말 것
- 과장/허위 정보 금지

## 출력 형식

제목: [제목]

---

[본문]

---

태그: [관련 태그 5~10개]
`;
    }

    _buildDailyPrompt(data, toneDesc, styleDesc, minLen, maxLen) {
        return `당신은 네이버 블로그 일상 글 전문 작성자입니다.

## 내가 제공하는 정보 (실제 경험 기반)

- **주제**: ${data.title || '미입력'}
- **뭘 했는지**: ${data.what || '미입력'}
- **계기/이유**: ${data.why || '미입력'}
- **결과/느낀점**: ${data.result || '미입력'}
- **추천할 것**: ${data.recommend || '없음'}
- **추가 메모**: ${data.memo || '없음'}

## 작성 요청

위 정보를 바탕으로 네이버 블로그 일상 글을 작성해주세요.

**말투**: ${toneDesc}
**스타일**: ${styleDesc}
**글자수**: ${minLen}자 ~ ${maxLen}자

## 작성 규칙

1. **제목**: 공감가는 + 클릭하고 싶은 제목
   - 예: "퇴근 후 홈트 2주 해봤더니 | 현실 후기"
2. **서론**: 시작하게 된 계기 (공감 포인트)
3. **본문**: 실제로 한 것, 과정, 느낀 점
4. **결론**: 앞으로 계획, 독자에게 한마디

## 네이버 SEO 규칙

- 제목에 핵심 키워드 포함
- 자연스러운 문체 (블로그 일상 느낌)
- 문단 짧게, 줄바꿈 많이
- [사진: 설명] 표시
- 공감 가는 표현 사용

## 금지 사항

- 내가 안 한 것을 한 것처럼 쓰지 말 것
- 과장/허위 금지
- 너무 교훈적이거나 딱딱한 톤 금지

## 출력 형식

제목: [제목]

---

[본문]

---

태그: [관련 태그 5~10개]
`;
    }

    _buildInfoPrompt(data, toneDesc, styleDesc, minLen, maxLen) {
        return `당신은 네이버 블로그 정보성 글 전문 작성자입니다.

## 내가 제공하는 정보

- **주제**: ${data.topic || '미입력'}
- **핵심 내용**: ${data.keyPoints || '미입력'}
- **출처/근거**: ${data.source || '미입력'}
- **비교 대상**: ${data.comparison || '없음'}
- **방법/절차**: ${data.steps || '없음'}
- **꿀팁**: ${data.tip || '없음'}
- **추가 메모**: ${data.memo || '없음'}

## 작성 요청

위 정보를 바탕으로 네이버 블로그 정보 글을 작성해주세요.

**말투**: ${toneDesc}
**스타일**: ${styleDesc}
**글자수**: ${minLen}자 ~ ${maxLen}자

## 작성 규칙

1. **제목**: 검색 키워드 + "총정리/방법/비교" 등
   - 예: "2024 청년 전세자금대출 조건 총정리 (신청 방법까지)"
2. **서론**: 이 정보가 왜 필요한지 (공감/필요성)
3. **본문**: 핵심 내용을 구조적으로 정리
   - 조건, 방법, 절차 등을 표/리스트 활용
4. **비교**: 비교 대상이 있으면 표로 정리
5. **꿀팁**: 실제로 도움 되는 팁
6. **결론**: 핵심 요약 + 주의사항

## 네이버 SEO 규칙

- 제목에 핵심 검색 키워드 앞부분 배치
- 소제목 많이 활용 (스캔 가능한 구조)
- 숫자/데이터 활용
- 문단 짧게
- 정확한 정보 기반

## 금지 사항

- 내가 준 정보 외에 수치/조건을 지어내지 말 것
- 확인 안 된 정보 작성 금지
- 출처 불분명한 내용 금지

## 출력 형식

제목: [제목]

---

[본문]

---

태그: [관련 태그 5~10개]
`;
    }

    _buildGenericPrompt(data, toneDesc, styleDesc, minLen, maxLen) {
        const topic = data.title || data.topic || '블로그 글';
        return this.generateBlogPrompt({ topic, keywords: [], tone: toneDesc, style: styleDesc, min_length: minLen, max_length: maxLen });
    }

    /**
     * 범용 프롬프트 생성 (기존 기능 유지)
     */
    generateBlogPrompt({ topic, keywords = [], tone = '친근한', style = '정보전달형', min_length = 1500, max_length = 3000, additional_instructions = '', target_audience = '' }) {
        const toneDesc = TONE_TEMPLATES[tone] || tone;
        const styleDesc = STYLE_TEMPLATES[style] || style;
        const keywordsStr = keywords.length > 0 ? keywords.join(', ') : '없음';

        let prompt = `당신은 네이버 블로그 SEO에 최적화된 전문 블로그 글 작성자입니다.

## 작성 요청

**주제:** ${topic}
**핵심 키워드:** ${keywordsStr}
**글 스타일:** ${styleDesc}
**말투/톤:** ${toneDesc}
**글자수:** ${min_length}자 ~ ${max_length}자

## 작성 규칙

1. **제목**: 키워드를 자연스럽게 포함한 매력적인 제목
2. **서론**: 독자의 관심을 끄는 도입부
3. **본문**: 
   - 핵심 키워드 3~5회 자연스럽게 반복
   - 소제목 활용하여 가독성 확보
4. **결론**: 핵심 요약 + 마무리

## 네이버 SEO 규칙

- 제목 앞부분에 핵심 키워드
- 문단 짧게 (모바일 가독성)
- 리스트/번호 활용
- [사진: 설명] 형태로 이미지 위치 표시

## 금지 사항

- AI 느낌 나는 딱딱한 표현 금지
- 검증 안 된 정보 금지
`;

        if (target_audience) prompt += `\n## 타겟 독자\n${target_audience}\n`;
        if (additional_instructions) prompt += `\n## 추가 지시사항\n${additional_instructions}\n`;

        prompt += `\n## 출력 형식\n\n제목: [제목]\n\n---\n\n[본문]\n\n---\n\n태그: [관련 태그 5~10개]\n`;
        return prompt;
    }

    generateCardNewsPrompt({ topic, slides = 5, keywords = [] }) {
        const keywordsStr = keywords.length > 0 ? keywords.join(', ') : topic;
        return `당신은 카드뉴스 콘텐츠 전문가입니다.

## 요청
**주제:** ${topic}
**슬라이드 수:** ${slides}장
**키워드:** ${keywordsStr}

## 각 슬라이드 형식
[슬라이드 N]
제목: (짧고 임팩트 있게)
내용: (핵심 메시지 1~2문장)
비주얼 제안: (어떤 이미지/아이콘)

## 주의사항
- 한 슬라이드에 텍스트 30자 이내
- 숫자/데이터 활용
`;
    }

    generateResearchPrompt({ category, count = 10 }) {
        return `당신은 네이버 블로그 트렌드 분석 전문가입니다.

**카테고리:** ${category}
**추천 주제 수:** ${count}개

각 주제별로:
- **주제**: [주제명]
- **핵심 키워드**: [키워드 3~5개]
- **추천 제목 예시**: [제목]
- **추천 이유**: [한 줄]
`;
    }

    /**
     * 카테고리별 필드 정의 반환
     */
    getCategoryFields(category) {
        return CATEGORY_FIELDS[category] || null;
    }

    getAllCategoryFields() {
        return CATEGORY_FIELDS;
    }

    getAvailableTones() {
        return TONE_TEMPLATES;
    }

    getAvailableStyles() {
        return STYLE_TEMPLATES;
    }
}

module.exports = { PromptEngine, CATEGORY_FIELDS };
