// Leonida Trophy Guide — offline tracker for the 55 GTA 6 PS5 trophies.
// Loads only data/trophies.json from its own folder; makes no network request.
// Progress is saved in the browser (localStorage) and can be exported/imported.
// Staging for screenshots uses URL parameters: ?tab=roadmap&kind=missable&select=28
// &spoiler=off&earned=2,3,4 — those set in-memory state for that load only.

const SAVE_KEY = 'leonida-trophy-guide-v2';
const DATA_URL = 'data/trophies.json';

const KIND_LABELS = {
  all: 'All kinds',
  story: 'Story',
  missable: 'Missable',
  collectible: 'Collectibles',
  activity: 'Activities',
  robbery: 'Robberies',
  side: 'Side strands',
  misc: 'Miscellany',
  platinum: 'Platinum',
  completion: 'Completion',
  unconfirmed: 'Unconfirmed',
};

const GRADE_ORDER = { platinum: 0, gold: 1, silver: 2, bronze: 3 };
const GRADE_POINTS = { platinum: 180, gold: 90, silver: 30, bronze: 15 };

const state = {
  data: null,
  earned: new Set(),
  spoiler: true,
  kind: 'all',
  grade: 'all',
  sort: 'id',
  search: '',
  selectedId: null,
  tab: 'checklist',
};

const $ = (id) => document.getElementById(id);

function loadSaved() {
  try {
    const raw = localStorage.getItem(SAVE_KEY);
    if (!raw) return;
    const saved = JSON.parse(raw);
    if (Array.isArray(saved.earned)) state.earned = new Set(saved.earned.filter((n) => Number.isInteger(n)));
    if (typeof saved.spoiler === 'boolean') state.spoiler = saved.spoiler;
  } catch (err) {
    // A corrupt save is ignored; the checklist starts empty.
  }
}

function save() {
  try {
    localStorage.setItem(SAVE_KEY, JSON.stringify({ earned: [...state.earned].sort((a, b) => a - b), spoiler: state.spoiler }));
  } catch (err) {
    // Storage may be unavailable (private mode); the tracker still works in memory.
  }
}

function applyUrlParams() {
  const params = new URLSearchParams(location.search);
  const tab = params.get('tab');
  if (tab && ['checklist', 'roadmap', 'stats', 'about'].includes(tab)) state.tab = tab;
  const kind = params.get('kind');
  if (kind && (KIND_LABELS[kind] || kind === 'all')) state.kind = kind;
  const grade = params.get('grade');
  if (grade && (GRADE_ORDER[grade] !== undefined || grade === 'all')) state.grade = grade;
  const spoiler = params.get('spoiler');
  if (spoiler === 'on') state.spoiler = true;
  if (spoiler === 'off') state.spoiler = false;
  const select = Number.parseInt(params.get('select') || '', 10);
  if (Number.isInteger(select)) state.selectedId = select;
  const earned = params.get('earned');
  if (earned) {
    const ids = earned.split(',').map((s) => Number.parseInt(s, 10)).filter((n) => Number.isInteger(n) && n >= 1 && n <= 55);
    if (ids.length) state.earned = new Set(ids);
  }
  const search = params.get('search');
  if (search) state.search = search;
}

function trophyById(id) {
  return state.data.trophies.find((t) => t.id === id) || null;
}

function isHidden(t) {
  return state.spoiler && t.kind === 'story' && !state.earned.has(t.id);
}

function pointsFor(t) {
  return GRADE_POINTS[t.grade] || 0;
}

function totalPoints() {
  return state.data.trophies.reduce((sum, t) => sum + pointsFor(t), 0);
}

function earnedPoints() {
  return state.data.trophies.filter((t) => state.earned.has(t.id)).reduce((sum, t) => sum + pointsFor(t), 0);
}

function escapeHtml(s) {
  return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

function gradeChip(t) {
  return `<span class="grade ${t.grade}">${t.grade}</span>`;
}

function kindMatches(t) {
  if (state.kind === 'all') return true;
  if (state.kind === 'missable') return t.missable === true;
  if (state.kind === 'unconfirmed') return t.unconfirmed === true;
  return t.kind === state.kind;
}

function filteredTrophies() {
  const q = state.search.trim().toLowerCase();
  let list = state.data.trophies.filter((t) => {
    if (!kindMatches(t)) return false;
    if (state.grade !== 'all' && t.grade !== state.grade) return false;
    if (q && !t.name.toLowerCase().includes(q) && !t.description.toLowerCase().includes(q)) return false;
    return true;
  });
  if (state.sort === 'grade') {
    list = [...list].sort((a, b) => (GRADE_ORDER[a.grade] - GRADE_ORDER[b.grade]) || (a.id - b.id));
  } else if (state.sort === 'kind') {
    list = [...list].sort((a, b) => (a.kind < b.kind ? -1 : a.kind > b.kind ? 1 : a.id - b.id));
  } else if (state.sort === 'name') {
    list = [...list].sort((a, b) => a.name.localeCompare(b.name));
  }
  return list;
}

function renderProgress() {
  const total = state.data.trophies.length;
  const earned = state.earned.size;
  const pct = total ? Math.round((earned / total) * 100) : 0;
  $('earnedCount').textContent = String(earned);
  $('earnedPct').textContent = `${pct}%`;
  $('earnedPoints').textContent = `${earnedPoints()} / ${totalPoints()} pts`;
  $('progressFill').style.width = `${pct}%`;
  $('progressBar').setAttribute('aria-valuenow', String(earned));
  const counts = { platinum: 0, gold: 0, silver: 0, bronze: 0 };
  const totals = { platinum: 0, gold: 0, silver: 0, bronze: 0 };
  for (const t of state.data.trophies) {
    totals[t.grade] += 1;
    if (state.earned.has(t.id)) counts[t.grade] += 1;
  }
  $('gradeCounts').innerHTML = ['platinum', 'gold', 'silver', 'bronze']
    .map((g) => `<span class="dot-${g}">●</span> ${g} <b>${counts[g]}/${totals[g]}</b>`)
    .join(' · ');
}

function renderFilters() {
  const kinds = ['all', 'story', 'missable', 'collectible', 'activity', 'robbery', 'side', 'misc', 'platinum', 'completion', 'unconfirmed'];
  $('kindFilters').innerHTML = kinds
    .map((k) => `<button type="button" data-kind="${k}" class="${state.kind === k ? 'active' : ''}">${KIND_LABELS[k]}</button>`)
    .join('');
  const grades = ['all', 'platinum', 'gold', 'silver', 'bronze'];
  $('gradeFilters').innerHTML = grades
    .map((g) => `<button type="button" data-grade="${g}" class="${state.grade === g ? 'active pink' : ''}">${g === 'all' ? 'All grades' : g}</button>`)
    .join('');
  $('spoilerToggle').checked = state.spoiler;
  $('sortSelect').value = state.sort;
  $('search').value = state.search;
  const missable = state.data.trophies.find((t) => t.missable);
  $('missableBannerText').textContent = missable
    ? `${missable.name} may be missable — do its Chapter 1 spots during Chapter 1. Whether it truly counts as missable is unconfirmed.`
    : '';
}

function renderList() {
  const list = filteredTrophies();
  const ul = $('trophyList');
  if (!list.length) {
    ul.innerHTML = '<li class="empty-list">No trophies match these filters. Clear the search or pick another kind.</li>';
    return;
  }
  ul.innerHTML = list.map((t) => {
    const earned = state.earned.has(t.id);
    const hidden = isHidden(t);
    const name = hidden ? '??? — story trophy (hidden)' : escapeHtml(t.name);
    const desc = hidden ? 'Hidden until earned — spoiler-free mode is on.' : escapeHtml(t.description);
    const flags = [
      t.missable ? '<span class="flag missable">Possibly missable</span>' : '',
      t.unconfirmed ? '<span class="flag unconfirmed">Unconfirmed</span>' : '',
      hidden ? '<span class="flag hidden-spoiler">Spoiler hidden</span>' : '',
    ].join('');
    return `<li class="trophy-item ${earned ? 'earned' : ''} ${state.selectedId === t.id ? 'selected' : ''}" data-id="${t.id}">
      <input type="checkbox" ${earned ? 'checked' : ''} aria-label="Mark ${escapeHtml(t.name)} earned" data-toggle="${t.id}">
      <div><div class="trophy-name">${name}</div><div class="trophy-desc">${desc}</div>
      <div class="trophy-meta">${gradeChip(t)}<span>${escapeHtml(t.kind)} · ${escapeHtml(t.chapter)} · stage ${t.stage}</span>${flags}</div></div>
      <span aria-hidden="true">›</span>
    </li>`;
  }).join('');
}

function renderDetail() {
  const panel = $('detailPanel');
  const t = state.selectedId ? trophyById(state.selectedId) : null;
  if (!t) {
    panel.innerHTML = `<h2>Pick a trophy</h2><p class="official">Select any trophy on the left to read its official description, its guide, its steps, its tips and its sources.</p><div class="note-box">Spoiler-free mode is ${state.spoiler ? 'on' : 'off'}: unearnt story trophies stay hidden until you tick them earned.</div>`;
    return;
  }
  const earned = state.earned.has(t.id);
  if (isHidden(t)) {
    panel.innerHTML = `<h2>???</h2><p class="official">This story trophy is hidden until earned — spoiler-free mode is on.</p><div class="note-box">Tick it earned on the left, or switch spoiler-free mode off, to read its guide.</div><button type="button" class="earned-toggle" data-earn="${t.id}">Mark earned</button>`;
    return;
  }
  const steps = (t.steps || []).map((s) => `<li>${escapeHtml(s)}</li>`).join('');
  const tips = (t.tips || []).map((s) => `<li>${escapeHtml(s)}</li>`).join('');
  const sources = (t.sources || []).map((s) => `<li>${escapeHtml(s)}</li>`).join('');
  const warn = t.missable && t.missable_note ? `<div class="warn-box"><strong>Possibly missable.</strong> ${escapeHtml(t.missable_note)}</div>` : '';
  const unconf = t.unconfirmed && t.unconfirmed_note ? `<div class="warn-box"><strong>Unconfirmed.</strong> ${escapeHtml(t.unconfirmed_note)}</div>` : '';
  panel.innerHTML = `<h2>${escapeHtml(t.name)}</h2>
    <p class="official">“${escapeHtml(t.description)}” — official PlayStation description</p>
    <div class="detail-grades">${gradeChip(t)}<span class="flag">${escapeHtml(t.kind)}</span><span class="flag">${escapeHtml(t.chapter)}</span><span class="flag">Stage ${t.stage}</span></div>
    ${warn}${unconf}
    <h4>Guide</h4><p>${escapeHtml(t.guide)}</p>
    ${steps ? `<h4>Steps</h4><ol>${steps}</ol>` : ''}
    ${tips ? `<h4>Tips</h4><ul>${tips}</ul>` : ''}
    ${sources ? `<h4>Sources</h4><ul class="source-list">${sources}</ul>` : ''}
    <button type="button" class="earned-toggle ${earned ? 'earned' : ''}" data-earn="${t.id}">${earned ? '✓ Earned — click to unmark' : 'Mark earned'}</button>`;
}

function stageTrophyNames(ids) {
  return ids.map((id) => {
    const t = trophyById(id);
    return t ? escapeHtml(t.name) : `#${id}`;
  }).join(', ');
}

function renderRoadmap() {
  const r = state.data.roadmap;
  $('roadmapSummary').textContent = r.summary;
  $('stageCards').innerHTML = r.stages.map((s) => `<article class="stage-card">
    <h3>Stage ${s.stage} — ${escapeHtml(s.title)}</h3>
    <p class="stage-meta">${escapeHtml(s.time)} · difficulty ${escapeHtml(s.difficulty)} · ${s.trophies.length} trophies</p>
    <p>${escapeHtml(s.description)}</p>
    <p><strong>Focus:</strong> ${escapeHtml(s.focus)}</p>
    <p class="stage-trophies">${stageTrophyNames(s.trophies)}</p>
  </article>`).join('');
  $('chapterCards').innerHTML = state.data.chapters.map((c) => `<article class="chapter-card">
    <h3>${escapeHtml(c.chapter)}</h3>
    <p class="chapter-meta">Difficulty ${escapeHtml(c.difficulty)} · ${escapeHtml(c.time)}</p>
    <p>${escapeHtml(c.notes)}</p>
    <p class="chapter-trophies">${stageTrophyNames(c.trophies)}</p>
  </article>`).join('');
  $('playOrder').innerHTML = state.data.play_order.map((s) => `<li>${escapeHtml(s)}</li>`).join('');
  $('missableWarnings').innerHTML = state.data.missable_warnings.map((s) => `<li>${escapeHtml(s)}</li>`).join('');
}

function breakdownRows(groups) {
  return groups.map(([label, done, total]) => {
    const pct = total ? Math.round((done / total) * 100) : 0;
    return `<div class="breakdown-row"><span>${escapeHtml(label)}</span><span class="breakdown-bar"><span class="breakdown-fill" style="width:${pct}%"></span></span><span>${done}/${total}</span></div>`;
  }).join('');
}

function renderStats() {
  const total = state.data.trophies.length;
  const earned = state.earned.size;
  const missableLeft = state.data.trophies.filter((t) => t.missable && !state.earned.has(t.id)).length;
  const unconfLeft = state.data.trophies.filter((t) => t.unconfirmed && !state.earned.has(t.id)).length;
  const hoursLeft = Math.round(((total - earned) / total) * 200);
  $('statGrid').innerHTML = [
    [`${earned}/${total}`, 'trophies earned'],
    [`${total ? Math.round((earned / total) * 100) : 0}%`, 'complete'],
    [`${earnedPoints()}`, `points of ${totalPoints()}`],
    [`${missableLeft}`, 'possibly missable left'],
    [`${unconfLeft}`, 'unconfirmed left'],
    [`~${hoursLeft}h`, 'estimated time left'],
  ].map(([big, label]) => `<div class="stat-card"><div class="big">${big}</div><div class="label">${label}</div></div>`).join('');

  const byKind = {};
  for (const t of state.data.trophies) {
    byKind[t.kind] = byKind[t.kind] || { done: 0, total: 0 };
    byKind[t.kind].total += 1;
    if (state.earned.has(t.id)) byKind[t.kind].done += 1;
  }
  $('kindBreakdown').innerHTML = breakdownRows(Object.entries(byKind).sort((a, b) => a[0].localeCompare(b[0])).map(([k, v]) => [KIND_LABELS[k] || k, v.done, v.total]));

  const byChapter = {};
  for (const t of state.data.trophies) {
    byChapter[t.chapter] = byChapter[t.chapter] || { done: 0, total: 0 };
    byChapter[t.chapter].total += 1;
    if (state.earned.has(t.id)) byChapter[t.chapter].done += 1;
  }
  $('chapterBreakdown').innerHTML = breakdownRows(Object.entries(byChapter).map(([k, v]) => [k, v.done, v.total]));

  const byStage = { 1: { done: 0, total: 0 }, 2: { done: 0, total: 0 }, 3: { done: 0, total: 0 } };
  for (const t of state.data.trophies) {
    byStage[t.stage].total += 1;
    if (state.earned.has(t.id)) byStage[t.stage].done += 1;
  }
  $('stageBreakdown').innerHTML = breakdownRows([1, 2, 3].map((s) => [`Stage ${s}`, byStage[s].done, byStage[s].total]));

  const todo = state.data.trophies.filter((t) => !state.earned.has(t.id)).sort((a, b) => (a.stage - b.stage) || (a.id - b.id)).slice(0, 10);
  $('todoList').innerHTML = todo.map((t) => `<li>${isHidden(t) ? '??? — story trophy (hidden)' : escapeHtml(t.name)} ${gradeChip(t)}</li>`).join('') || '<li>Everything is done — the platinum is yours.</li>';
}

function renderAbout() {
  const m = state.data.meta;
  $('aboutGrid').innerHTML = [
    [m.difficulty, 'difficulty (out of 10)'],
    [m.time_estimate, 'estimated time to platinum'],
    [`${m.playthroughs}`, 'playthrough needed'],
    [`${m.online_trophies}`, 'online trophies'],
    [m.cheats_disable_trophies ? 'Yes' : 'No', 'cheats disable trophies'],
    [`${m.hidden_count}`, 'trophies hidden on PSN'],
    [`${m.missable_count}`, 'possibly missable trophy'],
    [`${m.unconfirmed_count}`, 'unconfirmed trophies'],
  ].map(([big, label]) => `<div class="about-card"><div class="big">${escapeHtml(String(big))}</div><div class="label">${label}</div></div>`).join('');
  $('honestyNotes').innerHTML = [
    'Trophy names, descriptions and grades are the official PlayStation list, shown as published.',
    'Every guide is written for this page in its own words and cites its sources beside the trophy.',
    'Positive Mental Attitude is flagged as possibly missable, but whether it truly counts as missable is unconfirmed.',
    'Bad Luck, I Guess and Ten Pin are labelled unconfirmed: their exact triggers are not yet pinned down, and their guides say so plainly instead of guessing.',
    'Difficulty and time are estimates, not promises — your mileage will vary.',
  ].map((s) => `<li>${escapeHtml(s)}</li>`).join('');
}

function renderAll() {
  renderProgress();
  renderFilters();
  renderList();
  renderDetail();
  renderRoadmap();
  renderStats();
  renderAbout();
  document.body.dataset.ready = '1';
}

function setTab(tab) {
  state.tab = tab;
  document.querySelectorAll('#tabs button').forEach((b) => b.classList.toggle('active', b.dataset.tab === tab));
  document.querySelectorAll('.tab').forEach((s) => s.classList.toggle('active', s.id === `tab-${tab}`));
}

function toggleEarned(id) {
  if (state.earned.has(id)) state.earned.delete(id);
  else state.earned.add(id);
  save();
  renderProgress();
  renderList();
  renderDetail();
  renderStats();
}

function exportProgress() {
  const blob = new Blob([JSON.stringify({ app: 'leonida-trophy-guide', version: 2, exportedAt: new Date().toISOString(), earned: [...state.earned].sort((a, b) => a - b) }, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = 'leonida-trophy-progress.json';
  a.click();
  URL.revokeObjectURL(url);
  $('importNote').textContent = 'Progress exported. Keep the file somewhere safe.';
}

function importProgress(file) {
  const reader = new FileReader();
  reader.onload = () => {
    try {
      const parsed = JSON.parse(String(reader.result));
      const ids = Array.isArray(parsed.earned) ? parsed.earned : parsed;
      if (!Array.isArray(ids)) throw new Error('bad file');
      const valid = ids.filter((n) => Number.isInteger(n) && n >= 1 && n <= 55);
      state.earned = new Set(valid);
      save();
      renderAll();
      $('importNote').textContent = `Imported ${valid.length} earned trophies.`;
    } catch (err) {
      $('importNote').textContent = 'That file could not be read as a progress export.';
    }
  };
  reader.readAsText(file);
}

async function init() {
  loadSaved();
  applyUrlParams();
  const res = await fetch(DATA_URL);
  if (!res.ok) throw new Error(`could not load ${DATA_URL}: ${res.status}`);
  state.data = await res.json();
  if (!state.selectedId) {
    const first = state.data.trophies.find((t) => !isHidden(t)) || state.data.trophies[0];
    state.selectedId = first.id;
  }
  renderAll();
  setTab(state.tab);

  $('tabs').addEventListener('click', (e) => {
    const btn = e.target.closest('button[data-tab]');
    if (btn) setTab(btn.dataset.tab);
  });
  $('kindFilters').addEventListener('click', (e) => {
    const btn = e.target.closest('button[data-kind]');
    if (!btn) return;
    state.kind = btn.dataset.kind;
    renderFilters();
    renderList();
  });
  $('gradeFilters').addEventListener('click', (e) => {
    const btn = e.target.closest('button[data-grade]');
    if (!btn) return;
    state.grade = btn.dataset.grade;
    renderFilters();
    renderList();
  });
  $('spoilerToggle').addEventListener('change', (e) => {
    state.spoiler = e.target.checked;
    save();
    renderList();
    renderDetail();
  });
  $('sortSelect').addEventListener('change', (e) => {
    state.sort = e.target.value;
    renderList();
  });
  $('search').addEventListener('input', (e) => {
    state.search = e.target.value;
    renderList();
  });
  $('trophyList').addEventListener('click', (e) => {
    const toggle = e.target.closest('[data-toggle]');
    if (toggle) {
      e.stopPropagation();
      toggleEarned(Number.parseInt(toggle.dataset.toggle, 10));
      return;
    }
    const item = e.target.closest('.trophy-item[data-id]');
    if (item) {
      state.selectedId = Number.parseInt(item.dataset.id, 10);
      renderList();
      renderDetail();
    }
  });
  $('detailPanel').addEventListener('click', (e) => {
    const btn = e.target.closest('[data-earn]');
    if (btn) toggleEarned(Number.parseInt(btn.dataset.earn, 10));
  });
  $('exportBtn').addEventListener('click', exportProgress);
  $('importFile').addEventListener('change', (e) => {
    if (e.target.files && e.target.files[0]) importProgress(e.target.files[0]);
    e.target.value = '';
  });
  $('resetBtn').addEventListener('click', () => {
    if (window.confirm('Reset all progress? This clears every ticked trophy.')) {
      state.earned = new Set();
      save();
      renderAll();
      $('importNote').textContent = 'Progress reset.';
    }
  });
}

init().catch((err) => {
  document.body.innerHTML = `<main><h1>Leonida Trophy Guide</h1><p>Could not load the trophy data (${escapeHtml(err.message)}). Open this page from a static server with app/ at its root.</p></main>`;
});
