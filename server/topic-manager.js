/**
 * 주제 관리 모듈 - 카테고리별 주제 자동 생성 및 관리
 */

const fs = require('fs');
const path = require('path');

const DATA_DIR = path.join(__dirname, '..', 'data');
const TOPICS_FILE = path.join(DATA_DIR, 'topics.json');

// 카테고리별 시드 데이터 (초기 주제 풀)
const CATEGORY_SEEDS = {
    '맛집': {
        keywords: ['맛집', '맛집추천', '존맛', '먹방', '메뉴추천', '솔직후기', '웨이팅'],
        subtopics: [
            '지역별 맛집', '메뉴별 맛집', '분위기별 맛집', '가성비 맛집',
            '데이트 맛집', '혼밥 맛집', '신상 맛집', '숨은 맛집'
        ],
        templates: [
            '{지역} {음식종류} 맛집 추천 BEST {숫자}',
            '{지역} 데이트 코스 맛집 솔직 후기',
            '{음식종류} 맛집 비교 리뷰 (A vs B)',
            '직장인 점심 {음식종류} 맛집 추천',
            '{지역} 숨은 맛집 발견! 웨이팅 없는 곳',
            '{계절} 제철 음식 맛집 TOP {숫자}',
            '혼밥하기 좋은 {지역} {음식종류} 맛집',
            '{지역} 브런치 카페 맛집 분위기 좋은 곳',
            '가성비 미쳤다! {지역} 만원 이하 맛집',
            '{음식종류} 프랜차이즈 vs 개인 맛집 비교'
        ],
        variables: {
            '지역': ['강남', '홍대', '이태원', '성수', '여의도', '합정', '을지로', '종로', '건대', '신촌', '부산', '제주', '대구', '인천', '수원'],
            '음식종류': ['파스타', '스시', '삼겹살', '치킨', '중식', '베트남 쌀국수', '햄버거', '떡볶이', '국밥', '칼국수', '곱창', '양꼬치', '카레', '덮밥', '초밥'],
            '숫자': ['3', '5', '7', '10'],
            '계절': ['봄', '여름', '가을', '겨울']
        }
    },
    '여행': {
        keywords: ['여행', '국내여행', '해외여행', '여행코스', '숙소추천', '관광지', '핫플'],
        subtopics: [
            '국내 여행지', '해외 여행지', '당일치기', '1박2일', '가족여행',
            '혼자여행', '커플여행', '드라이브코스'
        ],
        templates: [
            '{지역} {기간} 여행 코스 완벽 정리',
            '{지역} 가볼만한 곳 BEST {숫자}',
            '{계절} {지역} 여행 추천 (feat. {테마})',
            '{지역} 숙소 추천 - 가성비/뷰 좋은 곳',
            '{지역} 맛집+관광 하루 코스 완벽 가이드',
            '당일치기 {지역} 여행 코스 추천',
            '{지역} 여행 경비 총정리 ({기간} 기준)',
            '{지역} 인스타 핫플 스팟 TOP {숫자}',
            '{계절}에 가기 좋은 국내 여행지 {숫자}곳',
            '{지역} 드라이브 코스 추천 (경치 맛집)'
        ],
        variables: {
            '지역': ['제주도', '부산', '강릉', '경주', '여수', '속초', '전주', '통영', '담양', '양양', '가평', '춘천', '포항', '거제도', '울릉도'],
            '기간': ['당일치기', '1박2일', '2박3일', '3박4일'],
            '숫자': ['3', '5', '7', '10'],
            '계절': ['봄', '여름', '가을', '겨울'],
            '테마': ['힐링', '액티비티', '먹방', '사진', '자연', '역사', '카페투어']
        }
    },
    '일상': {
        keywords: ['일상', '직장인', '자취', '습관', '하루루틴', '꿀팁', '생활'],
        subtopics: [
            '직장인 일상', '자취 꿀팁', '아침 루틴', '취미생활',
            '재테크', '건강관리', '인간관계', '자기계발'
        ],
        templates: [
            '직장인 {활동} 루틴 공유 (feat. 현실)',
            '자취 {주제} 꿀팁 {숫자}가지',
            '{나이}대 {주제} 시작한 후기',
            '퇴근 후 {활동} 하는 법 (현실 가능)',
            '{주제} 시작하고 달라진 점 {숫자}가지',
            '월급 {금액}만원 {주제} 후기',
            '요즘 빠진 {취미} 리얼 후기',
            '아침 {시간} 기상 {기간} 해본 결과',
            '{계절} 홈카페 레시피 {숫자}가지',
            '혼자 사는 {주제} 필수템 추천'
        ],
        variables: {
            '활동': ['운동', '독서', '요리', '영어공부', '코딩', '명상', '산책', '블로그'],
            '주제': ['자취요리', '홈트', '인테리어', '절약', '다이어트', '미라클모닝', '독서', '투자'],
            '나이': ['20', '30', '40'],
            '숫자': ['3', '5', '7', '10'],
            '취미': ['등산', '러닝', '필라테스', '캘리그라피', '베이킹', '독서', '게임', '카메라'],
            '금액': ['200', '250', '300', '350'],
            '시간': ['5시', '6시', '7시'],
            '기간': ['한달', '3개월', '6개월', '1년'],
            '계절': ['봄', '여름', '가을', '겨울']
        }
    },
    '정보': {
        keywords: ['정보', '꿀팁', '방법', '비교', '추천', '가이드', '총정리'],
        subtopics: [
            'IT/디지털', '생활정보', '건강', '재테크', '교육',
            '부동산', '쇼핑', '앱추천'
        ],
        templates: [
            '{주제} 총정리 (2024년 최신)',
            '{주제} 비교 분석 - 뭐가 더 좋을까?',
            '{주제} 초보 가이드 (A to Z)',
            '{주제} 하는 법 완벽 정리',
            '모르면 손해! {주제} 꿀팁 {숫자}가지',
            '{주제} 장단점 솔직 비교',
            '{주제} 추천 BEST {숫자} (가성비 기준)',
            '{주제} 신청 방법 + 조건 총정리',
            '2024 {주제} 트렌드 분석',
            '{주제} 실패하지 않는 방법 {숫자}가지'
        ],
        variables: {
            '주제': ['아이폰 vs 갤럭시', '통신사 요금제', '신용카드', '적금', '보험', '노트북', '공기청정기', 'ChatGPT 활용', '부업', '정부지원금', '전세 vs 월세', '인터넷 설치', '구독 서비스', '운전면허', '자격증'],
            '숫자': ['3', '5', '7', '10']
        }
    }
};

class TopicManager {
    constructor() {
        this._ensureDir();
        this.data = this._load();
    }

    _ensureDir() {
        if (!fs.existsSync(DATA_DIR)) {
            fs.mkdirSync(DATA_DIR, { recursive: true });
        }
    }

    _load() {
        try {
            if (fs.existsSync(TOPICS_FILE)) {
                return JSON.parse(fs.readFileSync(TOPICS_FILE, 'utf-8'));
            }
        } catch (e) { /* ignore */ }

        // 초기 데이터 생성
        const initial = {
            categories: Object.keys(CATEGORY_SEEDS),
            current_index: {},  // 카테고리별 현재 인덱스
            generated_topics: [], // 생성된 주제 히스토리
            custom_topics: {},  // 사용자 추가 주제
            rotation: 'sequential', // sequential | random
            last_category: null,
            total_generated: 0
        };

        for (const cat of Object.keys(CATEGORY_SEEDS)) {
            initial.current_index[cat] = 0;
            initial.custom_topics[cat] = [];
        }

        this._save(initial);
        return initial;
    }

    _save(data) {
        fs.writeFileSync(TOPICS_FILE, JSON.stringify(data || this.data, null, 2), 'utf-8');
    }

    /**
     * 다음 주제 자동 생성 (카테고리 로테이션)
     */
    getNextTopic() {
        const categories = this.data.categories;
        if (categories.length === 0) return null;

        // 다음 카테고리 선택 (순서대로 돌아가기)
        let categoryIndex = 0;
        if (this.data.last_category) {
            categoryIndex = (categories.indexOf(this.data.last_category) + 1) % categories.length;
        }
        const category = categories[categoryIndex];

        // 주제 생성
        const topic = this._generateTopicForCategory(category);

        // 상태 업데이트
        this.data.last_category = category;
        this.data.total_generated++;
        this.data.generated_topics.push({
            category,
            topic: topic.title,
            keywords: topic.keywords,
            generated_at: new Date().toISOString()
        });

        // 히스토리 500개 유지
        if (this.data.generated_topics.length > 500) {
            this.data.generated_topics = this.data.generated_topics.slice(-500);
        }

        this._save();
        return { category, ...topic };
    }

    /**
     * 특정 카테고리에서 주제 생성
     */
    getTopicForCategory(category) {
        const topic = this._generateTopicForCategory(category);

        this.data.total_generated++;
        this.data.generated_topics.push({
            category,
            topic: topic.title,
            keywords: topic.keywords,
            generated_at: new Date().toISOString()
        });
        this._save();

        return { category, ...topic };
    }

    /**
     * 여러 주제 한번에 생성
     */
    getBatchTopics(count = 10) {
        const topics = [];
        for (let i = 0; i < count; i++) {
            topics.push(this.getNextTopic());
        }
        return topics;
    }

    /**
     * 특정 카테고리의 주제 N개 생성
     */
    getCategoryTopics(category, count = 5) {
        const topics = [];
        for (let i = 0; i < count; i++) {
            topics.push(this.getTopicForCategory(category));
        }
        return topics;
    }

    /**
     * 카테고리 내부 주제 생성 로직
     */
    _generateTopicForCategory(category) {
        const seed = CATEGORY_SEEDS[category];
        if (!seed) {
            return { title: `${category} 관련 글`, keywords: [category] };
        }

        // 사용자 추가 주제가 있으면 우선
        const custom = this.data.custom_topics[category] || [];
        if (custom.length > 0) {
            const idx = this.data.current_index[category] || 0;
            if (idx < custom.length) {
                this.data.current_index[category] = idx + 1;
                return custom[idx];
            }
        }

        // 템플릿 기반 자동 생성
        const template = this._pickRandom(seed.templates);
        const title = this._fillTemplate(template, seed.variables);

        // 키워드 조합
        const baseKeywords = this._pickRandomN(seed.keywords, 3);
        const titleWords = title.replace(/[^가-힣a-zA-Z0-9\s]/g, '').split(/\s+/).filter(w => w.length >= 2);
        const keywords = [...new Set([...baseKeywords, ...titleWords.slice(0, 2)])].slice(0, 5);

        // 추천 톤/스타일
        const toneMap = {
            '맛집': '리뷰형',
            '여행': '친근한',
            '일상': '친근한',
            '정보': '정보전달형'
        };
        const styleMap = {
            '맛집': '리뷰형',
            '여행': '가이드형',
            '일상': '일상형',
            '정보': '정보전달형'
        };

        return {
            title,
            keywords,
            tone: toneMap[category] || '친근한',
            style: styleMap[category] || '정보전달형',
            subtopic: this._pickRandom(seed.subtopics)
        };
    }

    _fillTemplate(template, variables) {
        return template.replace(/\{([^}]+)\}/g, (match, key) => {
            const options = variables[key];
            if (options && options.length > 0) {
                return this._pickRandom(options);
            }
            return match;
        });
    }

    _pickRandom(arr) {
        return arr[Math.floor(Math.random() * arr.length)];
    }

    _pickRandomN(arr, n) {
        const shuffled = [...arr].sort(() => Math.random() - 0.5);
        return shuffled.slice(0, n);
    }

    // ===== 관리 API =====

    /**
     * 카테고리 목록 조회
     */
    getCategories() {
        return this.data.categories;
    }

    /**
     * 카테고리 추가
     */
    addCategory(category, keywords = [], templates = []) {
        if (!this.data.categories.includes(category)) {
            this.data.categories.push(category);
            this.data.current_index[category] = 0;
            this.data.custom_topics[category] = [];
        }

        // CATEGORY_SEEDS에 동적 추가
        if (!CATEGORY_SEEDS[category]) {
            CATEGORY_SEEDS[category] = {
                keywords: keywords.length > 0 ? keywords : [category],
                subtopics: [],
                templates: templates.length > 0 ? templates : [`${category} 관련 글`],
                variables: {}
            };
        }

        this._save();
    }

    /**
     * 카테고리 삭제
     */
    removeCategory(category) {
        this.data.categories = this.data.categories.filter(c => c !== category);
        delete this.data.current_index[category];
        delete this.data.custom_topics[category];
        this._save();
    }

    /**
     * 사용자 정의 주제 추가
     */
    addCustomTopic(category, topic) {
        if (!this.data.custom_topics[category]) {
            this.data.custom_topics[category] = [];
        }
        this.data.custom_topics[category].push(topic);
        this._save();
    }

    /**
     * 생성 히스토리 조회
     */
    getHistory(count = 50) {
        return this.data.generated_topics.slice(-count);
    }

    /**
     * 통계
     */
    getStats() {
        const history = this.data.generated_topics;
        const categoryCounts = {};
        for (const cat of this.data.categories) {
            categoryCounts[cat] = history.filter(h => h.category === cat).length;
        }
        return {
            total_generated: this.data.total_generated,
            categories: this.data.categories,
            category_counts: categoryCounts,
            last_category: this.data.last_category
        };
    }

    /**
     * 시드 정보 조회
     */
    getSeedInfo(category) {
        return CATEGORY_SEEDS[category] || null;
    }

    /**
     * 전체 시드 데이터
     */
    getAllSeeds() {
        return CATEGORY_SEEDS;
    }
}

module.exports = { TopicManager };
