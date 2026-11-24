/* =====================================================
   data.js - lifecycle rules + synthetic seed data
   Dates are relative to today so alerts always show.
   ===================================================== */
const DAY = 864e5;
const iso = n => { const x = new Date(); x.setDate(x.getDate() + n); return x.getFullYear() + '-' + String(x.getMonth() + 1).padStart(2, '0') + '-' + String(x.getDate()).padStart(2, '0'); }; // local date, today + n days

// LIFECYCLE RULES: which stage may follow which (Disposed is final)
const STAGES = ['In Stock', 'Assigned', 'In Repair', 'Retired', 'Disposed'];
const NEXT = {
  'In Stock': ['Assigned', 'Retired'],
  'Assigned': ['In Stock', 'In Repair', 'Retired'],
  'In Repair': ['Assigned', 'Retired'],
  'Retired': ['Disposed'],
  'Disposed': []
};

const EMPLOYEES = ['Priya Nair', 'Arjun Mehta', 'Kavya Iyer', 'Rohan Das', 'Sneha Kulkarni',
                   'Vikram Singh', 'Ananya Rao', 'Imran Sheikh', 'Meera Pillai', 'Karthik Raman'];
const MODELS = [['Laptop', 'ThinkPad T14'], ['Laptop', 'MacBook Pro 14'], ['Laptop', 'Dell Latitude 5440'],
                ['Server', 'Dell PowerEdge R650'], ['Monitor', 'Dell U2723QE'], ['Phone', 'iPhone 14'],
                ['Tablet', 'iPad Air'], ['Network', 'Cisco Catalyst 9200']];
const CYCLE = ['Assigned', 'Assigned', 'Assigned', 'In Stock', 'Assigned', 'In Repair', 'Assigned', 'Retired', 'In Stock', 'Disposed'];

// builds the whole database object that app.js saves under one versioned localStorage key
function seed() {
  const assets = Array.from({ length: 30 }, (_, i) => {
    const [type, model] = MODELS[i % 8], stage = CYCLE[i % 10];
    return { id: 'a' + i, tag: 'AST-' + (1001 + i), type, model, serial: 'SN' + (48200 + i * 37),
      purchase: iso(-700 - i * 9), cost: 45000 + (i % 8) * 18000, warrantyEnd: iso((i * 53) % 700 - 45), stage,
      owner: ['Assigned', 'In Repair'].includes(stage) ? EMPLOYEES[i % 10] : '',
      // first 18 already audited, the rest Pending
      audit: i >= 18 ? 'Pending' : i === 4 ? 'Missing' : i === 11 ? 'Mismatch' : 'Verified',
      note: i === 4 ? 'Not at desk, owner on leave' : i === 11 ? 'Serial differs from record' : '' };
  });
  assets.forEach(a => { a.hist = [{ t: a.purchase + 'T09:00:00Z', m: 'Registered (In Stock)' }]; // history timeline, newest first
    if (a.owner) a.hist.unshift({ t: a.purchase + 'T12:00:00Z', m: 'Assigned to ' + a.owner }); });
  const lics = [
    { id: 'l1', product: 'Adobe Creative Cloud', vendor: 'Adobe', seats: 50, used: 52, expiry: iso(140) },
    { id: 'l2', product: 'Microsoft 365', vendor: 'Microsoft', seats: 150, used: 138, expiry: iso(210) },
    { id: 'l3', product: 'Figma Org', vendor: 'Figma', seats: 25, used: 18, expiry: iso(12) },
    { id: 'l4', product: 'Zoom Workplace', vendor: 'Zoom', seats: 40, used: 33, expiry: iso(-6) },
    { id: 'l5', product: 'Slack Business+', vendor: 'Slack', seats: 100, used: 81, expiry: iso(300) },
    { id: 'l6', product: 'JetBrains All Products', vendor: 'JetBrains', seats: 10, used: 9, expiry: iso(95) }
  ];
  const h = n => new Date(Date.now() - n * 36e5).toISOString();
  const logs = [ // newest first
    { t: h(1), m: 'Audit cycle Q4-2026 opened' }, { t: h(5), m: 'AST-1006: Assigned to In Repair' },
    { t: h(26), m: 'Adobe Creative Cloud: seats in use raised to 52' }, { t: h(50), m: 'AST-1008: In Stock to Retired' },
    { t: h(74), m: 'AST-1030 registered' } ];
  return { v: 3, role: 'IT Head', assets, lics, logs };
}

/* ---------- RULES (pure functions, also used by test.html) ---------- */
const localDay = s => { const [y, m, dd] = s.split('-').map(Number); return new Date(y, m - 1, dd); }; // local midnight, avoids UTC off-by-one
const daysTo = (s, now = new Date()) => Math.round((localDay(s) - new Date(now.getFullYear(), now.getMonth(), now.getDate())) / DAY);
const wStat = a => { const d = daysTo(a.warrantyEnd); return d < 0 ? ['Expired', 'bad'] : d <= 30 ? ['Expiring', 'warn'] : ['Active', 'ok']; };
const lStat = l => { const d = daysTo(l.expiry); // over-deployed > expired > expiring soon > compliant
  return l.used > l.seats ? ['Over-deployed', 'bad'] : d < 0 ? ['Expired', 'bad'] : d <= 30 ? ['Expiring Soon', 'warn'] : ['Compliant', 'ok']; };
