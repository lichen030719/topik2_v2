// ════════════════════════════════════════════════════
// TOPIK II 單字卡 App
// ════════════════════════════════════════════════════

// ─── Storage ───────────────────────────────────────
const PFX  = 'topik2_';
const KNOW = 'know';
const UNK  = 'unk';

const ws = {
  get: id  => localStorage.getItem(PFX + id),
  set: (id, s) => localStorage.setItem(PFX + id, s),
  del: id  => localStorage.removeItem(PFX + id),
};

// ─── State ─────────────────────────────────────────
let MANIFEST = [];         // data/index.json
let DAY_CACHE = {};        // "part01/day01" → day data
let ctx = { partIdx: null, dayIdx: null };

// ─── Data Loading ───────────────────────────────────
async function fetchJSON(path) {
  const res = await fetch(path);
  if (!res.ok) throw new Error(`Failed to load ${path}`);
  return res.json();
}

async function loadManifest() {
  MANIFEST = await fetchJSON('data/index.json');
}

async function loadDay(folder, dayNum) {
  const key = `${folder}/day${String(dayNum).padStart(2, '0')}`;
  if (DAY_CACHE[key]) return DAY_CACHE[key];
  const data = await fetchJSON(`data/${folder}/day${String(dayNum).padStart(2, '0')}.json`);
  DAY_CACHE[key] = data;
  return data;
}

async function loadAllDaysForPart(partIdx) {
  const part = MANIFEST[partIdx];
  return Promise.all(part.days.map(d => loadDay(part.folder, d)));
}

// ─── Statistics ─────────────────────────────────────
function globalStats() {
  let total = 0, kn = 0, un = 0;
  for (const key in localStorage) {
    if (!key.startsWith(PFX)) continue;
    const id = key.slice(PFX.length);
    const v = localStorage.getItem(key);
    total++; // only counted words
    if (v === KNOW) kn++;
    else if (v === UNK) un++;
  }
  return { kn, un };
}

function totalWords() {
  // Sum from manifest (words per day not known until loaded — use word id count from storage as proxy)
  // We'll update this after loading
  return Object.keys(localStorage).filter(k => k.startsWith(PFX)).length;
}

function dayStats(words) {
  const kn = words.filter(w => ws.get(w.id) === KNOW).length;
  const un = words.filter(w => ws.get(w.id) === UNK).length;
  return { kn, un, total: words.length };
}

// ─── Navigation ─────────────────────────────────────
function showView(id) {
  document.querySelectorAll('.view').forEach(v => v.classList.remove('active'));
  document.getElementById('view-' + id).classList.add('active');
  window.scrollTo(0, 0);
}

function showLoading(viewId) {
  const el = document.getElementById(viewId + '-loading');
  if (el) el.style.display = 'flex';
}

// ════════════════════════════════════════════════════
// HOME
// ════════════════════════════════════════════════════
async function renderHome() {
  showView('home');
  const s = globalStats();
  document.getElementById('home-stats').innerHTML = `
    <div class="stat-box"><div class="stat-n">${MANIFEST.reduce((a, p) => a + p.days.length, 0) * 20}</div><div class="stat-l">總單字</div></div>
    <div class="stat-box"><div class="stat-n c-accent">${s.kn}</div><div class="stat-l">已掌握</div></div>
    <div class="stat-box"><div class="stat-n c-danger">${s.un}</div><div class="stat-l">複習池</div></div>
    <div class="stat-box"><div class="stat-n c-muted">—</div><div class="stat-l">未學習</div></div>
  `;

  // Global review button
  document.getElementById('global-count').textContent = s.un + ' 個';
  document.getElementById('btn-global-review').onclick = showGlobalReview;

  // Part list
  const pl = document.getElementById('part-list');
  pl.innerHTML = '';
  MANIFEST.forEach((part, pi) => {
    const dayRange = `Day ${part.days[0]}–${part.days[part.days.length - 1]}`;
    const el = document.createElement('div');
    el.className = 'part-card';
    el.innerHTML = `
      <div class="part-badge">P${part.part}</div>
      <div class="part-info">
        <div class="part-kr">${part.partName}</div>
        <div class="part-zh">${part.partNameZh} · ${dayRange}</div>
      </div>
      <div class="part-prog" style="font-size:18px;color:var(--text-light)">›</div>
    `;
    el.onclick = () => showPart(pi);
    pl.appendChild(el);
  });
}

// ════════════════════════════════════════════════════
// PART (Day list)
// ════════════════════════════════════════════════════
async function showPart(pi) {
  ctx.partIdx = pi;
  const part = MANIFEST[pi];
  document.getElementById('part-title').textContent = `Part ${part.part} · ${part.partName}`;
  document.getElementById('part-sub').textContent = part.partNameZh;
  document.getElementById('part-back').onclick = renderHome;

  const dl = document.getElementById('day-list');
  dl.innerHTML = '<div class="loading-wrap"><div class="spinner"></div></div>';
  showView('part');

  const days = await loadAllDaysForPart(pi);

  dl.innerHTML = '';
  days.forEach((day, di) => {
    const { kn, un, total } = dayStats(day.words);
    const el = document.createElement('div');
    el.className = 'day-item';
    el.innerHTML = `
      <div class="day-item-l">
        <div class="day-n">Day ${day.day}</div>
        <div class="day-prog">${kn}/${total} 已掌握</div>
      </div>
      <div class="badges">
        ${kn ? `<span class="badge b-know">✓ ${kn}</span>` : ''}
        ${un ? `<span class="badge b-unk">✗ ${un}</span>` : ''}
        <span style="font-size:16px;color:var(--text-light);margin-left:4px">›</span>
      </div>
    `;
    el.onclick = () => showDayMenu(pi, di);
    dl.appendChild(el);
  });
}

// ════════════════════════════════════════════════════
// DAY MENU
// ════════════════════════════════════════════════════
async function showDayMenu(pi, di) {
  ctx.partIdx = pi; ctx.dayIdx = di;
  const part = MANIFEST[pi];
  const day = await loadDay(part.folder, part.days[di]);

  const { kn, un, total } = dayStats(day.words);
  const unlearned = day.words.filter(w => !ws.get(w.id)).length;
  const unkWords  = day.words.filter(w => ws.get(w.id) === UNK);

  document.getElementById('dmenu-title').textContent = `Day ${day.day}`;
  document.getElementById('dmenu-sub').textContent   = `${part.partName} · ${part.partNameZh}`;
  document.getElementById('dmenu-back').onclick = () => showPart(pi);

  document.getElementById('menu-list').innerHTML = `
    <div class="menu-item" id="mi-fc">
      <div class="menu-icon ic-green">🃏</div>
      <div class="menu-info">
        <div class="menu-title">開始背單字</div>
        <div class="menu-desc">共 ${total} 個 · 未學 ${unlearned} 個</div>
      </div>
      <div class="menu-arr">›</div>
    </div>
    <div class="menu-item" id="mi-tip">
      <div class="menu-icon ic-yellow">💡</div>
      <div class="menu-info">
        <div class="menu-title">考前60分鐘小叮嚀</div>
        <div class="menu-desc">${day.tip.title}　${day.tip.titleZh}</div>
      </div>
      <div class="menu-arr">›</div>
    </div>
    <div class="menu-item" id="mi-ov">
      <div class="menu-icon ic-blue">📋</div>
      <div class="menu-info">
        <div class="menu-title">當天單字總覽</div>
        <div class="menu-desc">所有 ${total} 個單字及學習狀態</div>
      </div>
      <div class="menu-arr">›</div>
    </div>
    <div class="menu-item" id="mi-rv">
      <div class="menu-icon ic-red">🔁</div>
      <div class="menu-info">
        <div class="menu-title">當天複習池</div>
        <div class="menu-desc">${unkWords.length} 個不會的單字</div>
      </div>
      <div class="menu-arr">›</div>
    </div>
  `;

  document.getElementById('mi-fc').onclick = () =>
    startFC(day.words, false, () => showDayMenu(pi, di));
  document.getElementById('mi-tip').onclick = () =>
    showTip(day, pi, di);
  document.getElementById('mi-ov').onclick  = () =>
    showOverview(day.words, `Day ${day.day} 單字總覽`, `${total} 個單字`, () => showDayMenu(pi, di));
  document.getElementById('mi-rv').onclick  = () =>
    showReviewPool(unkWords, `Day ${day.day} 複習池`, () => showDayMenu(pi, di));

  showView('day-menu');
}

// ════════════════════════════════════════════════════
// FLASHCARD ENGINE
// ════════════════════════════════════════════════════
let FC = { words: [], idx: 0, isReview: false, backFn: null, flipped: false };
let swipeHandlers = null;

function startFC(words, isReview, backFn) {
  FC = { words: [...words], idx: 0, isReview, backFn, flipped: false };
  document.getElementById('fc-title').textContent = isReview ? '複習模式' : '背單字';
  document.getElementById('fc-back').onclick = () => { cleanupSwipe(); FC.backFn(); };
  document.getElementById('btn-unk').onclick  = () => doSwipe(false);
  document.getElementById('btn-kn').onclick   = () => doSwipe(true);
  renderFC();
  showView('flashcard');
}

function renderFC() {
  const area   = document.getElementById('fc-area');
  const footer = document.getElementById('fc-footer');

  if (FC.idx >= FC.words.length) {
    cleanupSwipe();
    const pool = FC.words.filter(w => ws.get(w.id) === UNK).length;
    area.innerHTML = `
      <div class="done-wrap">
        <div class="done-emoji">${FC.isReview ? '🎉' : '✨'}</div>
        <div class="done-title">${FC.isReview ? '複習完成！' : '全部看完了！'}</div>
        <div class="done-sub">${FC.isReview
          ? '右滑的單字已移出複習池'
          : `複習池新增了 ${pool} 個單字`}</div>
        <div class="done-actions" style="margin-top:20px">
          <button class="btn-primary" id="done-back">← 返回</button>
        </div>
      </div>`;
    footer.style.display = 'none';
    document.getElementById('done-back').onclick = () => { cleanupSwipe(); FC.backFn(); };
    return;
  }

  footer.style.display = 'flex';
  FC.flipped = false;
  const w   = FC.words[FC.idx];
  const pct = (FC.idx / FC.words.length) * 100;
  document.getElementById('fc-bar').style.width    = pct + '%';
  document.getElementById('fc-prog-txt').textContent = `${FC.idx + 1} / ${FC.words.length}`;

  area.innerHTML = `
    <div class="card-stack">
      ${FC.idx + 2 < FC.words.length ? '<div class="ghost ghost-2"></div>' : ''}
      ${FC.idx + 1 < FC.words.length ? '<div class="ghost ghost-1"></div>' : ''}
      <div class="swipe-card" id="sc">
        <div class="sw-label sw-left"  id="sw-l">✗ 不會</div>
        <div class="sw-label sw-right" id="sw-r">✓ 我會</div>
        <div class="card-inner" id="ci">
          <div class="card-face">
            <div class="front-body">
              <div class="card-id">${w.id}</div>
              <div class="card-word">${w.korean}</div>
              ${w.pronunciation ? `<div class="card-pron">[${w.pronunciation}]</div>` : ''}
              <div class="tap-hint">點擊翻牌 · 查看意思</div>
            </div>
          </div>
          <div class="card-back">
            <div class="back-body">${buildBack(w)}</div>
          </div>
        </div>
      </div>
    </div>`;
  setupSwipe();
}

function buildBack(w) {
  const posClass = ['명','동','형','부','관'].includes(w.pos)
    ? `pos-${w.pos}` : 'pos-default';
  let h = `<span class="pos-tag ${posClass}">${w.pos}</span>`;
  w.meanings.forEach((m, i) => {
    if (i > 0) h += '<div class="m-divider"></div>';
    h += `<div class="meaning-block">
      <div class="meaning-zh">${w.meanings.length > 1
        ? `<span class="m-num">${i + 1}.</span>` : ''}${m.chinese}</div>
      <div class="ex-kr">${m.exampleKr}</div>
      <div class="ex-zh">${m.exampleZh}</div>
    </div>`;
  });
  return h;
}

// ─── Swipe ──────────────────────────────────────────
function setupSwipe() {
  const card = document.getElementById('sc');
  const ci   = document.getElementById('ci');
  if (!card) return;

  // sw.swiping = true 表示已偵測到明確水平滑動，此時 click 不翻牌
  let sw = { x0: 0, y0: 0, dx: 0, dragging: false, swiping: false };

  // ── 翻牌：用獨立 click 事件處理（桌機點擊 & 手機輕觸都會觸發）
  // 水平滑動時 onMove 呼叫 preventDefault，click 就不會觸發，互不干擾
  card.addEventListener('click', () => {
    if (sw.swiping) return;          // 滑動結束後的殘留保護
    FC.flipped = !FC.flipped;
    FC.flipped ? ci.classList.add('flipped') : ci.classList.remove('flipped');
  });

  function onStart(e) {
    const t = e.touches ? e.touches[0] : e;
    sw = { x0: t.clientX, y0: t.clientY, dx: 0, dragging: true, swiping: false };
    ci.style.transition = 'none';
  }

  function onMove(e) {
    if (!sw.dragging) return;
    const t = e.touches ? e.touches[0] : e;
    const dx = t.clientX - sw.x0;
    const dy = t.clientY - sw.y0;

    // 明確水平滑動才進入滑卡模式
    if (Math.abs(dx) > Math.abs(dy) * 0.8 && Math.abs(dx) > 8) {
      if (e.cancelable) e.preventDefault(); // 阻止 click & 頁面捲動
      sw.swiping = true;
      sw.dx = dx;
      card.style.transform = `translateX(${dx}px) rotate(${dx * 0.07}deg)`;
      const op = Math.min(Math.abs(dx) / 90, 1);
      document.getElementById('sw-l').style.opacity = dx < 0 ? op : 0;
      document.getElementById('sw-r').style.opacity = dx > 0 ? op : 0;
    }
  }

  function onEnd() {
    if (!sw.dragging) return;
    sw.dragging = false;
    ci.style.transition = '';

    if (!sw.swiping) {
      // 沒有水平滑動 → 重置位置（翻牌由 click 事件處理）
      card.style.transform = '';
      return;
    }

    // 重置標記（延遲一點讓 click 保護生效）
    setTimeout(() => { sw.swiping = false; }, 50);

    document.getElementById('sw-l').style.opacity = 0;
    document.getElementById('sw-r').style.opacity = 0;

    if (Math.abs(sw.dx) > 85) {
      const know = sw.dx > 0;
      card.style.transition = 'transform 0.28s ease, opacity 0.28s ease';
      card.style.transform  = `translateX(${know ? '160%' : '-160%'}) rotate(${know ? 18 : -18}deg)`;
      card.style.opacity    = '0';
      setTimeout(() => doSwipe(know), 270);
    } else {
      card.style.transition = 'transform 0.35s cubic-bezier(0.34,1.4,0.64,1)';
      card.style.transform  = '';
    }
  }

  card.addEventListener('mousedown',  onStart);
  card.addEventListener('touchstart', onStart, { passive: true });
  document.addEventListener('mousemove',  onMove);
  document.addEventListener('touchmove',  onMove, { passive: false });
  document.addEventListener('mouseup',   onEnd);
  document.addEventListener('touchend',  onEnd);

  swipeHandlers = { onMove, onEnd };
}

function cleanupSwipe() {
  if (!swipeHandlers) return;
  document.removeEventListener('mousemove',  swipeHandlers.onMove);
  document.removeEventListener('touchmove',  swipeHandlers.onMove);
  document.removeEventListener('mouseup',    swipeHandlers.onEnd);
  document.removeEventListener('touchend',   swipeHandlers.onEnd);
  swipeHandlers = null;
}

function doSwipe(know) {
  const w = FC.words[FC.idx];
  if (FC.isReview) {
    if (know) ws.del(w.id);      // 右滑：移出複習池
    // 左滑：繼續留著，不動
  } else {
    ws.set(w.id, know ? KNOW : UNK);
  }
  FC.idx++;
  renderFC();
}

// ════════════════════════════════════════════════════
// TIP
// ════════════════════════════════════════════════════
function showTip(day, pi, di) {
  const tip = day.tip;
  document.getElementById('tip-label').textContent = `Day ${day.day}`;
  document.getElementById('tip-back').onclick = () => showDayMenu(pi, di);

  const rows = [];
  for (let i = 0; i < tip.table.length; i += 3) rows.push(tip.table.slice(i, i + 3));

  const tableHtml = rows.map(row => {
    const cells = row.map(c =>
      `<div class="tip-cell kr">${c.kr}</div><div class="tip-cell zh">${c.zh}</div>`
    ).join('');
    const pad = 3 - row.length;
    const padCells = pad > 0
      ? `<div class="tip-cell empty" style="grid-column:span ${pad * 2}"></div>` : '';
    return `<div class="tip-row">${cells}${padCells}</div>`;
  }).join('');

  document.getElementById('tip-body').innerHTML = `
    <div class="tip-header">
      <div class="tip-title-kr">${tip.title}</div>
      <div class="tip-title-zh">${tip.titleZh}</div>
      ${tip.description ? `<div class="tip-desc">${tip.description}</div>` : ''}
    </div>
    <div class="tip-table">${tableHtml}</div>
  `;
  showView('tip');
}

// ════════════════════════════════════════════════════
// OVERVIEW
// ════════════════════════════════════════════════════
function showOverview(words, title, sub, backFn) {
  document.getElementById('ov-title').textContent = title;
  document.getElementById('ov-sub').textContent   = sub;
  document.getElementById('ov-back').onclick = backFn;

  const list = document.getElementById('ov-list');
  list.innerHTML = '';
  words.forEach(w => {
    const st = ws.get(w.id);
    const [cls, lbl] = st === KNOW ? ['s-know','✓ 我會']
                     : st === UNK  ? ['s-unk', '✗ 不會']
                     :               ['s-new', '未學'];
    const zhAll = w.meanings.map(m => m.chinese).join('；');
    const el = document.createElement('div');
    el.className = 'word-row';
    el.innerHTML = `
      <div class="wr-num">${w.id}</div>
      <div class="wr-main">
        <div class="wr-kr">${w.korean}${w.pronunciation
          ? ` <span class="wr-pron">[${w.pronunciation}]</span>` : ''}</div>
        <div class="wr-zh">${zhAll}</div>
      </div>
      <span class="wr-status ${cls}">${lbl}</span>
    `;
    list.appendChild(el);
  });
  showView('overview');
}

// ════════════════════════════════════════════════════
// REVIEW POOL
// ════════════════════════════════════════════════════
function showReviewPool(words, title, backFn) {
  document.getElementById('rv-title').textContent = title;
  document.getElementById('rv-sub').textContent   = `${words.length} 個不會的單字`;
  document.getElementById('rv-back').onclick = backFn;

  const startBtn = document.getElementById('rv-start-btn');
  const list     = document.getElementById('rv-list');
  list.innerHTML = '';

  if (words.length === 0) {
    startBtn.style.display = 'none';
    list.innerHTML = `
      <div class="empty-wrap">
        <div class="empty-ico">🎉</div>
        <div class="empty-t">複習池是空的！</div>
        <div class="empty-s">左滑不會的單字會出現在這裡</div>
      </div>`;
  } else {
    startBtn.style.display = 'block';
    startBtn.onclick = () => startFC([...words], true, () => showReviewPool(words, title, backFn));
    words.forEach(w => {
      const zhAll = w.meanings.map(m => m.chinese).join('；');
      const el = document.createElement('div');
      el.className = 'word-row';
      el.innerHTML = `
        <div class="wr-num">${w.id}</div>
        <div class="wr-main">
          <div class="wr-kr">${w.korean}${w.pronunciation
            ? ` <span class="wr-pron">[${w.pronunciation}]</span>` : ''}</div>
          <div class="wr-zh">${zhAll}</div>
        </div>
        <span class="wr-status s-unk">✗ 不會</span>
      `;
      list.appendChild(el);
    });
  }
  showView('review');
}

// ─── Global Review Pool ──────────────────────────────
async function showGlobalReview() {
  // Collect all UNK word ids
  const unkIds = Object.keys(localStorage)
    .filter(k => k.startsWith(PFX) && localStorage.getItem(k) === UNK)
    .map(k => k.slice(PFX.length));

  if (unkIds.length === 0) {
    showReviewPool([], '全部複習池', renderHome);
    return;
  }

  // Load all days to find matching words
  const allWords = [];
  for (const part of MANIFEST) {
    for (const dayNum of part.days) {
      try {
        const day = await loadDay(part.folder, dayNum);
        day.words.forEach(w => {
          if (unkIds.includes(w.id)) allWords.push(w);
        });
      } catch (_) {}
    }
  }
  showReviewPool(allWords, '全部複習池', renderHome);
}

// ════════════════════════════════════════════════════
// INIT
// ════════════════════════════════════════════════════
async function init() {
  await loadManifest();
  renderHome();
}

init();
