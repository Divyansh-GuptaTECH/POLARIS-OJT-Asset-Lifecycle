/* =====================================================
   app.js - 1 Storage  2 Roles  3 Rules  4 Render  5 Actions  6 GSAP intro
   ===================================================== */
const $ = (s, r = document) => r.querySelector(s);
const $$ = (s, r = document) => [...r.querySelectorAll(s)];
const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

/* ---------- 1. STORAGE: one versioned localStorage key ---------- */
const KEY = 'assetlifecycle_v2';
function load() { try { const d = JSON.parse(localStorage.getItem(KEY)); if (d && d.v === 3) return d; } catch {} return seed(); }
function save() { try { localStorage.setItem(KEY, JSON.stringify(S)); } catch { toast('Storage error: changes could not be saved.', 'bad'); } }
let S = load();
const logEv = m => { S.logs.unshift({ t: new Date().toISOString(), m }); S.logs = S.logs.slice(0, 40); }; // LIFO feed

/* ---------- 2. ROLES ---------- */
const isHead = () => S.role === 'IT Head';
function guard() { // RoleGuard: every write action calls this first
  if (isHead()) return true;
  toast('Auditors can record findings but cannot edit assets or licenses.', 'bad'); return false;
}
function applyRole() {
  document.body.classList.toggle('auditor', !isHead()); // CSS hides every .w control
  $('#role').value = S.role;
  const b = $('#rbadge'); b.textContent = isHead() ? 'Full write access' : 'Read-only register'; b.className = 'pill ' + (isHead() ? 'ok' : 'info');
  save();
}

/* ---------- 3. RULES ---------- */
const pill = (t, c) => `<span class="pill ${c}">${t}</span>`;
const stageC = { 'In Stock': 'info', Assigned: 'ok', 'In Repair': 'warn', Retired: 'mute', Disposed: 'mute' };
const auditC = { Verified: 'ok', Pending: 'mute', Missing: 'bad', Mismatch: 'warn' };

/* ---------- 4. RENDER ---------- */
function count(el, to, suf = '') { // GSAP number count-up (starts from the previous value)
  const o = { v: el._v || 0 }; el._v = to;
  gsap.to(o, { v: to, duration: 1, ease: 'power3.out', onUpdate: () => el.textContent = Math.round(o.v) + suf });
}
function renderDash() {
  const A = S.assets, done = A.filter(a => a.audit !== 'Pending').length, pct = Math.round(done / A.length * 100);
  const att = A.filter(a => !['Retired', 'Disposed'].includes(a.stage) && (a.stage === 'In Repair' || daysTo(a.warrantyEnd) <= 30));
  const badL = S.lics.filter(l => lStat(l)[0] !== 'Compliant');
  count($('#k1'), A.length); count($('#k2'), att.length); count($('#k3'), badL.length); count($('#k4'), done, '/' + A.length);
  gsap.to('#k4bar i', { width: pct + '%', duration: 1, ease: 'power3.out' });

  const items = []; // auto-computed critical list; each item jumps to its screen
  A.filter(a => ['Missing', 'Mismatch'].includes(a.audit)).forEach(a => items.push({ c: a.audit === 'Missing' ? 'bad' : 'warn', go: 'audit', t: `${a.tag} ${a.model}: ${a.audit} in audit` }));
  badL.forEach(l => { const [s, c] = lStat(l); items.push({ c, go: 'lics', t: `${l.product}: ${s}, ${l.used}/${l.seats} seats` }); });
  att.forEach(a => items.push({ c: a.stage === 'In Repair' ? 'warn' : wStat(a)[1], go: 'assets', t: `${a.tag}: ${a.stage === 'In Repair' ? 'in repair' : 'warranty ' + wStat(a)[0].toLowerCase()}` }));
  items.sort((x, y) => (y.c === 'bad') - (x.c === 'bad'));
  // role-aware headline, distribution bar and live ticker
  const pend = A.filter(a => a.audit === 'Pending').length, n = isHead() ? items.length : pend, cnt = s => A.filter(a => a.stage === s).length;
  const SC = { 'In Stock': '#9d95ff', Assigned: '#0ae448', 'In Repair': '#ff8709', Retired: '#5b625e', Disposed: '#3a3f3c' };
  $('#eyebrow').textContent = `${new Date().toLocaleDateString([], { weekday: 'long', day: 'numeric', month: 'long' })} / ${isHead() ? 'IT Department Head' : 'Compliance Auditor'}`;
  $('#dh').innerHTML = isHead() ? `<em class="mono">${n}</em> things need your attention today.` : `<em class="mono">${n}</em> assets still to audit this cycle.`;
  $('#seg').innerHTML = STAGES.map(s => `<i style="width:${cnt(s) / A.length * 100}%;background:${SC[s]}"></i>`).join('');
  $('#legend').innerHTML = STAGES.map(s => `<li><i style="background:${SC[s]}"></i>${s} <b class="mono">${cnt(s)}</b></li>`).join('');
  marquee($('#stripD'), [`${A.length} assets tracked`, `${cnt('Assigned')} assigned`, `${cnt('In Repair')} in repair`, `${S.lics.reduce((t, l) => t + l.used, 0)} license seats in use`, `${n} ${isHead() ? 'open items' : 'to audit'}`, `${pct}% audited`]);
  $('#alerts').innerHTML = items.slice(0, 9).map(x => `<li class="al ${x.c}" data-go="${x.go}" tabindex="0" role="link">${esc(x.t)}</li>`).join('') || '<li class="mut">All clear.</li>';
  $('#feed').innerHTML = S.logs.slice(0, 9).map(l => `<li><time class="mono">${new Date(l.t).toLocaleString([], { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })}</time>${esc(l.m)}</li>`).join('');
}

const F = { q: '', stage: 'All stages', war: 'All warranties' };
function renderAssets() {
  const q = F.q.toLowerCase();
  const rows = S.assets.filter(a => // live search + two dropdown filters in one .filter() pass
    (F.stage === 'All stages' || a.stage === F.stage) && (F.war === 'All warranties' || wStat(a)[0] === F.war) &&
    [a.tag, a.model, a.serial, a.owner].join(' ').toLowerCase().includes(q));
  $('#acount').textContent = `${rows.length} / ${S.assets.length}`;
  $('#abody').innerHTML = rows.length ? rows.map(a => {
    const [w, wc] = wStat(a);
    const st = isHead() ? `<select class="ssel" ${NEXT[a.stage].length ? '' : 'disabled title="Final state"'} data-id="${a.id}" aria-label="Stage for ${a.tag}">${[a.stage, ...NEXT[a.stage]].map(s => `<option ${s === a.stage ? 'selected' : ''}>${s}</option>`).join('')}</select>` : pill(a.stage, stageC[a.stage]);
    return `<tr><td class="mono"><button class="lnk" data-detail="${a.id}">${a.tag}</button></td><td>${esc(a.model)}<small>${a.type}</small></td><td class="mono">${esc(a.serial)}</td>
      <td>${esc(a.owner) || '<span class="mut">Unassigned</span>'}</td><td>${pill(w, wc)}<small class="mono">${a.warrantyEnd}</small></td><td>${st}</td></tr>`;
  }).join('') : '<tr><td colspan="6" class="empty">No assets match. <button class="btn" id="clr">Reset filters</button></td></tr>';
  labelCells();
}

function renderLics() {
  $('#licGrid').innerHTML = S.lics.map(l => {
    const [s, c] = lStat(l), d = daysTo(l.expiry), pct = Math.min(100, Math.round(l.used / l.seats * 100));
    return `<article class="card"><header><h3>${esc(l.product)}</h3>${pill(s, c)}</header>
      <p class="mut">${esc(l.vendor)} / renews <span class="mono">${l.expiry}</span> (${d < 0 ? -d + ' days ago' : d + ' days'})</p>
      <div class="bar ${c}"><i data-w="${pct}"></i></div>
      <small>${(l.people || []).length ? 'Assigned: ' + l.people.slice(0, 3).join(', ') + (l.people.length > 3 ? ' +' + (l.people.length - 3) : '') : ''}</small>
      <div class="seat"><span class="mono"><b>${l.used}</b> / ${l.seats} seats${l.used > l.seats ? ' (' + (l.used - l.seats) + ' over)' : ''}</span>
      <span class="w"><button class="btn sm" data-assign="${l.id}">Assign</button> <button class="btn sm" data-seat="${l.id}" data-d="-1" aria-label="Remove a seat from ${esc(l.product)}">-1</button> <button class="btn sm" data-seat="${l.id}" data-d="1" aria-label="Add a seat to ${esc(l.product)}">+1</button></span></div></article>`;
  }).join('');
  $$('#licGrid .bar i').forEach(i => gsap.to(i, { width: i.dataset.w + '%', duration: 1, ease: 'power3.out' }));
}

function renderAudit() {
  const A = S.assets, n = r => A.filter(a => a.audit === r).length, pct = Math.round((A.length - n('Pending')) / A.length * 100);
  const gaps = [...A.filter(a => ['Missing', 'Mismatch'].includes(a.audit)).map(a => `${a.tag}: ${a.audit}${a.note ? ' (' + a.note + ')' : ''}`),
    ...S.lics.filter(l => lStat(l)[0] !== 'Compliant').map(l => `${l.product}: ${lStat(l)[0]} (${l.used}/${l.seats} seats)`)];
  $('#findings').innerHTML = '<h3>Audit findings</h3>' + (gaps.length ? `<ul class="list">${gaps.map(g => `<li>${esc(g)}</li>`).join('')}</ul>` : '<p class="mut">No compliance gaps.</p>');
  $('#apct').textContent = pct + '%'; gsap.to('#abar i', { width: pct + '%', duration: .8, ease: 'power3.out' });
  $('#acounts').textContent = `Verified ${n('Verified')} / Pending ${n('Pending')} / Missing ${n('Missing')} / Mismatch ${n('Mismatch')}`;
  $('#audBody').innerHTML = A.map(a => `<tr><td class="mono">${a.tag}</td><td>${esc(a.model)}</td><td>${esc(a.owner) || '<span class="mut">Unassigned</span>'}</td>
    <td>${pill(a.audit, auditC[a.audit])}</td><td><input class="note" data-note="${a.id}" value="${esc(a.note)}" placeholder="Add note" aria-label="Note for ${a.tag}"></td>
    <td class="abtns">${['Verified', 'Missing', 'Mismatch'].map(r => `<button class="btn ab ${a.audit === r ? 'on ' + auditC[r] : ''}" data-mark="${a.id}" data-r="${r}" aria-label="Mark ${a.tag} ${r}">${r}</button>`).join('')}</td></tr>`).join('');
}
const renderAll = () => { renderDash(); renderAssets(); renderLics(); renderAudit(); labelCells(); };

const TITLES = { dash: 'Dashboard', assets: 'Asset Register', lics: 'Licenses', audit: 'Floor Audit', about: 'About / Help' };
function show(s) { // screen switch + staggered card entrance
  $$('.screen').forEach(x => x.classList.toggle('on', x.id === s));
  $$('#nav button').forEach(b => b.classList.toggle('on', b.dataset.s === s));
  $('#title').textContent = TITLES[s]; $('#side').classList.remove('open');
  if (s === 'dash') { renderDash(); gsap.from('#dh', { y: 40, opacity: 0, duration: .9, ease: 'power4.out' }); gsap.from('#seg i', { scaleX: 0, transformOrigin: '0 50%', duration: .9, stagger: .08, ease: 'power3.out', delay: .3 }); }
  if (s === 'lics') renderLics();
  gsap.from('#title', { y: 14, opacity: 0, duration: .5, ease: 'power3.out' });
  gsap.from($$(`#${s} .card, #${s} .tools, #${s} .dhero, #${s} .strip`), { y: 18, opacity: 0, duration: .5, stagger: .06, ease: 'power3.out', clearProps: 'all' });
}
function toast(m, t = 'ok') {
  const e = document.createElement('div'); e.className = 'toast ' + t; e.textContent = m; $('#toasts').append(e);
  gsap.from(e, { x: 40, opacity: 0, duration: .35, ease: 'power3.out' });
  gsap.to(e, { opacity: 0, x: 40, duration: .3, delay: 3.2, onComplete: () => e.remove() });
}

/* ---------- 5. ACTIONS ---------- */
function pickOwner(cur, ok, no, title = 'Assign asset') {
  $('#otitle').textContent = title; // small dialog to choose the employee
  const d = $('#odlg'); $('#osel').innerHTML = EMPLOYEES.map(e => `<option ${e === cur ? 'selected' : ''}>${e}</option>`).join('');
  let done = false;
  const finish = isOk => { if (done) return; done = true; d.close(); isOk ? ok($('#osel').value) : no(); };
  $('#ook').onclick = () => finish(true);
  $('#ocancel').onclick = () => finish(false);
  d.oncancel = e => { e.preventDefault(); finish(false); };
  d.showModal();
}
function changeStage(id, to) {
  if (!guard()) return renderAssets();
  const a = S.assets.find(x => x.id === id);
  if (!NEXT[a.stage].includes(to)) { // deterministic validation
    toast(a.stage === 'Disposed' ? 'Disposed assets are locked and cannot change stage.' : `Not allowed: ${a.stage} cannot move to ${to}.`, 'bad');
    return renderAssets();
  }
  const apply = () => { if (to === 'In Stock') a.owner = '';
    logEv(`${a.tag}: ${a.stage} to ${to}${to === 'Assigned' ? ' (' + a.owner + ')' : ''}`);
    toast(to === 'Assigned' ? `Asset ${a.tag} assigned to ${a.owner}.` : `${a.tag} moved to ${to}.`);
    a.hist.unshift({ t: new Date().toISOString(), m: `${a.stage} to ${to}${to === 'Assigned' ? ' (' + a.owner + ')' : ''}` });
    a.stage = to; save(); renderAll(); };
  if (to === 'Assigned') pickOwner(a.owner, o => { a.owner = o; apply(); }, renderAssets); else apply();
}
function mark(id, r) {
  const a = S.assets.find(x => x.id === id); a.audit = r; a.hist.unshift({ t: new Date().toISOString(), m: `Audit: ${r}` }); logEv(`Audit: ${a.tag} marked ${r}`);
  save(); renderAll(); toast(`${a.tag} marked ${r}.`, r === 'Verified' ? 'ok' : r === 'Missing' ? 'bad' : 'warn');
}
function exportCsv() {
  const rows = S.assets.map(a => [a.tag, a.model, a.serial, a.owner, a.stage, a.audit, a.note]);
  const csv = [['Tag', 'Device', 'Serial', 'Owner', 'Stage', 'Audit result', 'Note'], ...rows].map(r => r.map(c => `"${String(c).replace(/"/g, '""')}"`).join(',')).join('\n');
  const a = document.createElement('a'); a.href = URL.createObjectURL(new Blob([csv], { type: 'text/csv' })); a.download = 'audit-records.csv'; a.click();
  URL.revokeObjectURL(a.href); toast(`Audit CSV exported (${rows.length} records).`);
}

document.addEventListener('click', e => {
  const t = e.target, go = t.closest('[data-go]'), seat = t.closest('[data-seat]'), mk = t.closest('[data-mark]'), nav = t.closest('#nav button'), dt = t.closest('[data-detail]'), asg = t.closest('[data-assign]');
  if (nav) show(nav.dataset.s);
  if (dt) openDetail(dt.dataset.detail);
  if (asg && guard()) assignSeat(asg.dataset.assign);
  if (go) show(go.dataset.go);
  if (mk) mark(mk.dataset.mark, mk.dataset.r);
  if (seat && guard()) { // quick seat control: recalculates status, KPIs, saves, logs
    const l = S.lics.find(x => x.id === seat.dataset.seat); l.used = Math.max(0, l.used + +seat.dataset.d); if (+seat.dataset.d < 0 && l.people?.length) l.people.pop();
    logEv(`${l.product}: seats in use now ${l.used} of ${l.seats}`); save(); renderAll();
    const [s, c] = lStat(l); toast(`${l.product}: ${l.used} of ${l.seats} seats (${s}).`, c);
  }
  if (t.id === 'clr') { F.q = ''; F.stage = 'All stages'; F.war = 'All warranties'; $('#q').value = ''; $('#fStage').value = F.stage; $('#fWar').value = F.war; renderAssets(); }
});
document.addEventListener('keydown', e => { if (e.key === 'Enter' && e.target.dataset.go) show(e.target.dataset.go); });
document.addEventListener('change', e => {
  if (e.target.classList.contains('ssel')) changeStage(e.target.dataset.id, e.target.value);
  if (e.target.dataset.note) { S.assets.find(a => a.id === e.target.dataset.note).note = e.target.value; save(); toast('Auditor note saved.'); }
});
$('#q').oninput = e => { F.q = e.target.value; renderAssets(); };
$('#fStage').onchange = e => { F.stage = e.target.value; renderAssets(); };
$('#fWar').onchange = e => { F.war = e.target.value; renderAssets(); };
$('#role').onchange = e => { S.role = e.target.value; applyRole(); renderAll(); toast(`Role switched to ${e.target.selectedOptions[0].text}.`); };
$('#csv').onclick = exportCsv;
$('#menu').onclick = () => $('#side').classList.toggle('open');
$('#reset').onclick = () => { if (!confirm('Reset all demo data?')) return; const r = S.role; try { localStorage.removeItem(KEY); } catch {} S = seed(); S.role = r; save(); applyRole(); renderAll(); toast('Demo data reset.'); };
$('#add').onclick = () => { if (guard()) { $('#aform').reset(); $('#aerr').innerHTML = ''; $('#dlg').showModal(); } };
$('#cancelAdd').onclick = () => $('#dlg').close();

$('#aform').onsubmit = e => { // add-asset form: validation, then save
  e.preventDefault(); if (!guard()) return;
  const f = Object.fromEntries(new FormData(e.target)), tag = f.tag.trim().toUpperCase(), serial = f.serial.trim(), err = [];
  if (!tag) err.push('Asset tag is required.'); if (!f.model.trim()) err.push('Model is required.'); if (!serial) err.push('Serial number is required.');
  if (!f.purchase) err.push('Purchase date is required.'); if (!f.warranty) err.push('Warranty end date is required.');
  if (tag && S.assets.some(a => a.tag === tag)) err.push(`Tag ${esc(tag)} already exists. Use a unique tag.`);
  if (serial && S.assets.some(a => a.serial.toLowerCase() === serial.toLowerCase())) err.push(`Serial ${esc(serial)} is already registered.`);
  if (f.purchase && f.warranty && f.warranty < f.purchase) err.push('Warranty end cannot be before the purchase date.');
  $('#aerr').innerHTML = err.map(x => `<li>${x}</li>`).join(''); if (err.length) return;
  S.assets.unshift({ id: 'a' + Date.now(), tag, type: f.type, model: f.model.trim(), serial, purchase: f.purchase, cost: +f.cost || 0,
    warrantyEnd: f.warranty, stage: 'In Stock', owner: '', audit: 'Pending', note: '', hist: [{ t: new Date().toISOString(), m: 'Registered (In Stock)' }] });
  logEv(`${tag} registered (In Stock)`); save(); renderAll(); $('#dlg').close(); toast(`Asset ${tag} added to the register.`);
};


const calm = matchMedia('(prefers-reduced-motion: reduce)').matches; // skip idle motion if the user asked for less
/* ---------- 5b. VISUALS: asset cube, marquee, card spotlight ---------- */
const DEV = [ // one device per cube face: [type, tag, accent, svg paths, photo url]
  ['Laptop', 'AST-1001', '#0ae448', '<rect x="22" y="28" width="56" height="36" rx="2"/><path d="M12 72h76l-6 6H18z"/>', 'assets/laptop.jpg'],
  ['Server', 'AST-1004', '#ff8709', '<rect x="20" y="22" width="60" height="16" rx="2"/><rect x="20" y="42" width="60" height="16" rx="2"/><rect x="20" y="62" width="60" height="16" rx="2"/><path d="M28 30h18M28 50h18M28 70h18"/><circle cx="70" cy="30" r="1.5"/><circle cx="70" cy="50" r="1.5"/><circle cx="70" cy="70" r="1.5"/>', 'assets/server.jpg'],
  ['Monitor', 'AST-1005', '#9d95ff', '<rect x="14" y="22" width="72" height="46" rx="3"/><path d="M50 68v10M36 80h28"/>', 'assets/monitor.jpg'],
  ['Phone', 'AST-1006', '#0ae448', '<rect x="34" y="14" width="32" height="72" rx="7"/><path d="M46 21h8M46 80h8"/>', 'assets/phone.jpg'],
  ['Tablet', 'AST-1007', '#ff8709', '<rect x="20" y="20" width="60" height="60" rx="6"/><circle cx="50" cy="73" r="2"/>', 'assets/tablet.jpg'],
  ['Network', 'AST-1008', '#9d95ff', '<rect x="12" y="42" width="76" height="22" rx="2"/><path d="M22 53h4M32 53h4M42 53h4M52 53h4M62 53h4M72 53h4M30 42V28M70 42V28"/>', 'assets/network.jpg']
];
const FACES = ['rotateY(0deg)', 'rotateY(90deg)', 'rotateY(180deg)', 'rotateY(-90deg)', 'rotateX(90deg)', 'rotateX(-90deg)'];
function buildCube(host) {
  host.setAttribute('aria-hidden', 'true');
  host.innerHTML = `<div class="tilt"><div class="cube">${DEV.map((d, i) => `<div class="face" style="--t:${FACES[i]};--c:${d[2]}">${d[4] ? `<img src="${d[4]}" alt="">` : `<svg viewBox="0 0 100 100">${d[3]}</svg>`}<i>${d[1]}</i><b>${d[0]}</b></div>`).join('')}</div></div>`;
  const tilt = $('.tilt', host), cube = $('.cube', host), area = host.closest('#intro, .dhero') || host;
  gsap.set(cube, { rotationX: -24, '--e': '0px' });
  if (!calm) gsap.to(cube, { rotationY: 360, duration: 26, repeat: -1, ease: 'none' }); // constant spin
  if (!calm && !host.classList.contains('mark')) gsap.to(host, { y: -10, duration: 3, yoyo: true, repeat: -1, ease: 'sine.inOut' }); // float
  area.addEventListener('pointermove', e => { const r = area.getBoundingClientRect(); // follow the pointer
    gsap.to(tilt, { rotationY: ((e.clientX - r.left) / r.width - .5) * 36, rotationX: -((e.clientY - r.top) / r.height - .5) * 36, duration: .9, ease: 'power3.out' }); });
  host.addEventListener('pointerenter', () => gsap.to(cube, { '--e': '34px', duration: .6, ease: 'power3.out' })); // faces break apart on hover
  host.addEventListener('pointerleave', () => gsap.to(cube, { '--e': '0px', duration: .6, ease: 'power3.out' }));
}
function marquee(el, items) {
  el.setAttribute('aria-hidden', 'true'); // endless ticker, rebuilt only when the text changes
  const key = items.join('|'); if (el._k === key) return; el._k = key; el._t?.kill?.();
  const row = `<span>${items.map(t => `<b>${esc(t)}</b>`).join('')}</span>`; el.innerHTML = `<div>${row}${row}</div>`;
  el._t = calm ? null : gsap.to(el.firstChild, { xPercent: -50, duration: items.length * 6, ease: 'none', repeat: -1 });
}
document.addEventListener('pointermove', e => { const c = e.target.closest?.('.card'); // soft spotlight follows the cursor on cards
  if (c) { const r = c.getBoundingClientRect(); c.style.setProperty('--mx', e.clientX - r.left + 'px'); c.style.setProperty('--my', e.clientY - r.top + 'px'); } });
buildCube($('#cubeI')); buildCube($('#cubeD')); buildCube($('#cubeS'));
marquee($('#stripI'), ['Laptops', 'Servers', 'Monitors', 'Phones', 'Tablets', 'Network gear', 'Software licenses', 'Floor audits', 'Warranty alerts', 'Lifecycle history']);

/* ---------- 6. GSAP ENTRY PAGE ---------- */
$$('#hero .w').forEach(w => w.innerHTML = [...w.textContent].map(c => `<span class="c">${c}</span>`).join('')); // split into letters
const master = gsap.timeline({ defaults: { ease: 'power4.out' } }) // master timeline: Replay restarts this
  .from('.c', { y: 60, opacity: 0, duration: .9, stagger: .035 })
  .from('.shape', { scale: 0, rotation: -90, opacity: 0, duration: .8, stagger: .12, ease: 'back.out(1.7)' }, .2)
  .from('#cubeI', { scale: .5, opacity: 0, rotationY: -60, duration: 1.3 }, .3)
  .from('.sub, .cta .btn', { y: 20, opacity: 0, duration: .6, stagger: .08 }, '-=.4');
const O = { transformOrigin: '50% 50%', repeat: -1 }; // continuous idle motion, one per shape
if (!calm) gsap.to('#pin .mv', { ...O, rotation: 360, duration: 9, ease: 'none' });
if (!calm) gsap.to('#spark .mv', { ...O, scale: 1.15, rotation: 45, duration: 1.6, yoyo: true, ease: 'sine.inOut' });
if (!calm) gsap.to('#coil .mv', { transformOrigin: '50% 100%', repeat: -1, scaleY: .82, duration: .9, yoyo: true, ease: 'power1.inOut' });
if (!calm) gsap.to('#bolt .mv', { ...O, skewX: -12, duration: 1.2, yoyo: true, ease: 'sine.inOut' });
$$('.shape').forEach(s => { // hover burst
  s.onpointerenter = () => gsap.to(s, { scale: 1.3, rotation: '+=180', duration: .5, ease: 'back.out(2)', overwrite: 'auto' });
  s.onpointerleave = () => gsap.to(s, { scale: 1, duration: .4, ease: 'power3.out', overwrite: 'auto' });
});
$('#replay').onclick = () => master.restart();

function enter(role) { // exit transition, then reveal the workspace
  S.role = role; applyRole();
  gsap.to('#intro', { y: -30, opacity: 0, duration: .45, ease: 'power2.in', onComplete: () => {
    $('#intro').hidden = true; $('#app').hidden = false; show('dash'); gsap.from('#side, .top', { opacity: 0, y: -10, duration: .4, stagger: .08 }); } });
}
$$('[data-enter]').forEach(b => b.onclick = () => enter(b.dataset.enter));
$('#back').onclick = () => { $('#app').hidden = true; $('#intro').hidden = false; gsap.set('#intro', { y: 0, opacity: 1 }); master.restart(); };

/* ---------- 5c. DETAIL, LICENSE FORM, SEAT ASSIGNMENT ---------- */
function openDetail(id) { // asset detail with history timeline
  const a = S.assets.find(x => x.id === id), [w] = wStat(a);
  $('#dbody').innerHTML = `<h3 class="mono">${a.tag}</h3><p class="mut">${esc(a.model)} (${a.type})</p><dl class="dl">${[['Serial', a.serial], ['Owner', a.owner || 'Unassigned'], ['Stage', a.stage],
    ['Purchased', a.purchase], ['Cost', 'INR ' + a.cost.toLocaleString('en-IN')], ['Warranty end', `${a.warrantyEnd} (${w})`], ['Audit', a.audit]].map(([k, v]) => `<dt>${k}</dt><dd class="mono">${esc(v)}</dd>`).join('')}</dl>
    <h3>History</h3><ol class="tl">${a.hist.map(h => `<li><time class="mono">${new Date(h.t).toLocaleDateString()}</time>${esc(h.m)}</li>`).join('')}</ol>`;
  $('#ddlg').showModal();
}
function assignSeat(id) { // assign a license seat to an employee
  const l = S.lics.find(x => x.id === id); l.people = l.people || [];
  pickOwner('', o => {
    if (l.people.includes(o)) return toast(`${o} already holds a ${l.product} seat.`, 'warn');
    l.people.push(o); l.used++; logEv(`${l.product}: seat assigned to ${o}`); save(); renderAll();
    const [s, c] = lStat(l); toast(`Seat assigned to ${o}. ${l.used} of ${l.seats} seats (${s}).`, c);
  }, () => {}, 'Assign seat');
}
const labelCells = () => $$('table').forEach(t => { const h = [...t.tHead.rows[0].cells].map(c => c.textContent); // labels for the phone card layout
  [...t.tBodies[0].rows].forEach(r => [...r.cells].forEach((c, i) => c.dataset.label = h[i] || '')); });
$('#addLic').onclick = () => { if (guard()) { $('#lform').reset(); $('#lerr').innerHTML = ''; $('#ldlg').showModal(); } };
$('#cancelLic').onclick = () => $('#ldlg').close(); $('#dclose').onclick = () => $('#ddlg').close();
$('#lform').onsubmit = e => {
  e.preventDefault(); if (!guard()) return;
  const f = Object.fromEntries(new FormData(e.target)), p = f.product.trim(), err = [], seats = +f.seats;
  if (!p) err.push('Product is required.'); if (!f.vendor.trim()) err.push('Vendor is required.');
  if (!Number.isInteger(seats) || seats < 1) err.push('Seats purchased must be a whole number of at least 1.'); if (!f.expiry) err.push('Expiry date is required.');
  if (p && S.lics.some(l => l.product.toLowerCase() === p.toLowerCase())) err.push(`${esc(p)} already exists.`);
  $('#lerr').innerHTML = err.map(x => `<li>${x}</li>`).join(''); if (err.length) return;
  S.lics.push({ id: 'l' + Date.now(), product: p, vendor: f.vendor.trim(), seats, used: 0, expiry: f.expiry, people: [] });
  logEv(`${p} license added (${seats} seats)`); save(); renderAll(); $('#ldlg').close(); toast(`License ${p} added.`);
};

/* ---------- START ---------- */
$('#fStage').innerHTML = ['All stages', ...STAGES].map(s => `<option>${s}</option>`).join('');
applyRole(); renderAll();


/* ---------- 8. LIVELY ANIMATED IT OFFICE & SERVER ROOM BACKGROUND ---------- */
(function initLiveOffice() {
  const cv = document.getElementById('officeCanvas');
  if (!cv) return;
  const ctx = cv.getContext('2d');
  let W = 0, H = 0, dpr = Math.min(window.devicePixelRatio || 1, 2);

  // Server racks inside the glass server room (right-back half)
  const racks = [
    { rx: 0.56, rw: 0.085, leds: [] },
    { rx: 0.66, rw: 0.085, leds: [] },
    { rx: 0.76, rw: 0.085, leds: [] },
    { rx: 0.86, rw: 0.085, leds: [] }
  ];
  const ledColors = ['#0ae448', '#0ae448', '#0ae448', '#38bdf8', '#38bdf8', '#ff8709'];
  racks.forEach((rk, ri) => {
    for (let row = 0; row < 20; row++) {
      for (let col = 0; col < 5; col++) {
        if ((row * 7 + col * 3 + ri) % 4 === 0) continue;
        rk.leds.push({
          row, col,
          c: ledColors[(row * 5 + col + ri) % ledColors.length],
          phase: Math.random() * Math.PI * 2,
          speed: 0.8 + Math.random() * 3.8,
          blink: Math.random() > 0.35
        });
      }
    }
  });

  // Workstations (IT Engineers working at glowing multi-monitor desks)
  const desks = [
    { x: 0.34, y: 0.62, s: 0.88, mon: 2, phase: 0.4, typing: 1.2 },
    { x: 0.54, y: 0.65, s: 1.0,  mon: 2, phase: 1.9, typing: 0.9 },
    { x: 0.78, y: 0.67, s: 1.08, mon: 2, phase: 3.5, typing: 1.5 }
  ];

  // Silhouette technician occasionally walking behind the glass corridor
  const walker = { x: 0.45, dir: 1, speed: 0.018, pause: 0 };

  // Subtle floating dust / ambient light motes
  const motes = Array.from({ length: 34 }, () => ({
    x: Math.random(), y: Math.random(),
    r: 0.8 + Math.random() * 1.8,
    vx: (Math.random() - 0.5) * 0.008,
    vy: -0.004 - Math.random() * 0.009,
    a: 0.1 + Math.random() * 0.25
  }));

  // Data light pulses traveling along ceiling cable trays
  const pulses = Array.from({ length: 7 }, (_, i) => ({
    t: Math.random(), speed: 0.08 + Math.random() * 0.12, lane: i % 3,
    c: i % 3 === 0 ? '#0ae448' : i % 3 === 1 ? '#38bdf8' : '#ff8709'
  }));

  function resize() {
    W = window.innerWidth + 32;
    H = window.innerHeight + 32;
    cv.width = Math.round(W * dpr);
    cv.height = Math.round(H * dpr);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  }
  resize();
  window.addEventListener('resize', resize);

  // Subtle depth parallax with pointer
  if (!calm) {
    window.addEventListener('pointermove', e => {
      const appEl = document.getElementById('app');
      if (!appEl || appEl.hidden) return;
      const dx = (e.clientX / window.innerWidth - 0.5) * -14;
      const dy = (e.clientY / window.innerHeight - 0.5) * -10;
      cv.style.transform = `translate3d(${dx.toFixed(1)}px, ${dy.toFixed(1)}px, 0)`;
    });
  }

  let last = performance.now();
  function draw(now) {
    const dt = Math.min((now - last) / 1000, 0.05);
    last = now;
    const t = now * 0.001;

    // Only animate while workspace is visible
    const appEl = document.getElementById('app');
    if (appEl && appEl.hidden) {
      requestAnimationFrame(draw);
      return;
    }

    ctx.clearRect(0, 0, W, H);

    // 1. ARCHITECTURAL OFFICE ROOM BACKDROP (Ceiling, back wall, perspective floor)
    const wallY = H * 0.62;
    const ceilGrad = ctx.createLinearGradient(0, 0, 0, wallY);
    ceilGrad.addColorStop(0, '#0b1012');
    ceilGrad.addColorStop(0.45, '#131d21');
    ceilGrad.addColorStop(1, '#0e1518');
    ctx.fillStyle = ceilGrad;
    ctx.fillRect(0, 0, W, wallY);

    const floorGrad = ctx.createLinearGradient(0, wallY, 0, H);
    floorGrad.addColorStop(0, '#0d1315');
    floorGrad.addColorStop(1, '#07090a');
    ctx.fillStyle = floorGrad;
    ctx.fillRect(0, wallY, W, H - wallY);

    // Subtle architectural ceiling grid & recessed LED light strips
    ctx.strokeStyle = 'rgba(180, 220, 235, 0.045)';
    ctx.lineWidth = 1;
    for (let i = 0; i < 9; i++) {
      const x = W * (0.12 + i * 0.11);
      ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(W * 0.5 + (x - W * 0.5) * 0.65, H * 0.16); ctx.stroke();
    }

    // Glowing overhead office light fixtures + soft volumetric down-beams
    const lights = [0.28, 0.52, 0.78];
    lights.forEach((lx, i) => {
      const cx = W * lx;
      const flicker = 0.94 + Math.sin(t * 1.4 + i * 2) * 0.06;
      const beam = ctx.createRadialGradient(cx, H * 0.06, 8, cx, H * 0.28, W * 0.22);
      beam.addColorStop(0, `rgba(140, 215, 235, ${0.13 * flicker})`);
      beam.addColorStop(0.5, `rgba(10, 228, 72, ${0.03 * flicker})`);
      beam.addColorStop(1, 'rgba(0,0,0,0)');
      ctx.fillStyle = beam;
      ctx.fillRect(cx - W * 0.25, 0, W * 0.5, H * 0.55);

      ctx.fillStyle = `rgba(210, 240, 248, ${0.42 * flicker})`;
      ctx.fillRect(cx - 52, H * 0.04, 104, 3);
    });

    // 2. GLASS-WALLED SERVER ROOM (Right & Center-Right)
    const glassX = W * 0.51;
    const glassTop = H * 0.12;
    const glassH = wallY - glassTop + H * 0.04;

    // Server room interior depth glow
    const srGlow = ctx.createRadialGradient(W * 0.75, H * 0.36, 20, W * 0.75, H * 0.36, W * 0.32);
    srGlow.addColorStop(0, 'rgba(10, 228, 72, 0.11)');
    srGlow.addColorStop(0.5, 'rgba(56, 189, 248, 0.07)');
    srGlow.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.fillStyle = srGlow;
    ctx.fillRect(glassX, glassTop, W - glassX, glassH);

    // Draw Server Racks + Live Blinking LEDs
    racks.forEach(rk => {
      const x = W * rk.rx, w = W * rk.rw;
      const y = H * 0.16, h = wallY - y + H * 0.03;

      // Rack chassis
      ctx.fillStyle = 'rgba(10, 14, 16, 0.92)';
      ctx.fillRect(x, y, w, h);
      ctx.strokeStyle = 'rgba(160, 210, 225, 0.12)';
      ctx.lineWidth = 1;
      ctx.strokeRect(x, y, w, h);

      // Rack horizontal blade dividers
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.04)';
      for (let u = 1; u < 20; u++) {
        const uy = y + (h / 20) * u;
        ctx.beginPath(); ctx.moveTo(x + 3, uy); ctx.lineTo(x + w - 3, uy); ctx.stroke();
      }

      // Live blinking server LEDs
      rk.leds.forEach(ld => {
        const ly = y + (h / 20) * (ld.row + 0.5);
        const lx = x + 8 + (w - 16) * (ld.col / 4.2);
        let alpha = 0.75;
        if (ld.blink && !calm) {
          const wave = Math.sin(t * ld.speed + ld.phase);
          alpha = wave > 0.15 ? 0.92 : 0.16;
        }
        ctx.fillStyle = ld.c;
        ctx.globalAlpha = alpha;
        ctx.fillRect(lx, ly - 1.2, 3.2, 2.2);
        if (alpha > 0.7) {
          ctx.globalAlpha = 0.22;
          ctx.fillRect(lx - 2, ly - 3, 7.2, 5.8);
        }
      });
      ctx.globalAlpha = 1;
    });

    // Overhead fiber-optic / data pulses moving across server room ceiling
    if (!calm) {
      pulses.forEach(p => {
        p.t = (p.t + p.speed * dt) % 1;
        const py = H * (0.135 + p.lane * 0.011);
        const px = glassX + p.t * (W - glassX);
        const g = ctx.createLinearGradient(px - 36, py, px + 8, py);
        g.addColorStop(0, 'rgba(0,0,0,0)');
        g.addColorStop(1, p.c);
        ctx.strokeStyle = g;
        ctx.globalAlpha = 0.55;
        ctx.lineWidth = 1.6;
        ctx.beginPath(); ctx.moveTo(px - 36, py); ctx.lineTo(px + 8, py); ctx.stroke();
      });
      ctx.globalAlpha = 1;
    }

    // Walking technician silhouette behind the glass partition
    if (!calm) {
      if (walker.pause > 0) {
        walker.pause -= dt;
      } else {
        walker.x += walker.dir * walker.speed * dt;
        if (walker.x > 0.92) { walker.dir = -1; walker.pause = 2.5; }
        if (walker.x < 0.54) { walker.dir = 1; walker.pause = 3.2; }
      }
      const wx = W * walker.x;
      const wy = wallY + H * 0.02;
      const bob = walker.pause > 0 ? 0 : Math.abs(Math.sin(t * 5.2)) * 3;
      ctx.fillStyle = 'rgba(18, 28, 32, 0.58)';
      // Head + torso silhouette
      ctx.beginPath(); ctx.arc(wx, wy - 96 - bob, 11, 0, Math.PI * 2); ctx.fill();
      ctx.beginPath();
      ctx.roundRect(wx - 15, wy - 82 - bob, 30, 52, 8);
      ctx.fill();
      // Subtle glowing tablet in hand
      ctx.fillStyle = 'rgba(56, 189, 248, 0.45)';
      ctx.fillRect(wx + (walker.dir > 0 ? 8 : -18), wy - 62 - bob, 10, 7);
    }

    // Glass partition mullions & diagonal soft glass sheen
    const sheen = ctx.createLinearGradient(glassX, glassTop, W, glassTop + glassH);
    sheen.addColorStop(0, 'rgba(190, 230, 245, 0.055)');
    sheen.addColorStop(0.45, 'rgba(190, 230, 245, 0.015)');
    sheen.addColorStop(0.52, 'rgba(190, 230, 245, 0.06)');
    sheen.addColorStop(1, 'rgba(190, 230, 245, 0.01)');
    ctx.fillStyle = sheen;
    ctx.fillRect(glassX, glassTop, W - glassX, glassH);

    ctx.strokeStyle = 'rgba(160, 200, 215, 0.16)';
    ctx.lineWidth = 2;
    ctx.strokeRect(glassX, glassTop, W - glassX, glassH);
    [0.64, 0.77, 0.90].forEach(gx => {
      ctx.beginPath(); ctx.moveTo(W * gx, glassTop); ctx.lineTo(W * gx, glassTop + glassH); ctx.stroke();
    });

    // 3. LEFT WALL STATUS MONITOR (Wall-mounted NOC screen)
    const nocX = W * 0.25, nocY = H * 0.24, nocW = W * 0.18, nocH = H * 0.16;
    ctx.fillStyle = 'rgba(10, 16, 18, 0.88)';
    ctx.fillRect(nocX, nocY, nocW, nocH);
    ctx.strokeStyle = 'rgba(10, 228, 72, 0.25)';
    ctx.lineWidth = 1.2;
    ctx.strokeRect(nocX, nocY, nocW, nocH);

    // Animated live telemetry sine wave inside NOC wall screen
    ctx.strokeStyle = 'rgba(10, 228, 72, 0.55)';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    for (let px = 0; px < nocW - 16; px += 4) {
      const py = nocY + nocH * 0.55 + Math.sin(px * 0.07 + t * 2.4) * 10 + Math.cos(px * 0.03 - t * 1.5) * 6;
      if (px === 0) ctx.moveTo(nocX + 8 + px, py); else ctx.lineTo(nocX + 8 + px, py);
    }
    ctx.stroke();

    // Small animated bars inside NOC screen
    for (let b = 0; b < 6; b++) {
      const bh = 8 + Math.abs(Math.sin(t * 1.8 + b * 1.1)) * (nocH * 0.28);
      ctx.fillStyle = b === 4 ? 'rgba(255, 135, 9, 0.45)' : 'rgba(56, 189, 248, 0.4)';
      ctx.fillRect(nocX + 10 + b * (nocW * 0.13), nocY + nocH - 8 - bh, nocW * 0.08, bh);
    }

    // 4. IT ENGINEER WORKSTATIONS (Desks + Dual Monitors + Seated Silhouettes)
    desks.forEach((d, idx) => {
      const dx = W * d.x, dy = H * d.y, sc = d.s;
      const deskW = 190 * sc;

      // Desk surface
      ctx.fillStyle = 'rgba(18, 24, 26, 0.92)';
      ctx.fillRect(dx - deskW / 2, dy, deskW, 10 * sc);
      ctx.fillStyle = 'rgba(12, 16, 18, 0.95)';
      ctx.fillRect(dx - deskW / 2 + 12, dy + 10 * sc, 7 * sc, H - dy);
      ctx.fillRect(dx + deskW / 2 - 19, dy + 10 * sc, 7 * sc, H - dy);

      // Dual monitors with subtle live code/activity glow
      for (let m = 0; m < d.mon; m++) {
        const mw = 64 * sc, mh = 38 * sc;
        const mx = dx + (m === 0 ? -mw - 4 : 4);
        const my = dy - mh - 12 * sc;

        // Ambient screen glow halo
        const glow = ctx.createRadialGradient(mx + mw / 2, my + mh / 2, 4, mx + mw / 2, my + mh / 2, 75 * sc);
        glow.addColorStop(0, m === 0 ? 'rgba(56, 189, 248, 0.16)' : 'rgba(10, 228, 72, 0.13)');
        glow.addColorStop(1, 'rgba(0,0,0,0)');
        ctx.fillStyle = glow;
        ctx.fillRect(mx - 45, my - 35, mw + 90, mh + 75);

        // Monitor stand & frame
        ctx.fillStyle = '#0d1214';
        ctx.fillRect(mx + mw / 2 - 3, my + mh, 6, 12 * sc);
        ctx.fillRect(mx, my, mw, mh);
        ctx.strokeStyle = 'rgba(180, 225, 240, 0.22)';
        ctx.lineWidth = 1;
        ctx.strokeRect(mx, my, mw, mh);

        // Live scrolling UI/code lines on monitor
        const scroll = calm ? 0 : (t * 14 + idx * 11 + m * 7) % 12;
        for (let ln = 0; ln < 5; ln++) {
          const ly = my + 6 + ((ln * 6 + scroll) % (mh - 10));
          const lw = (18 + ((ln * 17 + m * 9 + idx * 5) % 34)) * sc;
          ctx.fillStyle = ln === 2 ? 'rgba(10, 228, 72, 0.45)' : 'rgba(148, 210, 235, 0.32)';
          ctx.fillRect(mx + 6, ly, Math.min(lw, mw - 12), 2);
        }
      }

      // Seated IT Engineer silhouette with gentle breathing & typing motion
      const sway = calm ? 0 : Math.sin(t * 1.1 + d.phase) * 2.5;
      const headTilt = calm ? 0 : Math.sin(t * 0.7 + d.phase) * 1.8;
      const px = dx + 14 * sc + sway;
      const py = dy + 4 * sc;

      // Office chair back
      ctx.fillStyle = 'rgba(10, 13, 14, 0.96)';
      ctx.beginPath();
      ctx.roundRect(px - 22 * sc, py - 10 * sc, 44 * sc, 56 * sc, 10);
      ctx.fill();

      // Shoulders & head
      ctx.fillStyle = 'rgba(16, 22, 25, 0.96)';
      ctx.beginPath();
      ctx.ellipse(px, py - 8 * sc, 24 * sc, 18 * sc, 0, Math.PI, 0);
      ctx.fill();
      ctx.beginPath();
      ctx.arc(px + headTilt, py - 34 * sc, 12.5 * sc, 0, Math.PI * 2);
      ctx.fill();

      // Soft rim light on engineer's shoulders from monitor glow
      ctx.strokeStyle = 'rgba(120, 215, 240, 0.22)';
      ctx.lineWidth = 1.4;
      ctx.beginPath();
      ctx.arc(px + headTilt, py - 34 * sc, 12.5 * sc, Math.PI * 1.1, Math.PI * 1.9);
      ctx.stroke();
    });

    // 5. SUBTLE FLOATING AMBIENT DUST / DATA MOTES
    motes.forEach(m => {
      if (!calm) {
        m.x = (m.x + m.vx * dt + 1) % 1;
        m.y = (m.y + m.vy * dt + 1) % 1;
      }
      ctx.fillStyle = `rgba(200, 245, 225, ${m.a})`;
      ctx.beginPath();
      ctx.arc(m.x * W, m.y * H, m.r, 0, Math.PI * 2);
      ctx.fill();
    });

    requestAnimationFrame(draw);
  }
  requestAnimationFrame(draw);
})();
