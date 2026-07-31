/**
 * 서식 파서 - AI 생성 글의 마킹을 파싱하여 네이버 에디터에 서식 적용
 * 
 * 마킹 규칙:
 *   **텍스트**     → 굵게 (Bold)
 *   __텍스트__     → 밑줄 (Underline)
 *   {{빨강}}텍스트{{/빨강}} → 색상 강조
 *   {{파랑}}텍스트{{/파랑}} → 색상 강조
 *   [사진]         → 사진 삽입 위치
 *   [사진: 설명]   → 사진 삽입 위치 (설명 포함)
 *   [이모티콘]     → 이모티콘 삽입 위치
 *   [네이버지도: 장소명] → 네이버 지도 삽입
 */

class FormatParser {
    constructor() {
        // 네이버 에디터 색상 코드
        this.colorMap = {
            '빨강': '#ff0000',
            '빨간색': '#ff0000',
            '파랑': '#0000ff',
            '파란색': '#0000ff',
            '초록': '#009a00',
            '주황': '#ff6600',
            '보라': '#9900ff',
            '분홍': '#ff00ff',
            '회색': '#999999'
        };
    }

    /**
     * 글 내용을 파싱하여 서식 명령 목록 생성
     * Playwright가 이 목록을 순서대로 실행
     */
    parse(content) {
        const commands = [];
        const lines = content.split('\n');

        for (const line of lines) {
            if (line.trim() === '') {
                commands.push({ type: 'newline' });
                continue;
            }

            // 사진 마커
            const photoMatch = line.match(/^\[사진(?::\s*(.+?))?\]$/);
            if (photoMatch) {
                commands.push({ type: 'photo', description: photoMatch[1] || '' });
                continue;
            }

            // 이모티콘 마커
            if (line.trim() === '[이모티콘]') {
                commands.push({ type: 'emoticon' });
                continue;
            }

            // 구분선 마커
            if (line.trim() === '[구분선]') {
                commands.push({ type: 'divider' });
                continue;
            }

            // 네이버 지도 마커
            const mapMatch = line.match(/^\[네이버지도:\s*(.+?)\]$/);
            if (mapMatch) {
                commands.push({ type: 'map', place: mapMatch[1] });
                continue;
            }

            // 인라인 서식이 있는 텍스트 파싱
            const segments = this._parseInlineFormats(line);
            commands.push({ type: 'text', segments });
        }

        return commands;
    }

    /**
     * 인라인 서식 파싱 (굵게, 밑줄, 색상)
     */
    _parseInlineFormats(text) {
        const segments = [];
        let remaining = text;

        while (remaining.length > 0) {
            // 굵게 **텍스트**
            const boldMatch = remaining.match(/^(.*?)\*\*(.+?)\*\*/);
            if (boldMatch) {
                if (boldMatch[1]) segments.push({ text: boldMatch[1], format: null });
                segments.push({ text: boldMatch[2], format: 'bold' });
                remaining = remaining.slice(boldMatch[0].length);
                continue;
            }

            // 밑줄 __텍스트__
            const underMatch = remaining.match(/^(.*?)__(.+?)__/);
            if (underMatch) {
                if (underMatch[1]) segments.push({ text: underMatch[1], format: null });
                segments.push({ text: underMatch[2], format: 'underline' });
                remaining = remaining.slice(underMatch[0].length);
                continue;
            }

            // 색상 {{색상}}텍스트{{/색상}}
            const colorMatch = remaining.match(/^(.*?)\{\{(\S+?)\}\}(.+?)\{\{\/\2\}\}/);
            if (colorMatch) {
                if (colorMatch[1]) segments.push({ text: colorMatch[1], format: null });
                const colorName = colorMatch[2];
                const colorCode = this.colorMap[colorName] || colorName;
                segments.push({ text: colorMatch[3], format: 'color', color: colorCode });
                remaining = remaining.slice(colorMatch[0].length);
                continue;
            }

            // 나머지는 일반 텍스트
            segments.push({ text: remaining, format: null });
            break;
        }

        return segments;
    }

    /**
     * 프롬프트에 추가할 서식 마킹 가이드
     */
    getFormattingGuide(sectionDivider = 'emoticon') {
        const dividerGuide = sectionDivider === 'line'
            ? '- [구분선]: 소제목 사이에 네이버 블로그 구분선 삽입'
            : sectionDivider === 'emoticon'
                ? '- [이모티콘]: 소제목 사이에 이모티콘(스티커) 삽입'
                : '- (소제목 사이 구분 없음)';

        return `
## 서식 마킹 규칙 (반드시 따라주세요)

글 작성 시 아래 마킹을 사용하여 서식을 지정해주세요:

- **굵게 표시**: **텍스트** (가게명, 메뉴명, 핵심 정보에 사용)
- __밑줄 표시__: __텍스트__ (강조하고 싶은 핵심 문장에 사용)
- {{빨강}}색상 강조{{/빨강}}: 가격, 할인 정보 등에 사용
- {{파랑}}색상 강조{{/파랑}}: 위치, 시간 정보 등에 사용
- [사진: 설명]: 사진 삽입 위치 (소제목 아래, 메뉴 설명 후 등)
${dividerGuide}
- [네이버지도: 장소명]: 네이버 지도 삽입 위치

### 서식 사용 규칙
1. 가게명/장소명은 항상 **굵게**
2. 추천 메뉴, 핵심 포인트는 __밑줄__
3. 가격은 {{빨강}}빨간색{{/빨강}}
4. 위치/주소는 {{파랑}}파란색{{/파랑}}
5. [사진] 은 메뉴 설명 후, 분위기 소개 후 등 2~4곳에 배치
6. ${sectionDivider === 'line' ? '[구분선]은 각 소제목 사이에 1개씩 배치' : sectionDivider === 'emoticon' ? '[이모티콘]은 서론 끝, 각 소제목 사이, 결론 앞에 배치' : '소제목 사이 구분 없이 자연스럽게 이어서 작성'}
`;
    }
}

module.exports = { FormatParser };
