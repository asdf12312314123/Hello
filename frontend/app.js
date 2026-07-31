/**
 * N자동화 v1.0.0 - 프론트엔드
 */

const API_BASE = '';
let ws = null;
let logs = [];
let config = {};
let categoryFields = {};
let allTones = {};

// ===== 초기화 =====
document.addEventListener('DOMContentLoaded', async () => {
    await loadConfig();
    await loadCategoryFields();
    await loadTones();
    await loadLogs();
    connectWebSocket();
    updateStatusIndicators();
});

// ===== API =====
async function apiCall(endpoint, method = 'GET', body = null) {
    const options = { method, headers: { 'Content-Type': 'application/json' } };
    if (body) options.body = JSON.stringify(body);
    try {
        const res = await fetch(`${API_BASE}${endpoint}`, options);
        return await res.json();
    } catch (e) {
        addLogEntry({ level: '오류', message: `API 실패: ${e.message}` });
        return null;
    }
}

async function loadConfig() {
    config = await apiCall('/api/config') || {};
    updateStatusIndicators();
}

async function loadCategoryFields() {
    categoryFields = await apiCall('/api/categories/fields') || {};
}

async function loadTones() {
    allTones = await apiCall('/api/tones') || {};
}

// ===== 로그 =====
async function loadLogs() {
    const data = await apiCall('/api/logs');
    if (data?.logs) { logs = data.logs; renderLogs(); }
}

function addLogEntry(entry) {
    if (!entry.timestamp) entry.timestamp = new Date().toLocaleTimeString('ko-KR', { hour12: false });
    logs.push(entry);
    renderLogs();
}

function renderLogs() {
    const container = document.getElementById('logContainer');
    const countEl = document.getElementById('logCount');
    countEl.textContent = `${logs.length}건`;

    if (logs.length === 0) {
        container.innerHTML = '<div class="log-empty">자동화를 실행하면 로그가 표시됩니다.</div>';
        return;
    }
    container.innerHTML = logs.map(l => `
        <div class="log-entry">
            <span class="log-time">${l.timestamp}</span>
            <span class="log-level ${l.level}">${l.level}</span>
            <span class="log-message">${l.message}</span>
        </div>
    `).join('');
    if (document.getElementById('autoScroll').checked) container.scrollTop = container.scrollHeight;
}

function clearLogs() { logs = []; renderLogs(); apiCall('/api/logs', 'DELETE'); }

// ===== WebSocket =====
function connectWebSocket() {
    const protocol = location.protocol === 'https:' ? 'wss:' : 'ws:';
    try {
        ws = new WebSocket(`${protocol}//${location.host}/ws/logs`);
        ws.onopen = () => {
            document.getElementById('statusText').textContent = '연결됨';
            document.querySelector('.status-indicator .dot').style.background = 'var(--accent)';
        };
        ws.onmessage = (e) => { const d = JSON.parse(e.data); if (d.type === 'log') addLogEntry(d.data); };
        ws.onclose = () => {
            document.getElementById('statusText').textContent = '재연결...';
            setTimeout(connectWebSocket, 3000);
        };
        setInterval(() => { if (ws?.readyState === WebSocket.OPEN) ws.send('ping'); }, 30000);
    } catch (e) { /* ignore */ }
}

// ===== 상태 =====
function updateStatusIndicators() {
    const n = config.naver || {};
    const p = config.prompt || {};
    const s = config.schedule || {};

    if (n.username) { const el = document.getElementById('naverStatus'); el.textContent = `로그인: ${n.username}`; el.style.color = 'var(--accent)'; }
    if (n.blog_id) { const el = document.getElementById('blogStatus'); el.textContent = `${n.blog_id} / ${n.category || '카테고리 미설정'}`; el.style.color = 'var(--accent)'; }
    if (p.tone) { const el = document.getElementById('promptStatus'); el.textContent = `${p.tone} / ${p.style}`; el.style.color = 'var(--accent)'; }
    if (s.enabled) { const el = document.getElementById('scheduleStatus'); el.textContent = `${s.time} (${s.days?.join(', ')})`; el.style.color = 'var(--accent)'; }
}

// ===== 모달 =====
function openModal(type) {
    const overlay = document.getElementById('modalOverlay');
    const title = document.getElementById('modalTitle');
    const body = document.getElementById('modalBody');
    overlay.classList.add('active');

    switch (type) {
        case 'naverAccount': title.textContent = '네이버 계정 설정'; body.innerHTML = getNaverAccountForm(); break;
        case 'blogCategory': title.textContent = '블로그 · 카테고리'; body.innerHTML = getBlogCategoryForm(); break;
        case 'promptSettings': title.textContent = '프롬프트 설정'; body.innerHTML = getPromptSettingsForm(); break;
        case 'memoInput': title.textContent = '메모 입력 → 프롬프트 생성'; body.innerHTML = getMemoInputForm(); break;
        case 'sectionSettings': title.textContent = '섹션 구조 설정'; body.innerHTML = getSectionSettingsForm(); break;
        case 'scheduleSettings': title.textContent = '발행 시간 설정'; body.innerHTML = getScheduleForm(); break;
        case 'automationSettings': title.textContent = '자동화 설정'; body.innerHTML = getAutomationSettingsForm(); break;
        case 'runAutomation': title.textContent = '글 만들기 · 자동화 실행'; body.innerHTML = getRunAutomationForm(); break;
        case 'toneManager': title.textContent = '말투 관리'; body.innerHTML = getToneManagerForm(); break;
        case 'stickerManager': title.textContent = '스티커 관리'; body.innerHTML = getStickerForm(); loadStickerData(); break;
    }
}

function closeModal() { document.getElementById('modalOverlay').classList.remove('active'); }

// ===== 폼: 네이버 계정 =====
function getNaverAccountForm() {
    const n = config.naver || {};
    return `
        <div class="form-group"><label>네이버 아이디</label><input type="text" id="naverId" value="${n.username || ''}" placeholder="네이버 아이디"></div>
        <div class="form-group"><label>비밀번호</label><input type="password" id="naverPw" value="${n.password || ''}" placeholder="비밀번호"></div>
        <div class="form-group"><label>블로그 ID</label><input type="text" id="blogId" value="${n.blog_id || ''}" placeholder="blog.naver.com/여기"></div>
        <div class="form-group"><label>카테고리</label><input type="text" id="blogCategory" value="${n.category || ''}" placeholder="발행할 카테고리명"></div>
        <p class="hint">※ 로컬에만 저장됩니다</p>
        <button class="btn-primary" onclick="saveNaverAccount()">저장</button>
    `;
}

// ===== 폼: 블로그 =====
function getBlogCategoryForm() {
    const n = config.naver || {};
    return `
        <div class="form-group"><label>블로그 ID</label><input type="text" id="blogId" value="${n.blog_id || ''}" placeholder="blog.naver.com/여기"></div>
        <div class="form-group"><label>카테고리</label><input type="text" id="blogCategory" value="${n.category || ''}" placeholder="발행할 카테고리명"></div>
        <button class="btn-primary" onclick="saveBlogCategory()">저장</button>
    `;
}

// ===== 폼: 프롬프트 설정 =====
function getPromptSettingsForm() {
    const p = config.prompt || {};
    const tones = ['친근한', '전문적', '유머러스', '감성적', '리뷰형', '정보전달형'];
    const styles = ['정보전달형', '리뷰형', '일상형', '가이드형', '비교분석형', '트렌드형'];
    return `
        <div class="form-row">
            <div class="form-group"><label>톤/말투</label><select id="promptTone">${tones.map(t => `<option ${p.tone === t ? 'selected' : ''}>${t}</option>`).join('')}</select></div>
            <div class="form-group"><label>스타일</label><select id="promptStyle">${styles.map(s => `<option ${p.style === s ? 'selected' : ''}>${s}</option>`).join('')}</select></div>
        </div>
        <div class="form-row">
            <div class="form-group"><label>최소 글자수</label><input type="number" id="promptMinLen" value="${p.min_length || 1500}"></div>
            <div class="form-group"><label>최대 글자수</label><input type="number" id="promptMaxLen" value="${p.max_length || 3000}"></div>
        </div>
        <div class="form-group"><label>추가 지시사항</label><textarea id="promptCustom" placeholder="추가 지시...">${p.custom_instructions || ''}</textarea></div>
        <button class="btn-primary" onclick="savePromptSettings()">저장</button>
    `;
}

// ===== ★ 핵심: 카테고리별 메모 입력 폼 =====
function getMemoInputForm() {
    const categories = Object.keys(categoryFields);
    const toneOptions = Object.entries(allTones).map(([id, t]) =>
        `<option value="${id}">${t.name}</option>`
    ).join('');

    return `
        <div class="form-group">
            <label>카테고리 선택</label>
            <div class="category-tabs" id="categoryTabs">
                ${categories.map((cat, i) => `<button class="cat-tab ${i === 0 ? 'active' : ''}" onclick="switchCategory('${cat}')">${getCatEmoji(cat)} ${cat}</button>`).join('')}
            </div>
        </div>
        <div id="memoFieldsContainer">
            ${categories.length > 0 ? buildMemoFields(categories[0]) : '<p>카테고리 로드 실패</p>'}
        </div>
        <div class="form-group" style="margin-top:16px">
            <label>소제목 사이 구분 방식</label>
            <div class="category-tabs">
                <button class="cat-tab active" onclick="selectDivider(this,'emoticon')">😊 이모티콘</button>
                <button class="cat-tab" onclick="selectDivider(this,'line')">── 구분선</button>
                <button class="cat-tab" onclick="selectDivider(this,'none')">없음</button>
            </div>
            <input type="hidden" id="memo_sectionDivider" value="emoticon">
        </div>
        <div class="form-group" style="margin-top:16px">
            <label>말투 선택</label>
            <select id="memoToneSelect">
                <option value="">카테고리 기본값 사용</option>
                ${toneOptions}
            </select>
            <p class="hint" id="tonePreview"></p>
        </div>
        <div class="form-group">
            <label>사진</label>
            <p class="hint">photos/ 폴더에 사진을 넣어두면 글 중간에 자동 삽입됩니다.<br>
            AI가 [사진: 설명] 위치를 지정하면 순서대로 들어갑니다.</p>
        </div>
        <br>
        <button class="btn-primary" onclick="generateFromMemo()">프롬프트 생성</button>
        <button class="btn-secondary" style="width:100%; margin-top:8px" onclick="openModal('toneManager')">말투 관리 (추가/수정)</button>
        <div id="memoPromptResult"></div>
    `;
}

function getCatEmoji(cat) {
    const map = { '맛집': '🍜', '여행': '✈️', '일상': '📝', '정보': '💡' };
    return map[cat] || '📌';
}

function switchCategory(cat) {
    document.querySelectorAll('.cat-tab').forEach(t => t.classList.remove('active'));
    event.target.classList.add('active');
    document.getElementById('memoFieldsContainer').innerHTML = buildMemoFields(cat);
    document.getElementById('memoPromptResult').innerHTML = '';
}

function buildMemoFields(category) {
    const catConfig = categoryFields[category];
    if (!catConfig) return '<p>필드 없음</p>';

    return catConfig.fields.map(f => {
        if (f.type === 'textarea') {
            return `<div class="form-group"><label>${f.label}${f.required ? ' *' : ''}</label><textarea id="memo_${f.id}" placeholder="${f.placeholder || ''}" class="memo-field" data-field="${f.id}"></textarea></div>`;
        }
        return `<div class="form-group"><label>${f.label}${f.required ? ' *' : ''}</label><input type="text" id="memo_${f.id}" placeholder="${f.placeholder || ''}" class="memo-field" data-field="${f.id}"></div>`;
    }).join('') + `<input type="hidden" id="memo_category" value="${category}">`;
}

async function generateFromMemo() {
    const category = document.getElementById('memo_category').value;
    const fields = document.querySelectorAll('.memo-field');
    const memoData = {};
    fields.forEach(f => { if (f.value.trim()) memoData[f.dataset.field] = f.value.trim(); });

    if (Object.keys(memoData).length === 0) return alert('최소 1개 이상 입력하세요');

    // 구분 방식 추가
    memoData._sectionDivider = document.getElementById('memo_sectionDivider')?.value || 'emoticon';

    const p = config.prompt || {};
    const toneId = document.getElementById('memoToneSelect')?.value || '';

    const result = await apiCall('/api/prompt/from-memo', 'POST', {
        category,
        memoData,
        toneId,
        tone: toneId ? null : p.tone,
        style: null,
        min_length: p.min_length || 1500,
        max_length: p.max_length || 3000
    });

    if (result?.prompt) {
        document.getElementById('memoPromptResult').innerHTML = `
            <div class="prompt-output">${escapeHtml(result.prompt)}</div>
            <button class="copy-btn" onclick="copyText(this)">📋 프롬프트 복사</button>
            <p class="hint" style="margin-top:8px">이 프롬프트를 Claude/ChatGPT에 붙여넣으면 블로그 글이 생성됩니다.<br>
            생성된 글에는 서식 마킹(**굵게**, __밑줄__, {{빨강}}색상{{/빨강}})이 포함됩니다.<br>
            7번 자동화 실행 시 서식이 자동 적용됩니다.</p>
        `;
        document.getElementById('memoPromptResult').dataset.prompt = result.prompt;
    }
}

// ===== 폼: 스케줄 =====
function getScheduleForm() {
    const s = config.schedule || {};
    const days = ['mon','tue','wed','thu','fri','sat','sun'];
    const names = {mon:'월',tue:'화',wed:'수',thu:'목',fri:'금',sat:'토',sun:'일'};
    return `
        <div class="form-group"><label>발행 시간</label><input type="time" id="schedTime" value="${s.time || '09:00'}"></div>
        <div class="form-group"><label>발행 요일</label><div class="checkbox-group">${days.map(d => `<label><input type="checkbox" value="${d}" ${(s.days||[]).includes(d)?'checked':''} class="schedDay">${names[d]}</label>`).join('')}</div></div>
        <div class="form-group"><label><input type="checkbox" id="schedEnabled" ${s.enabled?'checked':''}> 스케줄 활성화</label></div>
        <button class="btn-primary" onclick="saveSchedule()">저장</button>
    `;
}

// ===== 폼: 자동화 설정 =====
function getAutomationSettingsForm() {
    const a = config.automation || {};
    return `
        <div class="form-group"><label><input type="checkbox" id="autoHeadless" ${a.headless?'checked':''}> 백그라운드 모드 (브라우저 안 보임)</label></div>
        <div class="form-group"><label><input type="checkbox" id="autoSave" ${a.auto_save!==false?'checked':''}> 자동 임시저장</label></div>
        <div class="form-group"><label><input type="checkbox" id="autoPublish" ${a.auto_publish?'checked':''}> 자동 발행</label></div>
        <div class="form-group"><label>딜레이 (초)</label><input type="number" id="autoDelay" value="${a.delay_between_actions||1.5}" step="0.5" min="0.5"><p class="hint">너무 빠르면 차단 위험</p></div>
        <button class="btn-primary" onclick="saveAutomationSettings()">저장</button>
    `;
}

// ===== ★ 핵심: 자동화 실행 =====
function getRunAutomationForm() {
    return `
        <div class="form-group"><label>글 제목</label><input type="text" id="runTitle" placeholder="블로그 글 제목"></div>
        <div class="form-group"><label>글 내용</label><textarea id="runContent" placeholder="AI가 생성한 글을 붙여넣기" style="min-height:200px"></textarea></div>
        <div class="form-group"><label>네이버 지도 첨부할 장소 (쉼표 구분)</label><input type="text" id="runMapPlaces" placeholder="예: 성수 파스타집, 강남역 카페"></div>
        <div class="form-group"><label>카테고리</label><input type="text" id="runCategory" value="${config.naver?.category||''}" placeholder="카테고리"></div>
        <div class="form-group"><label>태그 (쉼표 구분)</label><input type="text" id="runTags" placeholder="태그1, 태그2"></div>
        <button class="btn-primary" onclick="runAutomation()">🚀 자동화 실행 (네이버 블로그에 글 작성)</button>
        <p class="hint" style="margin-top:8px">Playwright가 네이버 블로그 에디터를 열고 → 제목/본문 입력 → 네이버 지도 첨부 → 임시저장합니다</p>
    `;
}

// ===== 액션 =====
async function saveNaverAccount() {
    await apiCall('/api/config/naver', 'POST', {
        username: document.getElementById('naverId').value,
        password: document.getElementById('naverPw').value,
        blog_id: document.getElementById('blogId').value,
        category: document.getElementById('blogCategory').value
    });
    await loadConfig(); closeModal();
}

async function testLogin() {
    addLogEntry({ level: '정보', message: '로그인 테스트...' });
    const r = await apiCall('/api/automation/login-test', 'POST');
    addLogEntry({ level: r?.logged_in ? '완료' : '오류', message: r?.logged_in ? '로그인 성공!' : '로그인 실패' });
}

async function saveBlogCategory() {
    await apiCall('/api/config/naver', 'POST', {
        username: config.naver?.username || '', password: '********',
        blog_id: document.getElementById('blogId').value,
        category: document.getElementById('blogCategory').value
    });
    await loadConfig(); closeModal();
}

async function savePromptSettings() {
    await apiCall('/api/config/prompt', 'POST', {
        tone: document.getElementById('promptTone').value,
        style: document.getElementById('promptStyle').value,
        min_length: parseInt(document.getElementById('promptMinLen').value),
        max_length: parseInt(document.getElementById('promptMaxLen').value),
        custom_instructions: document.getElementById('promptCustom').value,
        include_subheadings: true, include_conclusion: true, seo_keywords: []
    });
    await loadConfig(); closeModal();
}

async function saveSchedule() {
    const days = Array.from(document.querySelectorAll('.schedDay:checked')).map(el => el.value);
    await apiCall('/api/config/schedule', 'POST', {
        enabled: document.getElementById('schedEnabled').checked,
        time: document.getElementById('schedTime').value,
        days, interval_minutes: 0
    });
    await loadConfig(); closeModal();
}

async function saveAutomationSettings() {
    await apiCall('/api/config/automation', 'POST', {
        headless: document.getElementById('autoHeadless').checked,
        auto_save: document.getElementById('autoSave').checked,
        auto_publish: document.getElementById('autoPublish').checked,
        delay_between_actions: parseFloat(document.getElementById('autoDelay').value)
    });
    await loadConfig(); closeModal();
}

async function runAutomation() {
    const title = document.getElementById('runTitle').value;
    const content = document.getElementById('runContent').value;
    if (!title || !content) return alert('제목과 내용을 입력하세요');

    const mapPlaces = document.getElementById('runMapPlaces').value.split(',').map(s => s.trim()).filter(s => s);
    const tags = document.getElementById('runTags').value.split(',').map(s => s.trim()).filter(s => s);

    addLogEntry({ level: '정보', message: `자동화 시작 - ${title}` });
    if (mapPlaces.length > 0) addLogEntry({ level: '정보', message: `네이버 지도 첨부: ${mapPlaces.join(', ')}` });

    const result = await apiCall('/api/automation/run', 'POST', {
        title, content,
        category: document.getElementById('runCategory').value,
        tags, mapPlaces
    });

    if (result?.status === 'ok') {
        addLogEntry({ level: '완료', message: '자동화 완료!' });
    } else {
        addLogEntry({ level: '오류', message: `실패: ${result?.error || '알 수 없는 오류'}` });
    }
}

// ===== 유틸 =====
function escapeHtml(text) { const d = document.createElement('div'); d.textContent = text; return d.innerHTML; }

function copyText(btn) {
    const text = btn.parentElement.dataset.prompt || btn.previousElementSibling.textContent;
    navigator.clipboard.writeText(text).then(() => {
        btn.innerHTML = '✅ 복사됨!';
        setTimeout(() => btn.innerHTML = '📋 프롬프트 복사', 2000);
    }).catch(() => {
        const ta = document.createElement('textarea');
        ta.value = text; document.body.appendChild(ta); ta.select();
        document.execCommand('copy'); document.body.removeChild(ta);
    });
}



// ===== 말투 관리 =====
function getToneManagerForm() {
    const tones = allTones;
    const list = Object.entries(tones).map(([id, t]) => `
        <div class="tone-item">
            <div class="tone-info">
                <strong>${t.name}</strong>
                <p class="hint">${t.description || ''}</p>
                <p class="tone-example">"${(t.example || '').slice(0, 60)}${(t.example||'').length > 60 ? '...' : ''}"</p>
            </div>
            ${id.startsWith('custom_') ? `<button class="btn-small" onclick="deleteCustomTone('${id}')">삭제</button>` : '<span class="hint">프리셋</span>'}
        </div>
    `).join('');

    return `
        <h3 style="margin-bottom:12px">현재 말투 목록</h3>
        <div class="tone-list">${list}</div>
        <hr style="border-color: var(--border); margin: 20px 0">
        <h3 style="margin-bottom:12px">새 말투 추가</h3>
        <div class="form-group"><label>말투 이름</label><input type="text" id="newToneName" placeholder="예: 내 말투"></div>
        <div class="form-group"><label>설명</label><input type="text" id="newToneDesc" placeholder="예: 반말+이모지 많이"></div>
        <div class="form-group"><label>예시 글 (이 스타일로 AI가 작성)</label><textarea id="newToneExample" placeholder="예시 글을 붙여넣으세요. AI가 이 말투를 그대로 따라합니다."></textarea></div>
        <button class="btn-primary" onclick="addCustomTone()">말투 추가</button>
    `;
}

async function addCustomTone() {
    const name = document.getElementById('newToneName').value;
    const description = document.getElementById('newToneDesc').value;
    const example = document.getElementById('newToneExample').value;
    if (!name || !example) return alert('이름과 예시를 입력하세요');

    const promptInstruction = `다음 예시와 완전히 동일한 말투/톤/어미/표현으로 작성해주세요:\n\n"""${example}"""\n\n위 예시의 말투, 어미, 표현 방식, 이모지 사용법을 정확히 따라서 작성.`;

    await apiCall('/api/tones/custom', 'POST', { name, description, example, prompt_instruction: promptInstruction });
    await loadTones();
    openModal('toneManager');
}

async function deleteCustomTone(id) {
    await apiCall(`/api/tones/custom/${id}`, 'DELETE');
    await loadTones();
    openModal('toneManager');
}



// ===== 구분선/이모티콘 선택 =====
function selectDivider(btn, value) {
    btn.parentElement.querySelectorAll('.cat-tab').forEach(t => t.classList.remove('active'));
    btn.classList.add('active');
    document.getElementById('memo_sectionDivider').value = value;
}



// ===== 섹션 구조 설정 =====
let allSections = {};

async function loadSections() {
    allSections = await apiCall('/api/sections') || {};
}

function getSectionSettingsForm() {
    const categories = Object.keys(categoryFields);
    return `
        <div class="form-group">
            <label>카테고리 선택</label>
            <div class="category-tabs">
                ${categories.map((cat, i) => `<button class="cat-tab ${i === 0 ? 'active' : ''}" onclick="switchSectionCategory('${cat}', this)">${getCatEmoji(cat)} ${cat}</button>`).join('')}
            </div>
        </div>
        <div id="sectionListContainer"></div>
        <hr style="border-color:var(--border);margin:16px 0">
        <h4>섹션 추가</h4>
        <div class="form-row">
            <div class="form-group"><label>섹션 제목</label><input type="text" id="newSectionTitle" placeholder="예: 주차 정보"></div>
            <div class="form-group"><label>설명</label><input type="text" id="newSectionDesc" placeholder="예: 주차 가능 여부, 팁"></div>
        </div>
        <div class="checkbox-group" style="margin-bottom:12px">
            <label><input type="checkbox" id="newSecPhoto"> 사진</label>
            <label><input type="checkbox" id="newSecMap"> 지도</label>
            <label><input type="checkbox" id="newSecEmo"> 이모티콘</label>
        </div>
        <button class="btn-secondary" style="width:100%" onclick="addNewSection()">+ 섹션 추가</button>
    `;
}

async function switchSectionCategory(cat, btn) {
    if (btn) { btn.parentElement.querySelectorAll('.cat-tab').forEach(t => t.classList.remove('active')); btn.classList.add('active'); }
    const sections = await apiCall(`/api/sections/${encodeURIComponent(cat)}`);
    document.getElementById('sectionListContainer').innerHTML = renderSectionList(cat, sections);
    document.getElementById('sectionListContainer').dataset.category = cat;
}

function renderSectionList(category, sections) {
    if (!sections || sections.length === 0) return '<p class="hint">섹션 없음</p>';
    return `<div class="section-list">${sections.map((s, i) => `
        <div class="section-item">
            <span class="section-num">${i + 1}</span>
            <div class="section-info">
                <strong>${s.title}</strong>
                <p class="hint">${s.description || ''}</p>
                <div class="section-badges">
                    ${s.hasPhoto ? '<span class="badge">📷 사진</span>' : ''}
                    ${s.hasMap ? '<span class="badge">📍 지도</span>' : ''}
                    ${s.hasEmoticon ? '<span class="badge">😊 이모티콘</span>' : ''}
                </div>
            </div>
            <div class="section-actions">
                ${i > 0 ? `<button class="btn-small" onclick="moveSectionUp('${category}',${i})">↑</button>` : ''}
                ${i < sections.length - 1 ? `<button class="btn-small" onclick="moveSectionDown('${category}',${i})">↓</button>` : ''}
                <button class="btn-small" onclick="removeSection('${category}','${s.id}')">×</button>
            </div>
        </div>
    `).join('')}</div>
    <button class="btn-secondary" style="width:100%;margin-top:8px" onclick="resetSections('${category}')">기본값으로 리셋</button>`;
}

async function addNewSection() {
    const cat = document.getElementById('sectionListContainer').dataset.category;
    if (!cat) return alert('카테고리를 먼저 선택하세요');
    const title = document.getElementById('newSectionTitle').value;
    if (!title) return alert('섹션 제목을 입력하세요');

    const sections = await apiCall(`/api/sections/${encodeURIComponent(cat)}`);
    sections.push({
        id: 'custom_' + Date.now(),
        title,
        description: document.getElementById('newSectionDesc').value,
        hasPhoto: document.getElementById('newSecPhoto').checked,
        hasMap: document.getElementById('newSecMap').checked,
        hasEmoticon: document.getElementById('newSecEmo').checked
    });

    await apiCall(`/api/sections/${encodeURIComponent(cat)}`, 'POST', { sections });
    switchSectionCategory(cat, null);
    document.getElementById('newSectionTitle').value = '';
    document.getElementById('newSectionDesc').value = '';
}

async function removeSection(cat, sectionId) {
    let sections = await apiCall(`/api/sections/${encodeURIComponent(cat)}`);
    sections = sections.filter(s => s.id !== sectionId);
    await apiCall(`/api/sections/${encodeURIComponent(cat)}`, 'POST', { sections });
    switchSectionCategory(cat, null);
}

async function moveSectionUp(cat, idx) {
    let sections = await apiCall(`/api/sections/${encodeURIComponent(cat)}`);
    if (idx <= 0) return;
    [sections[idx - 1], sections[idx]] = [sections[idx], sections[idx - 1]];
    await apiCall(`/api/sections/${encodeURIComponent(cat)}`, 'POST', { sections });
    switchSectionCategory(cat, null);
}

async function moveSectionDown(cat, idx) {
    let sections = await apiCall(`/api/sections/${encodeURIComponent(cat)}`);
    if (idx >= sections.length - 1) return;
    [sections[idx + 1], sections[idx]] = [sections[idx], sections[idx + 1]];
    await apiCall(`/api/sections/${encodeURIComponent(cat)}`, 'POST', { sections });
    switchSectionCategory(cat, null);
}

async function resetSections(cat) {
    await apiCall('/api/sections/reset', 'POST', { category: cat });
    switchSectionCategory(cat, null);
}

// 섹션 모달 열릴 때 첫 카테고리 로드
const origOpenModal = openModal;
openModal = function(type) {
    origOpenModal(type);
    if (type === 'sectionSettings') {
        const cats = Object.keys(categoryFields);
        if (cats.length > 0) setTimeout(() => switchSectionCategory(cats[0], null), 100);
    }
};



// ===== 스티커 관리 =====
function getStickerForm() {
    return `
        <div id="stickerContent">
            <p class="hint">네이버에 로그인된 상태에서 보유 스티커팩을 불러옵니다.</p>
            <button class="btn-primary" onclick="fetchStickers()">스티커팩 불러오기 (Playwright 실행)</button>
            <div id="stickerList" style="margin-top:16px"></div>
        </div>
    `;
}

async function fetchStickers() {
    const btn = document.querySelector('#stickerContent .btn-primary');
    btn.textContent = '불러오는 중... (네이버 로그인 + 에디터 열기)';
    btn.disabled = true;

    addLogEntry({ level: '정보', message: '스티커팩 불러오기 시작...' });
    const result = await apiCall('/api/stickers/fetch', 'POST');

    btn.textContent = '스티커팩 불러오기';
    btn.disabled = false;

    if (result?.status === 'ok' && result.packs) {
        renderStickerPacks(result.packs);
        addLogEntry({ level: '완료', message: `스티커팩 ${result.packs.length}개 로드 완료` });
    } else {
        document.getElementById('stickerList').innerHTML = `<p style="color:var(--danger)">실패: ${result?.error || '알 수 없는 오류'}</p>`;
    }
}

async function loadStickerData() {
    const data = await apiCall('/api/stickers');
    if (data?.packs?.length > 0) {
        renderStickerPacks(data.packs, data.selected?.id);
    }
}

function renderStickerPacks(packs, selectedId) {
    if (!packs || packs.length === 0) {
        document.getElementById('stickerList').innerHTML = '<p class="hint">불러온 스티커팩이 없습니다</p>';
        return;
    }

    document.getElementById('stickerList').innerHTML = `
        <h4>보유 스티커팩 (${packs.length}개)</h4>
        <div class="sticker-packs">
            ${packs.map(p => `
                <div class="sticker-pack ${p.id === selectedId ? 'selected' : ''}" onclick="selectStickerPack('${p.id}')">
                    ${p.thumbnail ? `<img src="${p.thumbnail}" class="sticker-thumb">` : '<div class="sticker-thumb-placeholder">📦</div>'}
                    <div class="sticker-pack-info">
                        <strong>${p.name}</strong>
                        <span class="hint">${p.stickerCount}개</span>
                    </div>
                    ${p.id === selectedId ? '<span class="sticker-selected-badge">✓ 사용 중</span>' : ''}
                </div>
            `).join('')}
        </div>
        <p class="hint" style="margin-top:12px">선택한 팩에서 자동화 시 스티커가 삽입됩니다</p>
    `;
}

async function selectStickerPack(packId) {
    await apiCall('/api/stickers/select', 'POST', { packId });
    const data = await apiCall('/api/stickers');
    if (data?.packs) renderStickerPacks(data.packs, packId);
    addLogEntry({ level: '완료', message: `스티커팩 선택 완료` });
}
