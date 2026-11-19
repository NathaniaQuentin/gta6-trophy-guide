// Leonida Trophy Guide — offline tracker for the 55 GTA 6 PS5 trophies.
// Loads only data/trophies.json from its own folder; makes no network request.
// Progress is saved in the browser (localStorage) and can be exported/imported.
const SAVE_KEY = 'leonida-trophy-guide-v1';
const KIND_FILTERS = [
  ['all', 'All 55'],
  ['story', 'Story'],
  ['missable', 'Missable'],
  ['collectibles', 'Collectibles'],
  ['activities', 'Activities'],
  ['side', 'Side quests'],
  ['robbery', 'Robberies'],
  ['online', 'Online'],
];
const KIND_NAMES = {
  platinum: 'Platinum', story: 'Story', side: 'Side quest', collectibles: 'Collectible',
  activities: 'Activity', robbery: 'Robbery', misc: 'Misc',
};

const state = {
  data: null,
  earned: new Set(),
  spoilerOn: true,
  kind: 'all',
  search: '',
  openId: 28,
};

function el(id) { return document.getElementById(id); }
function htmlEscape(s) {
  return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}
function findTrophy(id) { return state.data.trophies.find((t) => t.id === id); }
function storyHidden(t) { return state.spoilerOn && t.kind === 'story' && !state.earned.has(t.id); }

function readSave() {
  try {
    const raw = localStorage.getItem(SAVE_KEY);
    if (!raw) return;
    const saved = JSON.parse(raw);
    state.earned = new Set((saved.earned || []).filter((n) => Number.isInteger(n)));
    if (typeof saved.spoiler === 'boolean') state.spoilerOn = saved.spoiler;
  } catch { /* a corrupt save starts fresh */ }
}
function writeSave() {
  try {
    localStorage.setItem(SAVE_KEY, JSON.stringify({ earned: [...state.earned].sort((a, b) => a - b), spoiler: state.spoilerOn }));
  } catch { /* storage full or blocked: tracking still works for this visit */ }
}

function filteredTrophies() {
  return state.data.trophies.filter((t) => {
    if (state.kind === 'missable' && !t.missable) return false;
    if (state.kind === 'online') return false;
    if (state.kind !== 'all' && state.kind !== 'missable' && t.kind !== state.kind) return false;
    if (state.search) {
      const hay = (t.name + ' ' + t.description + ' ' + t.guide).toLowerCase();
      if (!hay.includes(state.search.toLowerCase())) return false;
    }
    return true;
  });
}

function paintHeader() {
  const total = state.data.trophies.length;
  const n = state.earned.size;
  el('earnedLabel').textContent = n + ' / ' + total;
  el('pctLabel').textContent = Math.round((n / total) * 100) + '% to platinum';
  el('meterFill').style.width = (n / total) * 100 + '%';
  const byGrade = {};
  for (const t of state.data.trophies) if (state.earned.has(t.id)) byGrade[t.grade] = (byGrade[t.grade] || 0) + 1;
  const parts = [];
  for (const g of ['platinum', 'gold', 'silver', 'bronze']) {
    if (byGrade[g]) parts.push(byGrade[g] + ' ' + g);
  }
  el('gradeLine').textContent = parts.length ? 'Earned: ' + parts.join(' · ') : 'Nothing earned yet — tick a trophy to start.';
}

function paintKindButtons() {
  el('kindFilters').innerHTML = KIND_FILTERS.map(([key, label]) =>
    '<button type="button" data-kind="' + key + '" class="' + (state.kind === key ? 'active' : '') + '">' + htmlEscape(label) + '</button>'
  ).join('');
  for (const btn of el('kindFilters').querySelectorAll('button')) {
    btn.addEventListener('click', () => { state.kind = btn.dataset.kind; paintRows(); paintKindButtons(); });
  }
}

function paintRows() {
  const list = el('trophyRows');
  const rows = filteredTrophies();
  if (state.kind === 'online') {
    list.innerHTML = '<li class="empty-row">No online trophies. GTA 6 launches as a single-player game — all 55 trophies are earned offline, and none need GTA Online or any online mode. (Source: PowerPyx trophy guide, Nov 2026.)</li>';
  } else if (!rows.length) {
    list.innerHTML = '<li class="empty-row">No trophies match this filter.</li>';
  } else {
    list.innerHTML = rows.map((t) => {
      const hidden = storyHidden(t);
      const name = hidden ? '??? — story trophy' : htmlEscape(t.name);
      const desc = hidden ? 'Hidden until earned. Turn spoiler-free mode off, or tick it once you earn it.' : htmlEscape(t.description);
      const tags = [];
      tags.push('<span class="pill ' + t.grade + '">' + t.grade + '</span>');
      tags.push('<span class="chip">' + KIND_NAMES[t.kind] + '</span>');
      if (t.chapter) tags.push('<span class="chip">Ch ' + t.chapter + '</span>');
      if (t.count) tags.push('<span class="chip">' + t.count.toLocaleString('en-US') + '</span>');
      if (t.missable) tags.push('<span class="chip danger">Potentially missable</span>');
      if (t.status === 'unconfirmed') tags.push('<span class="chip warn">Method unconfirmed</span>');
      return '<li data-id="' + t.id + '" class="' + (state.earned.has(t.id) ? 'done ' : '') + (state.openId === t.id ? 'picked' : '') + '">' +
        '<input type="checkbox" ' + (state.earned.has(t.id) ? 'checked' : '') + ' aria-label="Mark ' + htmlEscape(t.name) + ' as earned">' +
        '<div><div class="row-name">' + name + '</div><div class="row-desc">' + desc + '</div>' +
        '<div class="row-tags">' + tags.join('') + '</div></div>' +
        '<span aria-hidden="true">' + (state.earned.has(t.id) ? '✓' : '') + '</span></li>';
    }).join('');
    for (const li of list.querySelectorAll('li[data-id]')) {
      const id = Number(li.dataset.id);
      li.addEventListener('click', (e) => {
        if (e.target.tagName === 'INPUT') return;
        state.openId = id;
        paintRows();
        paintPanel();
      });
      li.querySelector('input').addEventListener('change', (e) => {
        if (e.target.checked) state.earned.add(id); else state.earned.delete(id);
        writeSave();
        paintHeader();
        paintRows();
        paintPanel();
      });
    }
  }
  const missable = state.data.trophies.find((t) => t.missable);
  const banner = el('alertMissable');
  banner.innerHTML = '<strong>Watch out — 1 potentially missable trophy:</strong> ' + htmlEscape(missable.name) +
    ' — meditate at every spot. The Chapter 1 balcony meditation at Jason\u2019s house disappears after Chapter 1. ' +
    'It is still unconfirmed whether it counts, so do it to be safe. <button type="button" id="jumpMissable">Show it</button>';
  el('jumpMissable').addEventListener('click', () => {
    state.kind = 'missable';
    state.openId = missable.id;
    paintKindButtons();
    paintRows();
    paintPanel();
  });
}

function paintPanel() {
  const box = el('guidePanel');
  const t = findTrophy(state.openId) || state.data.trophies[0];
  if (storyHidden(t)) {
    box.innerHTML = '<p class="blank">This is a story trophy, hidden by spoiler-free mode. Earn it in the game (or turn the mode off) to see its name and guide.</p>';
    return;
  }
  const steps = t.steps.map((s) => '<li>' + htmlEscape(s) + '</li>').join('');
  const cites = t.sources.map((s) => s.url
    ? '<li><a href="' + htmlEscape(s.url) + '" target="_blank" rel="noopener">' + htmlEscape(s.name) + '</a></li>'
    : '<li>' + htmlEscape(s.name) + '</li>').join('');
  box.innerHTML =
    '<h3>' + htmlEscape(t.name) + '</h3>' +
    '<p class="quote">“' + htmlEscape(t.description) + '” — ' + t.grade + ' trophy' +
    (t.count ? ' · tracked count: ' + t.count.toLocaleString('en-US') : '') +
    (t.chapter ? ' · Chapter ' + t.chapter : '') + '</p>' +
    (t.missable ? '<p class="flag">' + htmlEscape(t.missableNote || '') + '</p>' : '') +
    (t.status === 'unconfirmed' ? '<p class="flag"><strong>Method not yet confirmed</strong> (as of 19 Nov 2026). No walkthrough has pinned this one down yet — this entry says so instead of guessing.</p>' : '') +
    '<h4>How to unlock it</h4><p>' + htmlEscape(t.guide) + '</p>' +
    '<h4>Steps</h4><ol>' + steps + '</ol>' +
    '<h4>Sources</h4><ul class="cite">' + cites + '</ul>';
}

function paintStages() {
  el('stageList').innerHTML = state.data.roadmap.map((s) =>
    '<li><h3>Stage ' + s.stage + ': ' + htmlEscape(s.title) + ' <span>· ' + htmlEscape(s.hours) + ' hours</span></h3>' +
    '<p>' + htmlEscape(s.text) + '</p>' +
    '<div class="covers">Covers: ' + s.trophies.map((id) => htmlEscape(findTrophy(id).name)).join(' · ') + '</div></li>'
  ).join('');
  el('tipBox').innerHTML =
    '<h3>Before you start</h3><p>Keep a manual save at the start and end of every chapter (15 manual slots) — there is no mission replay and no New Game+. ' +
    'Cheats disable trophies and saving, so keep them off for the whole run. The 100% checklist only opens after the story, but progress made during the story already counts. ' +
    'Only one trophy is potentially missable: <strong>Positive Mental Attitude</strong> — do the Chapter 1 balcony meditation.</p>';
}

function paintAbout() {
  const m = state.data.meta;
  el('aboutContent').innerHTML =
    '<h3>What this guide is</h3><p>An offline guide and tracker for the 55 PlayStation 5 trophies of Grand Theft Auto VI. ' +
    'Trophy names, descriptions and grades are shown exactly as PlayStation publishes them. Every guide text is written for this entry, in its own words — sources are cited beside each trophy, never copied.</p>' +
    '<h3>The list at a glance</h3><ul>' +
    '<li>55 trophies: 1 platinum, 2 gold, 6 silver, 46 bronze; 28 hidden until earned.</li>' +
    '<li>Online trophies: none — GTA 6 launches single-player only.</li>' +
    '<li>Estimated difficulty ' + htmlEscape(m.difficulty) + ', about ' + htmlEscape(m.timeToPlatinum) + ' to the platinum, 1 playthrough.</li>' +
    '<li>Potentially missable: 1 (Positive Mental Attitude — see its guide).</li>' +
    '<li>Cheats disable trophies and saving.</li></ul>' +
    '<h3>How the facts were checked</h3><p>Names, descriptions and grades come from the official PS5 list as published on PSN and listed by Exophase and PSNProfiles on 18 Nov 2026. ' +
    'Methods, counts and the roadmap follow PowerPyx\u2019s GTA 6 Trophy Guide &amp; Roadmap (18–19 Nov 2026), cross-checked against other launch-week guides where they agree. ' +
    'Two trophies — Bad Luck, I Guess and Ten Pin — had no confirmed method on 19 Nov 2026; this guide labels them unconfirmed instead of inventing one.</p>' +
    '<h3>Sources</h3><ul>' +
    '<li><a href="https://www.powerpyx.com/gta-6-grand-theft-auto-vi-trophy-guide-roadmap/" target="_blank" rel="noopener">PowerPyx — GTA 6 Trophy Guide &amp; Roadmap</a></li>' +
    '<li>Official PS5 trophy list (PSN), as listed by Exophase &amp; PSNProfiles, 18 Nov 2026</li>' +
    '<li><a href="https://www.planetgta6.com/en/gta-6-trophies/" target="_blank" rel="noopener">Planet GTA 6 — GTA 6 Trophies: All 55 trophies and Xbox achievements</a></li></ul>' +
    '<h3>Your progress stays yours</h3><p>Ticked trophies are saved in this browser only (localStorage). Export downloads a small JSON file; Import reads one back. Nothing is sent anywhere — this app makes no network request at all.</p>';
  el('footNote').textContent = 'Trophy list as published 18 Nov 2026 · Guide methods as reported 19 Nov 2026 · ' + state.data.trophies.length + ' trophies.';
}

function showPanel(name) {
  for (const v of ['Checklist', 'Roadmap', 'About']) {
    el('panel' + v).hidden = v !== name;
    el('btn' + v).classList.toggle('active', v === name);
  }
}

async function boot() {
  const res = await fetch('data/trophies.json');
  state.data = await res.json();
  readSave();
  el('spoilerBox').checked = state.spoilerOn;
  paintHeader();
  paintKindButtons();
  paintRows();
  paintPanel();
  paintStages();
  paintAbout();
  el('spoilerBox').addEventListener('change', (e) => { state.spoilerOn = e.target.checked; writeSave(); paintRows(); paintPanel(); });
  el('searchBox').addEventListener('input', (e) => { state.search = e.target.value; paintRows(); });
  el('btnChecklist').addEventListener('click', () => showPanel('Checklist'));
  el('btnRoadmap').addEventListener('click', () => showPanel('Roadmap'));
  el('btnAbout').addEventListener('click', () => showPanel('About'));
  el('btnExport').addEventListener('click', () => {
    const blob = new Blob([JSON.stringify({ game: 'Grand Theft Auto VI', earned: [...state.earned].sort((a, b) => a - b), exportedAt: new Date().toISOString() }, null, 2)], { type: 'application/json' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = 'gta6-trophy-progress.json';
    a.click();
    URL.revokeObjectURL(a.href);
  });
  el('btnImport').addEventListener('click', () => el('fileImport').click());
  el('fileImport').addEventListener('change', async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    try {
      const imported = JSON.parse(await file.text());
      const ids = (imported.earned || []).filter((n) => Number.isInteger(n) && findTrophy(n));
      state.earned = new Set(ids);
      writeSave();
      paintHeader();
      paintRows();
      paintPanel();
    } catch {
      alert('That file could not be read as trophy progress.');
    }
    e.target.value = '';
  });
}

boot();
