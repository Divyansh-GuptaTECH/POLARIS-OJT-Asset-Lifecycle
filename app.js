const $ = (s, r = document) => r.querySelector(s);
const $$ = (s, r = document) => [...r.querySelectorAll(s)];
const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

const KEY = 'assetlifecycle_v2';
function load() { try { const d = JSON.parse(localStorage.getItem(KEY)); if (d && d.v === 3) return d; } catch {} return seed(); }
function save() { try { localStorage.setItem(KEY, JSON.stringify(S)); } catch { toast('Storage error: changes could not be saved.', 'bad'); } }
let S = load();
const logEv = m => { S.logs.unshift({ t: new Date().toISOString(), m }); S.logs = S.logs.slice(0, 40); };

const isHead = () => S.role === 'IT Head';
function guard() {
  if (isHead()) return true;
  toast('Auditors can record findings but cannot edit assets or licenses.', 'bad'); return false;
}
function applyRole() {
  document.body.classList.toggle('auditor', !isHead());
  $('#role').value = S.role;
  const b = $('#rbadge'); b.textContent = isHead() ? 'Full write access' : 'Read-only register'; b.className = 'pill ' + (isHead() ? 'ok' : 'info');
  save();
}

const pill = (t, c) => `<span class="pill ${c}">${t}</span>`;
const stageC = { 'In Stock': 'info', Assigned: 'ok', 'In Repair': 'warn', Retired: 'mute', Disposed: 'mute' };
const auditC = { Verified: 'ok', Pending: 'mute', Missing: 'bad', Mismatch: 'warn' };
const SPINE_COLOR = { 'In Stock': '#60a5fa', Assigned: '#34d399', 'In Repair': '#fbbf24', Retired: '#94a3b8', Disposed: '#475569' };

function count(el, to, suf = '') {
  const o = { v: el._v || 0 }; el._v = to;
  gsap.to(o, { v: to, duration: 1, ease: 'power3.out', onUpdate: () => el.textContent = Math.round(o.v) + suf });
}
function renderDash() {
  const A = S.assets, done = A.filter(a => a.audit !== 'Pending').length, pct = Math.round(done / A.length * 100);
  const att = A.filter(a => !['Retired', 'Disposed'].includes(a.stage) && (a.stage === 'In Repair' || daysTo(a.warrantyEnd) <= 30));
  const badL = S.lics.filter(l => lStat(l)[0] !== 'Compliant');
  count($('#k1'), A.length); count($('#k2'), att.length); count($('#k3'), badL.length); count($('#k4'), done, '/' + A.length);
  gsap.to('#k4bar i', { width: pct + '%', duration: 1, ease: 'power3.out' });

  const items = [];
  A.filter(a => ['Missing', 'Mismatch'].includes(a.audit)).forEach(a => items.push({ c: a.audit === 'Missing' ? 'bad' : 'warn', go: 'audit', t: `${a.tag} ${a.model}: ${a.audit} in audit` }));
  badL.forEach(l => { const [s, c] = lStat(l); items.push({ c, go: 'lics', t: `${l.product}: ${s}, ${l.used}/${l.seats} seats` }); });
  att.forEach(a => items.push({ c: a.stage === 'In Repair' ? 'warn' : wStat(a)[1], go: 'assets', t: `${a.tag}: ${a.stage === 'In Repair' ? 'in repair' : 'warranty ' + wStat(a)[0].toLowerCase()}` }));
  items.sort((x, y) => (y.c === 'bad') - (x.c === 'bad'));
  const pend = A.filter(a => a.audit === 'Pending').length, n = isHead() ? items.length : pend, cnt = s => A.filter(a => a.stage === s).length;
  const SC = { 'In Stock': '#60a5fa', Assigned: '#34d399', 'In Repair': '#fbbf24', Retired: '#94a3b8', Disposed: '#475569' };
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
  const rows = S.assets.filter(a =>
    (F.stage === 'All stages' || a.stage === F.stage) && (F.war === 'All warranties' || wStat(a)[0] === F.war) &&
    [a.tag, a.model, a.serial, a.owner].join(' ').toLowerCase().includes(q));
  $('#acount').textContent = `${rows.length} / ${S.assets.length}`;
  $('#abody').innerHTML = rows.length ? rows.map(a => {
    const [w, wc] = wStat(a);
    const st = isHead() ? `<select class="ssel" ${NEXT[a.stage].length ? '' : 'disabled title="Final state"'} data-id="${a.id}" aria-label="Stage for ${a.tag}">${[a.stage, ...NEXT[a.stage]].map(s => `<option ${s === a.stage ? 'selected' : ''}>${s}</option>`).join('')}</select>` : pill(a.stage, stageC[a.stage]);
    return `<tr><td class="mono"><button type="button" class="book-tag" style="--spine:${SPINE_COLOR[a.stage] || '#34d399'}" data-detail="${a.id}" title="Open ${esc(a.tag)} lifecycle book">${esc(a.tag)}</button></td><td>${esc(a.model)}<small>${a.type}</small></td><td class="mono">${esc(a.serial)}</td>
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
function show(s) {
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

function pickOwner(cur, ok, no, title = 'Assign asset') {
  $('#otitle').textContent = title;
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
  if (!NEXT[a.stage].includes(to)) {
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
  if (dt) {
    dt.classList.add('pull-out');
    setTimeout(() => {
      dt.classList.remove('pull-out');
      openDetail(dt.dataset.detail);
    }, 130);
  }
  if (asg && guard()) assignSeat(asg.dataset.assign);
  if (go) show(go.dataset.go);
  if (mk) mark(mk.dataset.mark, mk.dataset.r);
  if (seat && guard()) {
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

$('#aform').onsubmit = e => {
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

const calm = matchMedia('(prefers-reduced-motion: reduce)').matches;
const DEV = [
  ['Laptop', 'AST-1001', '#34d399', '<rect x="22" y="28" width="56" height="36" rx="2"/><path d="M12 72h76l-6 6H18z"/>', 'assets/laptop.jpg'],
  ['Server', 'AST-1004', '#fbbf24', '<rect x="20" y="22" width="60" height="16" rx="2"/><rect x="20" y="42" width="60" height="16" rx="2"/><rect x="20" y="62" width="60" height="16" rx="2"/><path d="M28 30h18M28 50h18M28 70h18"/><circle cx="70" cy="30" r="1.5"/><circle cx="70" cy="50" r="1.5"/><circle cx="70" cy="70" r="1.5"/>', 'assets/server.jpg'],
  ['Monitor', 'AST-1005', '#60a5fa', '<rect x="14" y="22" width="72" height="46" rx="3"/><path d="M50 68v10M36 80h28"/>', 'assets/monitor.jpg'],
  ['Phone', 'AST-1006', '#34d399', '<rect x="34" y="14" width="32" height="72" rx="7"/><path d="M46 21h8M46 80h8"/>', 'assets/phone.jpg'],
  ['Tablet', 'AST-1007', '#fbbf24', '<rect x="20" y="20" width="60" height="60" rx="6"/><circle cx="50" cy="73" r="2"/>', 'assets/tablet.jpg'],
  ['Network', 'AST-1008', '#60a5fa', '<rect x="12" y="42" width="76" height="22" rx="2"/><path d="M22 53h4M32 53h4M42 53h4M52 53h4M62 53h4M72 53h4M30 42V28M70 42V28"/>', 'assets/network.jpg']
];
const FACES = ['rotateY(0deg)', 'rotateY(90deg)', 'rotateY(180deg)', 'rotateY(-90deg)', 'rotateX(90deg)', 'rotateX(-90deg)'];
function buildCube(host) {
  host.setAttribute('aria-hidden', 'true');
  host.innerHTML = `<div class="tilt"><div class="cube">${DEV.map((d, i) => `<div class="face" style="--t:${FACES[i]};--c:${d[2]}">${d[4] ? `<img src="${d[4]}" alt="">` : `<svg viewBox="0 0 100 100">${d[3]}</svg>`}<i>${d[1]}</i><b>${d[0]}</b></div>`).join('')}</div></div>`;
  const tilt = $('.tilt', host), cube = $('.cube', host), area = host.closest('#intro, .dhero') || host;
  gsap.set(cube, { rotationX: -24, '--e': '0px' });
  if (!calm) gsap.to(cube, { rotationY: 360, duration: 26, repeat: -1, ease: 'none' });
  if (!calm && !host.classList.contains('mark')) gsap.to(host, { y: -10, duration: 3, yoyo: true, repeat: -1, ease: 'sine.inOut' });
  area.addEventListener('pointermove', e => { const r = area.getBoundingClientRect();
    gsap.to(tilt, { rotationY: ((e.clientX - r.left) / r.width - .5) * 36, rotationX: -((e.clientY - r.top) / r.height - .5) * 36, duration: .9, ease: 'power3.out' }); });
  host.addEventListener('pointerenter', () => gsap.to(cube, { '--e': '34px', duration: .6, ease: 'power3.out' }));
  host.addEventListener('pointerleave', () => gsap.to(cube, { '--e': '0px', duration: .6, ease: 'power3.out' }));
}
function marquee(el, items) {
  el.setAttribute('aria-hidden', 'true');
  const key = items.join('|'); if (el._k === key) return; el._k = key; el._t?.kill?.();
  const row = `<span>${items.map(t => `<b>${esc(t)}</b>`).join('')}</span>`; el.innerHTML = `<div>${row}${row}</div>`;
  el._t = calm ? null : gsap.to(el.firstChild, { xPercent: -50, duration: items.length * 6, ease: 'none', repeat: -1 });
}
document.addEventListener('pointermove', e => { const c = e.target.closest?.('.card');
  if (c) { const r = c.getBoundingClientRect(); c.style.setProperty('--mx', e.clientX - r.left + 'px'); c.style.setProperty('--my', e.clientY - r.top + 'px'); } });
buildCube($('#cubeI')); buildCube($('#cubeD')); buildCube($('#cubeS'));
marquee($('#stripI'), ['Laptops', 'Servers', 'Monitors', 'Phones', 'Tablets', 'Network gear', 'Software licenses', 'Floor audits', 'Warranty alerts', 'Lifecycle history']);

$$('#hero .w').forEach(w => w.innerHTML = [...w.textContent].map(c => `<span class="c">${c}</span>`).join(''));
const master = gsap.timeline({ defaults: { ease: 'power4.out' } })
  .from('.c', { y: 60, opacity: 0, duration: .9, stagger: .035 })
  .from('.shape', { scale: 0, rotation: -90, opacity: 0, duration: .8, stagger: .12, ease: 'back.out(1.7)' }, .2)
  .from('#cubeI', { scale: .5, opacity: 0, rotationY: -60, duration: 1.3 }, .3)
  .from('.sub, .cta .btn', { y: 20, opacity: 0, duration: .6, stagger: .08 }, '-=.4');
const O = { transformOrigin: '50% 50%', repeat: -1 };
if (!calm) gsap.to('#pin .mv', { ...O, rotation: 360, duration: 9, ease: 'none' });
if (!calm) gsap.to('#spark .mv', { ...O, scale: 1.15, rotation: 45, duration: 1.6, yoyo: true, ease: 'sine.inOut' });
if (!calm) gsap.to('#coil .mv', { transformOrigin: '50% 100%', repeat: -1, scaleY: .82, duration: .9, yoyo: true, ease: 'power1.inOut' });
if (!calm) gsap.to('#bolt .mv', { ...O, skewX: -12, duration: 1.2, yoyo: true, ease: 'sine.inOut' });
$$('.shape').forEach(s => {
  s.onpointerenter = () => gsap.to(s, { scale: 1.3, rotation: '+=180', duration: .5, ease: 'back.out(2)', overwrite: 'auto' });
  s.onpointerleave = () => gsap.to(s, { scale: 1, duration: .4, ease: 'power3.out', overwrite: 'auto' });
});
$('#replay').onclick = () => master.restart();

function enter(role) {
  S.role = role; applyRole();
  gsap.to('#intro', { y: -30, opacity: 0, duration: .45, ease: 'power2.in', onComplete: () => {
    $('#intro').hidden = true; $('#app').hidden = false; show('dash'); gsap.from('#side, .top', { opacity: 0, y: -10, duration: .4, stagger: .08 }); } });
}
$$('[data-enter]').forEach(b => b.onclick = () => enter(b.dataset.enter));
$('#back').onclick = () => { $('#app').hidden = true; $('#intro').hidden = false; gsap.set('#intro', { y: 0, opacity: 1 }); master.restart(); };

function openDetail(id) {
  const a = S.assets.find(x => x.id === id), [w] = wStat(a);
  const spineColor = SPINE_COLOR[a.stage] || '#34d399';
  const specs = [
    ['Serial', a.serial],
    ['Owner', a.owner || 'Unassigned'],
    ['Stage', a.stage],
    ['Purchased', a.purchase],
    ['Cost', 'INR ' + a.cost.toLocaleString('en-IN')],
    ['Warranty', `${a.warrantyEnd} (${w})`],
    ['Audit', a.audit]
  ].map(([k, v]) => `<dt>${k}</dt><dd class="mono">${esc(v)}</dd>`).join('');
  const histHtml = a.hist.map(h => `<li><time class="mono">${new Date(h.t).toLocaleDateString()}</time><span>${esc(h.m)}</span></li>`).join('');

  $('#dbody').innerHTML = `
    <div class="book-stage">
      <div class="open-book" id="assetBook" style="--spine:${spineColor}">
        <div class="book-page book-right">
          <div class="page-head">
            <span class="mono">LIFECYCLE LOG</span>
            <span class="mono">p. 02</span>
          </div>
          <h4 class="page-title">History Timeline</h4>
          <ol class="book-tl">${histHtml}</ol>
          <div class="page-foot mono">${a.hist.length} recorded event${a.hist.length === 1 ? '' : 's'}</div>
        </div>
        <div class="book-cover">
          <div class="cover-front">
            <div class="cover-spine"></div>
            <div class="cover-body">
              <span class="cover-badge mono">${esc(a.type)}</span>
              <h3 class="cover-tag mono">${esc(a.tag)}</h3>
              <p class="cover-model">${esc(a.model)}</p>
              <span class="cover-stage mono">${esc(a.stage)}</span>
            </div>
          </div>
          <div class="cover-back book-page book-left">
            <div class="page-head">
              <span class="mono">ASSET DOSSIER</span>
              <span class="mono">p. 01</span>
            </div>
            <h3 class="book-tag-title mono">${esc(a.tag)}</h3>
            <p class="book-sub">${esc(a.model)} &middot; ${esc(a.type)}</p>
            <dl class="book-dl">${specs}</dl>
          </div>
        </div>
      </div>
    </div>`;

  const dlg = $('#ddlg');
  dlg.showModal();
  const book = $('#assetBook');
  if (calm) {
    book.classList.add('is-open');
  } else {
    requestAnimationFrame(() => requestAnimationFrame(() => book.classList.add('is-open')));
  }
}

function closeDetailBook() {
  const dlg = $('#ddlg');
  const book = $('#assetBook');
  if (book && book.classList.contains('is-open') && !calm) {
    book.classList.remove('is-open');
    setTimeout(() => dlg.close(), 420);
  } else {
    dlg.close();
  }
}

function assignSeat(id) {
  const l = S.lics.find(x => x.id === id); l.people = l.people || [];
  pickOwner('', o => {
    if (l.people.includes(o)) return toast(`${o} already holds a ${l.product} seat.`, 'warn');
    l.people.push(o); l.used++; logEv(`${l.product}: seat assigned to ${o}`); save(); renderAll();
    const [s, c] = lStat(l); toast(`Seat assigned to ${o}. ${l.used} of ${l.seats} seats (${s}).`, c);
  }, () => {}, 'Assign seat');
}
const labelCells = () => $$('table').forEach(t => { const h = [...t.tHead.rows[0].cells].map(c => c.textContent);
  [...t.tBodies[0].rows].forEach(r => [...r.cells].forEach((c, i) => c.dataset.label = h[i] || '')); });
$('#addLic').onclick = () => { if (guard()) { $('#lform').reset(); $('#lerr').innerHTML = ''; $('#ldlg').showModal(); } };
$('#cancelLic').onclick = () => $('#ldlg').close();
$('#dclose').onclick = closeDetailBook;
$('#ddlg').oncancel = e => { e.preventDefault(); closeDetailBook(); };
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

$('#fStage').innerHTML = ['All stages', ...STAGES].map(s => `<option>${s}</option>`).join('');
applyRole(); renderAll();

(function initLiveOffice() {
  const cv = document.getElementById('officeCanvas');
  if (!cv) return;
  const ctx = cv.getContext('2d');
  let W = 0, H = 0, dpr = Math.min(window.devicePixelRatio || 1, 2);

  const racks = [
    { rx: 0.56, rw: 0.085, leds: [] },
    { rx: 0.66, rw: 0.085, leds: [] },
    { rx: 0.76, rw: 0.085, leds: [] },
    { rx: 0.86, rw: 0.085, leds: [] }
  ];
  const ledColors = ['#34d399', '#34d399', '#34d399', '#60a5fa', '#60a5fa', '#fbbf24'];
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

  const desks = [
    { x: 0.34, y: 0.62, s: 0.88, mon: 2, phase: 0.4, typing: 1.2 },
    { x: 0.54, y: 0.65, s: 1.0,  mon: 2, phase: 1.9, typing: 0.9 },
    { x: 0.78, y: 0.67, s: 1.08, mon: 2, phase: 3.5, typing: 1.5 }
  ];

  const walker = { x: 0.45, dir: 1, speed: 0.018, pause: 0 };

  const motes = Array.from({ length: 34 }, () => ({
    x: Math.random(), y: Math.random(),
    r: 0.8 + Math.random() * 1.8,
    vx: (Math.random() - 0.5) * 0.008,
    vy: -0.004 - Math.random() * 0.009,
    a: 0.1 + Math.random() * 0.22
  }));

  const pulses = Array.from({ length: 7 }, (_, i) => ({
    t: Math.random(), speed: 0.08 + Math.random() * 0.12, lane: i % 3,
    c: i % 3 === 0 ? '#34d399' : i % 3 === 1 ? '#60a5fa' : '#fbbf24'
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

    const appEl = document.getElementById('app');
    if (appEl && appEl.hidden) {
      requestAnimationFrame(draw);
      return;
    }

    ctx.clearRect(0, 0, W, H);

    const wallY = H * 0.62;
    const ceilGrad = ctx.createLinearGradient(0, 0, 0, wallY);
    ceilGrad.addColorStop(0, 'rgba(15, 21, 36, 0.55)');
    ceilGrad.addColorStop(0.45, 'rgba(22, 34, 54, 0.42)');
    ceilGrad.addColorStop(1, 'rgba(17, 24, 39, 0.58)');
    ctx.fillStyle = ceilGrad;
    ctx.fillRect(0, 0, W, wallY);

    const floorGrad = ctx.createLinearGradient(0, wallY, 0, H);
    floorGrad.addColorStop(0, 'rgba(15, 22, 35, 0.62)');
    floorGrad.addColorStop(1, 'rgba(10, 15, 25, 0.78)');
    ctx.fillStyle = floorGrad;
    ctx.fillRect(0, wallY, W, H - wallY);

    ctx.strokeStyle = 'rgba(148, 197, 255, 0.055)';
    ctx.lineWidth = 1;
    for (let i = 0; i < 9; i++) {
      const x = W * (0.12 + i * 0.11);
      ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(W * 0.5 + (x - W * 0.5) * 0.65, H * 0.16); ctx.stroke();
    }

    const lights = [0.28, 0.52, 0.78];
    lights.forEach((lx, i) => {
      const cx = W * lx;
      const flicker = 0.94 + Math.sin(t * 1.4 + i * 2) * 0.06;
      const beam = ctx.createRadialGradient(cx, H * 0.06, 8, cx, H * 0.28, W * 0.22);
      beam.addColorStop(0, `rgba(96, 165, 250, ${0.14 * flicker})`);
      beam.addColorStop(0.5, `rgba(52, 211, 153, ${0.04 * flicker})`);
      beam.addColorStop(1, 'rgba(0,0,0,0)');
      ctx.fillStyle = beam;
      ctx.fillRect(cx - W * 0.25, 0, W * 0.5, H * 0.55);

      ctx.fillStyle = `rgba(219, 234, 254, ${0.42 * flicker})`;
      ctx.fillRect(cx - 52, H * 0.04, 104, 3);
    });

    const glassX = W * 0.51;
    const glassTop = H * 0.12;
    const glassH = wallY - glassTop + H * 0.04;

    const srGlow = ctx.createRadialGradient(W * 0.75, H * 0.36, 20, W * 0.75, H * 0.36, W * 0.32);
    srGlow.addColorStop(0, 'rgba(52, 211, 153, 0.11)');
    srGlow.addColorStop(0.5, 'rgba(96, 165, 250, 0.08)');
    srGlow.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.fillStyle = srGlow;
    ctx.fillRect(glassX, glassTop, W - glassX, glassH);

    racks.forEach(rk => {
      const x = W * rk.rx, w = W * rk.rw;
      const y = H * 0.16, h = wallY - y + H * 0.03;

      ctx.fillStyle = 'rgba(15, 22, 36, 0.85)';
      ctx.fillRect(x, y, w, h);
      ctx.strokeStyle = 'rgba(148, 197, 255, 0.14)';
      ctx.lineWidth = 1;
      ctx.strokeRect(x, y, w, h);

      ctx.strokeStyle = 'rgba(241, 245, 249, 0.045)';
      for (let u = 1; u < 20; u++) {
        const uy = y + (h / 20) * u;
        ctx.beginPath(); ctx.moveTo(x + 3, uy); ctx.lineTo(x + w - 3, uy); ctx.stroke();
      }

      rk.leds.forEach(ld => {
        const ly = y + (h / 20) * (ld.row + 0.5);
        const lx = x + 8 + (w - 16) * (ld.col / 4.2);
        let alpha = 0.72;
        if (ld.blink && !calm) {
          const wave = Math.sin(t * ld.speed + ld.phase);
          alpha = wave > 0.15 ? 0.88 : 0.16;
        }
        ctx.fillStyle = ld.c;
        ctx.globalAlpha = alpha;
        ctx.fillRect(lx, ly - 1.2, 3.2, 2.2);
        if (alpha > 0.7) {
          ctx.globalAlpha = 0.2;
          ctx.fillRect(lx - 2, ly - 3, 7.2, 5.8);
        }
      });
      ctx.globalAlpha = 1;
    });

    if (!calm) {
      pulses.forEach(p => {
        p.t = (p.t + p.speed * dt) % 1;
        const py = H * (0.135 + p.lane * 0.011);
        const px = glassX + p.t * (W - glassX);
        const g = ctx.createLinearGradient(px - 36, py, px + 8, py);
        g.addColorStop(0, 'rgba(0,0,0,0)');
        g.addColorStop(1, p.c);
        ctx.strokeStyle = g;
        ctx.globalAlpha = 0.52;
        ctx.lineWidth = 1.6;
        ctx.beginPath(); ctx.moveTo(px - 36, py); ctx.lineTo(px + 8, py); ctx.stroke();
      });
      ctx.globalAlpha = 1;
    }

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
      ctx.fillStyle = 'rgba(20, 32, 48, 0.56)';
      ctx.beginPath(); ctx.arc(wx, wy - 96 - bob, 11, 0, Math.PI * 2); ctx.fill();
      ctx.beginPath();
      ctx.roundRect(wx - 15, wy - 82 - bob, 30, 52, 8);
      ctx.fill();
      ctx.fillStyle = 'rgba(96, 165, 250, 0.45)';
      ctx.fillRect(wx + (walker.dir > 0 ? 8 : -18), wy - 62 - bob, 10, 7);
    }

    const sheen = ctx.createLinearGradient(glassX, glassTop, W, glassTop + glassH);
    sheen.addColorStop(0, 'rgba(191, 219, 254, 0.055)');
    sheen.addColorStop(0.45, 'rgba(191, 219, 254, 0.015)');
    sheen.addColorStop(0.52, 'rgba(191, 219, 254, 0.06)');
    sheen.addColorStop(1, 'rgba(191, 219, 254, 0.01)');
    ctx.fillStyle = sheen;
    ctx.fillRect(glassX, glassTop, W - glassX, glassH);

    ctx.strokeStyle = 'rgba(148, 197, 255, 0.16)';
    ctx.lineWidth = 2;
    ctx.strokeRect(glassX, glassTop, W - glassX, glassH);
    [0.64, 0.77, 0.90].forEach(gx => {
      ctx.beginPath(); ctx.moveTo(W * gx, glassTop); ctx.lineTo(W * gx, glassTop + glassH); ctx.stroke();
    });

    const nocX = W * 0.25, nocY = H * 0.24, nocW = W * 0.18, nocH = H * 0.16;
    ctx.fillStyle = 'rgba(15, 22, 36, 0.82)';
    ctx.fillRect(nocX, nocY, nocW, nocH);
    ctx.strokeStyle = 'rgba(52, 211, 153, 0.25)';
    ctx.lineWidth = 1.2;
    ctx.strokeRect(nocX, nocY, nocW, nocH);

    ctx.strokeStyle = 'rgba(52, 211, 153, 0.55)';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    for (let px = 0; px < nocW - 16; px += 4) {
      const py = nocY + nocH * 0.55 + Math.sin(px * 0.07 + t * 2.4) * 10 + Math.cos(px * 0.03 - t * 1.5) * 6;
      if (px === 0) ctx.moveTo(nocX + 8 + px, py); else ctx.lineTo(nocX + 8 + px, py);
    }
    ctx.stroke();

    for (let b = 0; b < 6; b++) {
      const bh = 8 + Math.abs(Math.sin(t * 1.8 + b * 1.1)) * (nocH * 0.28);
      ctx.fillStyle = b === 4 ? 'rgba(251, 191, 36, 0.45)' : 'rgba(96, 165, 250, 0.42)';
      ctx.fillRect(nocX + 10 + b * (nocW * 0.13), nocY + nocH - 8 - bh, nocW * 0.08, bh);
    }

    desks.forEach((d, idx) => {
      const dx = W * d.x, dy = H * d.y, sc = d.s;
      const deskW = 190 * sc;

      ctx.fillStyle = 'rgba(22, 30, 46, 0.9)';
      ctx.fillRect(dx - deskW / 2, dy, deskW, 10 * sc);
      ctx.fillStyle = 'rgba(15, 21, 34, 0.94)';
      ctx.fillRect(dx - deskW / 2 + 12, dy + 10 * sc, 7 * sc, H - dy);
      ctx.fillRect(dx + deskW / 2 - 19, dy + 10 * sc, 7 * sc, H - dy);

      for (let m = 0; m < d.mon; m++) {
        const mw = 64 * sc, mh = 38 * sc;
        const mx = dx + (m === 0 ? -mw - 4 : 4);
        const my = dy - mh - 12 * sc;

        const glow = ctx.createRadialGradient(mx + mw / 2, my + mh / 2, 4, mx + mw / 2, my + mh / 2, 75 * sc);
        glow.addColorStop(0, m === 0 ? 'rgba(96, 165, 250, 0.16)' : 'rgba(52, 211, 153, 0.13)');
        glow.addColorStop(1, 'rgba(0,0,0,0)');
        ctx.fillStyle = glow;
        ctx.fillRect(mx - 45, my - 35, mw + 90, mh + 75);

        ctx.fillStyle = '#0f172a';
        ctx.fillRect(mx + mw / 2 - 3, my + mh, 6, 12 * sc);
        ctx.fillRect(mx, my, mw, mh);
        ctx.strokeStyle = 'rgba(191, 219, 254, 0.22)';
        ctx.lineWidth = 1;
        ctx.strokeRect(mx, my, mw, mh);

        const scroll = calm ? 0 : (t * 14 + idx * 11 + m * 7) % 12;
        for (let ln = 0; ln < 5; ln++) {
          const ly = my + 6 + ((ln * 6 + scroll) % (mh - 10));
          const lw = (18 + ((ln * 17 + m * 9 + idx * 5) % 34)) * sc;
          ctx.fillStyle = ln === 2 ? 'rgba(52, 211, 153, 0.45)' : 'rgba(147, 197, 253, 0.34)';
          ctx.fillRect(mx + 6, ly, Math.min(lw, mw - 12), 2);
        }
      }

      const sway = calm ? 0 : Math.sin(t * 1.1 + d.phase) * 2.5;
      const headTilt = calm ? 0 : Math.sin(t * 0.7 + d.phase) * 1.8;
      const px = dx + 14 * sc + sway;
      const py = dy + 4 * sc;

      ctx.fillStyle = 'rgba(12, 18, 30, 0.94)';
      ctx.beginPath();
      ctx.roundRect(px - 22 * sc, py - 10 * sc, 44 * sc, 56 * sc, 10);
      ctx.fill();

      ctx.fillStyle = 'rgba(19, 28, 44, 0.94)';
      ctx.beginPath();
      ctx.ellipse(px, py - 8 * sc, 24 * sc, 18 * sc, 0, Math.PI, 0);
      ctx.fill();
      ctx.beginPath();
      ctx.arc(px + headTilt, py - 34 * sc, 12.5 * sc, 0, Math.PI * 2);
      ctx.fill();

      ctx.strokeStyle = 'rgba(147, 197, 253, 0.24)';
      ctx.lineWidth = 1.4;
      ctx.beginPath();
      ctx.arc(px + headTilt, py - 34 * sc, 12.5 * sc, Math.PI * 1.1, Math.PI * 1.9);
      ctx.stroke();
    });

    motes.forEach(m => {
      if (!calm) {
        m.x = (m.x + m.vx * dt + 1) % 1;
        m.y = (m.y + m.vy * dt + 1) % 1;
      }
      ctx.fillStyle = `rgba(191, 219, 254, ${m.a})`;
      ctx.beginPath();
      ctx.arc(m.x * W, m.y * H, m.r, 0, Math.PI * 2);
      ctx.fill();
    });

    requestAnimationFrame(draw);
  }
  requestAnimationFrame(draw);
})();
