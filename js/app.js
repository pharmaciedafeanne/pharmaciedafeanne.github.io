// ===== APPLICATION PRINCIPALE =====

const MOIS_APP = ['','Janvier','Février','Mars','Avril','Mai','Juin',
  'Juillet','Août','Septembre','Octobre','Novembre','Décembre'];

let appState = { view: 'dashboard', detailKey: null };
let dashChart = null;
let _setupDone = false;

// ══════════════════════════════════════════════════════════════
//  INIT
// ══════════════════════════════════════════════════════════════

function initApp() {
  try {
    initFirebase();
  } catch(e) {
    showSetup();
    return;
  }

  onAuthReady((status, user) => {
    if (status === 'logged_in') {
      showMainApp(user);
    } else {
      if (localStorage.getItem('dafeanne_setup_done')) {
        showLogin();
      } else {
        showSetup();
      }
    }
  });
}

// ══════════════════════════════════════════════════════════════
//  SETUP (première configuration Firebase)
// ══════════════════════════════════════════════════════════════

function showSetup() {
  document.getElementById('login-page').classList.add('hidden');
  document.getElementById('app').classList.add('hidden');
  document.getElementById('setup-page').classList.remove('hidden');
}

document.getElementById('setup-form').addEventListener('submit', async (e) => {
  e.preventDefault();
  const name  = document.getElementById('setup-name').value.trim();
  const email = document.getElementById('setup-email').value.trim();
  const pass  = document.getElementById('setup-password').value;
  const errEl = document.getElementById('setup-error');
  errEl.classList.remove('show');
  try {
    await seedSuperAdmin(name, email, pass);
    localStorage.setItem('dafeanne_setup_done', '1');
    document.getElementById('setup-page').classList.add('hidden');
    showLogin();
    toast('Compte super admin créé avec succès. Connectez-vous.', 'success');
  } catch(err) {
    errEl.textContent = err.message;
    errEl.classList.add('show');
  }
});

// ══════════════════════════════════════════════════════════════
//  LOGIN
// ══════════════════════════════════════════════════════════════

function showLogin() {
  document.getElementById('setup-page').classList.add('hidden');
  document.getElementById('app').classList.add('hidden');
  document.getElementById('login-page').classList.remove('hidden');
}

document.getElementById('login-form').addEventListener('submit', async (e) => {
  e.preventDefault();
  const email = document.getElementById('login-email').value.trim();
  const pass  = document.getElementById('login-password').value;
  const errEl = document.getElementById('login-error');
  const btn   = document.getElementById('btn-login');
  errEl.classList.remove('show');
  btn.disabled = true; btn.textContent = 'Connexion…';
  try {
    await login(email, pass);
    // onAuthReady appellera showMainApp
  } catch(err) {
    errEl.textContent = err.code === 'auth/wrong-password' || err.code === 'auth/user-not-found'
      ? 'Email ou mot de passe incorrect.' : err.message;
    errEl.classList.add('show');
    btn.disabled = false; btn.textContent = 'Se connecter';
  }
});

async function doLogout() {
  await logout();
  if (dashChart) { dashChart.destroy(); dashChart = null; }
  showLogin();
}

// ══════════════════════════════════════════════════════════════
//  APP PRINCIPALE
// ══════════════════════════════════════════════════════════════

function showMainApp(user) {
  document.getElementById('login-page').classList.add('hidden');
  document.getElementById('setup-page').classList.add('hidden');
  document.getElementById('app').classList.remove('hidden');
  renderSidebar(user);
  navigate('dashboard');
}

function renderSidebar(user) {
  const u = user || currentUser;
  document.getElementById('sb-name').textContent = u.name;
  document.getElementById('sb-role').textContent = u.role === 'superadmin' ? 'Super Administrateur' : 'Utilisateur';
  document.getElementById('sb-avatar').textContent = u.name.charAt(0).toUpperCase();
  document.getElementById('nav-users').style.display = u.role === 'superadmin' ? 'flex' : 'none';
}

function setActiveNav(view) {
  document.querySelectorAll('.nav-item[data-view]').forEach(el =>
    el.classList.toggle('active', el.dataset.view === view));
}

function navigate(view, params = {}) {
  appState.view = view;
  if (params.key) appState.detailKey = params.key;
  setActiveNav(view);

  ['dashboard','quinzaines','detail','import','nouvelle','users'].forEach(v => {
    const el = document.getElementById(`view-${v}`);
    if (el) el.classList.add('hidden');
  });
  const el = document.getElementById(`view-${view}`);
  if (el) el.classList.remove('hidden');

  const titles = {
    dashboard:  '📊 Tableau de Bord',
    quinzaines: '📋 Gestion des Quinzaines',
    detail:     '🔍 Détail Quinzaine',
    import:     '📥 Import Excel',
    nouvelle:   '➕ Nouvelle Quinzaine',
    users:      '👥 Gestion des Utilisateurs'
  };
  document.getElementById('content-title').textContent = titles[view] || '';

  ({ dashboard: renderDashboard, quinzaines: renderQuinzaines, detail: () => renderDetail(appState.detailKey),
     import: renderImportView, nouvelle: renderNouvelle, users: renderUsers }[view] || (() => {}))();
}

// ══════════════════════════════════════════════════════════════
//  DASHBOARD
// ══════════════════════════════════════════════════════════════

async function renderDashboard() {
  try {
    const [stats, periods, monthly] = await Promise.all([
      getGlobalStats(), getAllPeriods(), getMonthlyStats()
    ]);

    document.getElementById('stat-total-inam').textContent    = fmtA(stats.total_inam);
    document.getElementById('stat-total-amu').textContent     = fmtA(stats.total_amu);
    document.getElementById('stat-global').textContent        = fmtA(stats.total_global);
    document.getElementById('stat-quinzaines').textContent    = stats.nb_periods;
    document.getElementById('stat-dafeanne-inam').textContent = fmtA(stats.dafeanne_inam);
    document.getElementById('stat-dafeanne-amu').textContent  = fmtA(stats.dafeanne_amu);
    document.getElementById('stat-depot-inam').textContent    = fmtA(stats.depot_inam);
    document.getElementById('stat-depot-amu').textContent     = fmtA(stats.depot_amu);

    // Tableau récent
    const tbody = document.getElementById('recent-tbody');
    tbody.innerHTML = periods.slice(0, 6).map(p => `
      <tr>
        <td><strong>${MOIS_APP[p.month]} ${p.year}</strong></td>
        <td><span class="badge badge-${p.quinzaine==='Q1'?'q1':'q2'}">${p.quinzaine}</span></td>
        <td class="amount dafeanne">${fmtA(p.totaux&&p.totaux.dafeanne&&p.totaux.dafeanne.inam)}</td>
        <td class="amount dafeanne">${fmtA(p.totaux&&p.totaux.dafeanne&&p.totaux.dafeanne.amu)}</td>
        <td class="amount depot">${fmtA(p.totaux&&p.totaux.depot&&p.totaux.depot.inam)}</td>
        <td class="amount depot">${fmtA(p.totaux&&p.totaux.depot&&p.totaux.depot.amu)}</td>
        <td class="amount total">${fmtA(p.totaux&&p.totaux.global)}</td>
        <td><button class="btn btn-outline btn-sm" onclick="navigate('detail',{key:'${p.key}'})">Voir</button></td>
      </tr>`).join('') || `<tr><td colspan="8" style="text-align:center;padding:30px;color:var(--text-muted)">
        Aucune donnée. Importez votre fichier Excel.</td></tr>`;

    // Graphique
    if (monthly.length > 0) {
      const ctx = document.getElementById('monthly-chart');
      if (dashChart) dashChart.destroy();
      dashChart = new Chart(ctx, {
        type: 'bar',
        data: {
          labels: monthly.map(m => `${MOIS_APP[m.month].substring(0,3)} ${m.year}`),
          datasets: [
            { label:'DAFEANNE INAM', data: monthly.map(m=>m.dafeanne_inam), backgroundColor:'rgba(42,82,152,0.85)',  borderRadius:3 },
            { label:'DÉPÔT INAM',    data: monthly.map(m=>m.depot_inam),    backgroundColor:'rgba(42,82,152,0.35)',  borderRadius:3 },
            { label:'DAFEANNE AMU',  data: monthly.map(m=>m.dafeanne_amu),  backgroundColor:'rgba(0,180,216,0.85)',  borderRadius:3 },
            { label:'DÉPÔT AMU',     data: monthly.map(m=>m.depot_amu),     backgroundColor:'rgba(0,180,216,0.35)',  borderRadius:3 },
          ]
        },
        options: {
          responsive:true, maintainAspectRatio:false,
          plugins:{ legend:{ position:'top', labels:{font:{size:11}} } },
          scales:{ x:{stacked:false,grid:{display:false}}, y:{ticks:{callback:v=>fmtA(v)},grid:{color:'rgba(0,0,0,0.05)'}} }
        }
      });
    }
  } catch(e) { console.error(e); toast('Erreur chargement tableau de bord','error'); }
}

// ══════════════════════════════════════════════════════════════
//  LISTE DES QUINZAINES
// ══════════════════════════════════════════════════════════════

async function renderQuinzaines() {
  const tbody = document.getElementById('quinzaines-tbody');
  tbody.innerHTML = `<tr><td colspan="10" style="text-align:center;padding:20px">Chargement…</td></tr>`;
  try {
    const periods = await getAllPeriods();
    if (!periods.length) {
      tbody.innerHTML = `<tr><td colspan="10"><div class="empty-state">
        <div class="empty-icon">📂</div><h3>Aucune quinzaine</h3>
        <p>Importez votre fichier Excel ou créez une nouvelle quinzaine.</p></div></td></tr>`;
      return;
    }
    tbody.innerHTML = periods.map(p => `
      <tr>
        <td><strong>${MOIS_APP[p.month]} ${p.year}</strong></td>
        <td><span class="badge badge-${p.quinzaine==='Q1'?'q1':'q2'}">${p.quinzaine==='Q1'?'1ère Q.':'2ème Q.'}</span></td>
        <td>${(p.lots||[]).length}</td>
        <td class="amount dafeanne">${fmtA(p.totaux&&p.totaux.dafeanne&&p.totaux.dafeanne.inam)}</td>
        <td class="amount dafeanne">${fmtA(p.totaux&&p.totaux.dafeanne&&p.totaux.dafeanne.amu)}</td>
        <td class="amount depot">${fmtA(p.totaux&&p.totaux.depot&&p.totaux.depot.inam)}</td>
        <td class="amount depot">${fmtA(p.totaux&&p.totaux.depot&&p.totaux.depot.amu)}</td>
        <td class="amount total">${fmtA(p.totaux&&p.totaux.global)}</td>
        <td>
          <div style="display:flex;gap:5px;flex-wrap:wrap">
            <button class="btn btn-primary btn-sm" onclick="navigate('detail',{key:'${p.key}'})">📋</button>
            <button class="btn btn-outline btn-sm" onclick="doExportPDF('${p.key}')">PDF</button>
            <button class="btn btn-outline btn-sm" onclick="doExportExcel('${p.key}')">Excel</button>
            <button class="btn btn-danger btn-sm btn-icon" onclick="doDeletePeriod('${p.key}')">🗑️</button>
          </div>
        </td>
      </tr>`).join('');
  } catch(e) { console.error(e); toast('Erreur chargement','error'); }
}

// ══════════════════════════════════════════════════════════════
//  DÉTAIL QUINZAINE
// ══════════════════════════════════════════════════════════════

async function renderDetail(key) {
  if (!key) { navigate('quinzaines'); return; }
  const lotsEl = document.getElementById('lots-container');
  lotsEl.innerHTML = '<p style="padding:20px;color:var(--text-muted)">Chargement…</p>';

  let period;
  try {
    const snap = await getDB().collection('quinzaines').doc(key).get();
    if (!snap.exists) { navigate('quinzaines'); return; }
    period = { key: snap.id, ...snap.data() };
  } catch(e) { toast('Erreur chargement quinzaine','error'); return; }

  document.getElementById('detail-period-title').textContent = periodLbl(period);

  const T = period.totaux || {};
  const df = T.dafeanne || {}; const dp = T.depot || {};
  document.getElementById('det-df-inam').textContent  = fmtA(df.inam);
  document.getElementById('det-df-amu').textContent   = fmtA(df.amu);
  document.getElementById('det-df-tot').textContent   = fmtA(df.total);
  document.getElementById('det-dp-inam').textContent  = fmtA(dp.inam);
  document.getElementById('det-dp-amu').textContent   = fmtA(dp.amu);
  document.getElementById('det-dp-tot').textContent   = fmtA(dp.total);
  document.getElementById('det-total-inam').textContent  = fmtA(T.inam);
  document.getElementById('det-total-amu').textContent   = fmtA(T.amu);
  document.getElementById('det-global').textContent      = fmtA(T.global);

  if (!period.lots || !period.lots.length) {
    lotsEl.innerHTML = `<div class="empty-state"><div class="empty-icon">📦</div>
      <h3>Aucun lot</h3><p>Ajoutez un lot pour commencer.</p></div>`;
    return;
  }

  lotsEl.innerHTML = period.lots.map(lot => {
    const lt = lot.totaux || {}; const ld = lt.dafeanne||{}; const lp = lt.depot||{};
    return `
    <div class="lot-card">
      <div class="lot-header" onclick="toggleLot(${lot.numero})">
        <h4>LOT N°${lot.numero} <span style="font-weight:400;font-size:12px;opacity:.7">(${(lot.bons||[]).length} bons)</span></h4>
        <div class="lot-totals">
          <span class="lt-item dafeanne">💊 INAM ${fmtA(ld.inam)} · AMU ${fmtA(ld.amu)}</span>
          <span class="lt-sep">|</span>
          <span class="lt-item depot">🏪 INAM ${fmtA(lp.inam)} · AMU ${fmtA(lp.amu)}</span>
          <span class="lt-sep">→</span>
          <span class="lt-total">${fmtA((ld.inam||0)+(ld.amu||0)+(lp.inam||0)+(lp.amu||0))}</span>
        </div>
        <span class="lot-toggle" id="toggle-${lot.numero}">▼</span>
      </div>
      <div class="lot-body" id="lot-body-${lot.numero}">
        <table class="bons-table">
          <thead>
            <tr>
              <th rowspan="2">BON</th>
              <th colspan="2" class="th-dafeanne">💊 DAFEANNE</th>
              <th class="th-dafeanne-tot">TOTAL DAFEANNE</th>
              <th colspan="2" class="th-depot">🏪 DÉPÔT</th>
              <th class="th-depot-tot">TOTAL DÉPÔT</th>
              <th rowspan="2">TOTAL BON</th>
              <th rowspan="2">OBSERVATION</th>
              <th rowspan="2"></th>
            </tr>
            <tr>
              <th class="th-dafeanne">INAM</th><th class="th-dafeanne">AMU</th>
              <th class="th-dafeanne-tot"></th>
              <th class="th-depot">INAM</th><th class="th-depot">AMU</th>
              <th class="th-depot-tot"></th>
            </tr>
          </thead>
          <tbody>
            ${(lot.bons||[]).map(bon => {
              const di=(bon.dafeanne&&bon.dafeanne.inam)||0, da=(bon.dafeanne&&bon.dafeanne.amu)||0;
              const pi=(bon.depot&&bon.depot.inam)||0,       pa=(bon.depot&&bon.depot.amu)||0;
              return `<tr>
                <td><strong>${esc(bon.label||'BON N°'+bon.numero)}</strong></td>
                <td class="amount dafeanne">${fmtA(di)}</td>
                <td class="amount dafeanne">${fmtA(da)}</td>
                <td class="amount dafeanne-sub">${fmtA(di+da)}</td>
                <td class="amount depot">${fmtA(pi)}</td>
                <td class="amount depot">${fmtA(pa)}</td>
                <td class="amount depot-sub">${fmtA(pi+pa)}</td>
                <td class="amount total">${fmtA(di+da+pi+pa)}</td>
                <td class="remark-cell" title="${esc(bon.remarque||'')}">${esc(bon.remarque||'—')}</td>
                <td style="white-space:nowrap">
                  <button class="btn btn-outline btn-sm btn-icon" onclick="openEditBon('${key}',${lot.numero},'${bon.id}')" title="Modifier">✏️</button>
                  <button class="btn btn-danger btn-sm btn-icon" onclick="deleteExistingBon('${key}',${lot.numero},'${bon.id}')" title="Supprimer ce bon">×</button>
                </td>
              </tr>`;
            }).join('')}
            <tr class="lot-total-row">
              <td><strong>TOTAL LOT ${lot.numero}</strong></td>
              <td class="amount dafeanne"><strong>${fmtA(ld.inam)}</strong></td>
              <td class="amount dafeanne"><strong>${fmtA(ld.amu)}</strong></td>
              <td class="amount dafeanne-sub"><strong>${fmtA((ld.inam||0)+(ld.amu||0))}</strong></td>
              <td class="amount depot"><strong>${fmtA(lp.inam)}</strong></td>
              <td class="amount depot"><strong>${fmtA(lp.amu)}</strong></td>
              <td class="amount depot-sub"><strong>${fmtA((lp.inam||0)+(lp.amu||0))}</strong></td>
              <td class="amount total"><strong>${fmtA((ld.inam||0)+(ld.amu||0)+(lp.inam||0)+(lp.amu||0))}</strong></td>
              <td></td><td></td>
            </tr>
          </tbody>
        </table>
        <div style="padding:10px 16px;border-top:1px dashed var(--border)">
          <button class="btn btn-outline btn-sm" onclick="addBonToExisting('${key}',${lot.numero})">
            ➕ Ajouter un bon au lot ${lot.numero}
          </button>
        </div>
      </div>
    </div>`;
  }).join('');

  // Ouvrir le premier lot par défaut
  if (period.lots.length > 0) toggleLot(period.lots[0].numero);
}

function toggleLot(num) {
  document.getElementById(`lot-body-${num}`)?.classList.toggle('open');
  const icon = document.getElementById(`toggle-${num}`);
  if (icon) icon.classList.toggle('open');
}

// ── Ajouter un bon à une quinzaine existante ─────────────────
async function addBonToExisting(periodKey, lotNum) {
  const snap = await getDB().collection('quinzaines').doc(periodKey).get();
  if (!snap.exists) return;
  const period = snap.data();
  const lot = (period.lots || []).find(l => l.numero === lotNum);
  if (!lot) return;
  const bonNum = (lot.bons || []).length + 1;
  lot.bons.push({
    id: `bon_${Date.now()}_${Math.random().toString(36).slice(2,6)}`,
    numero: bonNum,
    label: `BON N°${bonNum}`,
    dafeanne: { inam: 0, amu: 0 },
    depot:    { inam: 0, amu: 0 },
    remarque: ''
  });
  try {
    await savePeriod(period);
    renderDetail(periodKey);
    toast(`BON N°${bonNum} ajouté au lot ${lotNum}`, 'success');
    // Ouvrir le lot et scroller vers le nouveau bon
    setTimeout(() => {
      const lotBody = document.getElementById(`lot-body-${lotNum}`);
      if (lotBody && !lotBody.classList.contains('open')) toggleLot(lotNum);
    }, 100);
  } catch(e) { toast('Erreur: ' + e.message, 'error'); }
}

// ── Supprimer un bon d'une quinzaine existante ───────────────
async function deleteExistingBon(periodKey, lotNum, bonId) {
  if (!confirm('Supprimer ce bon ?')) return;
  const snap = await getDB().collection('quinzaines').doc(periodKey).get();
  if (!snap.exists) return;
  const period = snap.data();
  const lot = (period.lots || []).find(l => l.numero === lotNum);
  if (!lot) return;
  lot.bons = (lot.bons || []).filter(b => String(b.id) !== String(bonId));
  lot.bons.forEach((b, i) => { b.numero = i + 1; b.label = `BON N°${i + 1}`; });
  try {
    await savePeriod(period);
    renderDetail(periodKey);
    toast('Bon supprimé', 'success');
  } catch(e) { toast('Erreur: ' + e.message, 'error'); }
}

// ── Modifier un bon ──────────────────────────────────────────
async function openEditBon(periodKey, lotNum, bonId) {
  const snap = await getDB().collection('quinzaines').doc(periodKey).get();
  if (!snap.exists) return;
  const period = snap.data();
  const lot = (period.lots||[]).find(l => l.numero === lotNum);
  const bon = lot && (lot.bons||[]).find(b => String(b.id) === String(bonId));
  if (!bon) return;

  document.getElementById('eb-label').textContent = bon.label || `BON N°${bon.numero} — LOT N°${lotNum}`;
  document.getElementById('eb-df-inam').value = (bon.dafeanne&&bon.dafeanne.inam)||0;
  document.getElementById('eb-df-amu').value  = (bon.dafeanne&&bon.dafeanne.amu) ||0;
  document.getElementById('eb-dp-inam').value = (bon.depot&&bon.depot.inam)      ||0;
  document.getElementById('eb-dp-amu').value  = (bon.depot&&bon.depot.amu)       ||0;
  document.getElementById('eb-remarque').value = bon.remarque||'';

  document.getElementById('btn-eb-save').onclick = async () => {
    bon.dafeanne = {
      inam: parseFloat(document.getElementById('eb-df-inam').value)||0,
      amu:  parseFloat(document.getElementById('eb-df-amu').value) ||0
    };
    bon.depot = {
      inam: parseFloat(document.getElementById('eb-dp-inam').value)||0,
      amu:  parseFloat(document.getElementById('eb-dp-amu').value) ||0
    };
    bon.remarque = document.getElementById('eb-remarque').value.trim();
    try {
      await savePeriod({ ...period });
      closeModal();
      renderDetail(periodKey);
      toast('Bon modifié avec succès','success');
    } catch(e) { toast('Erreur sauvegarde: '+e.message,'error'); }
  };
  openModal('modal-edit-bon');
}

// ══════════════════════════════════════════════════════════════
//  NOUVELLE QUINZAINE
// ══════════════════════════════════════════════════════════════

let _lots = [];

function renderNouvelle() {
  document.getElementById('form-nouvelle').reset();
  _lots = [];
  renderLotsBuilder();
}

function addLot() {
  const n = _lots.length + 1;
  _lots.push({ numero: n, bons: [] });
  renderLotsBuilder();
  // Ajouter automatiquement un premier bon
  addBon(n);
}

function addBon(lotNum) {
  const lot = _lots.find(l => l.numero === lotNum);
  if (!lot) return;
  const bonNum = lot.bons.length + 1;
  const bon = {
    id: `bon_${Date.now()}_${Math.random().toString(36).slice(2,6)}`,
    numero: bonNum,
    label: `BON N°${bonNum}`,
    dafeanne: { inam: 0, amu: 0 },
    depot:    { inam: 0, amu: 0 },
    remarque: ''
  };
  lot.bons.push(bon);

  // Insertion directe dans le DOM sans re-rendre tout le tableau
  const tbody = document.getElementById(`bon-rows-${lotNum}`);
  if (tbody) {
    tbody.insertAdjacentHTML('beforeend', bonRow(lotNum, bon));
    // Mettre à jour le compteur dans le header
    const header = tbody.closest('.lot-card').querySelector('.lot-header h4');
    if (header) header.innerHTML = `LOT N°${lot.numero} <span style="font-weight:400;font-size:12px;opacity:.7">(${lot.bons.length} bon${lot.bons.length > 1 ? 's' : ''})</span>`;
    // Focus sur le premier input du nouveau bon
    tbody.lastElementChild.querySelector('input[type="number"]')?.focus();
  } else {
    renderLotsBuilder();
  }
}

function removeBon(lotNum, bonId) {
  const lot = _lots.find(l => l.numero === lotNum);
  if (!lot) return;
  lot.bons = lot.bons.filter(b => String(b.id) !== String(bonId));
  // Renuméroter les bons restants
  lot.bons.forEach((b, i) => { b.numero = i + 1; b.label = `BON N°${i + 1}`; });

  // Supprimer la ligne du DOM
  document.getElementById(`row-${bonId}`)?.remove();
  // Renuméroter les labels dans le DOM
  const tbody = document.getElementById(`bon-rows-${lotNum}`);
  if (tbody) {
    tbody.querySelectorAll('tr').forEach((tr, i) => {
      const strong = tr.querySelector('td:first-child strong');
      if (strong) strong.textContent = `BON N°${i + 1}`;
    });
    const header = tbody.closest('.lot-card').querySelector('.lot-header h4');
    if (header) header.innerHTML = `LOT N°${lot.numero} <span style="font-weight:400;font-size:12px;opacity:.7">(${lot.bons.length} bon${lot.bons.length > 1 ? 's' : ''})</span>`;
  }
}

function renderLotsBuilder() {
  const c = document.getElementById('lots-builder');
  if (!_lots.length) {
    c.innerHTML = `<div class="empty-state" style="padding:30px">
      <div class="empty-icon">📦</div><h3>Aucun lot</h3>
      <p>Cliquez sur "Ajouter un lot" pour commencer la saisie.</p></div>`;
    return;
  }
  c.innerHTML = _lots.map(lot => `
    <div class="lot-card" style="margin-bottom:14px">
      <div class="lot-header" style="cursor:default;justify-content:space-between">
        <h4>LOT N°${lot.numero} <span style="font-weight:400;font-size:12px;opacity:.7">(${lot.bons.length} bon${lot.bons.length > 1 ? 's' : ''})</span></h4>
        <button class="btn btn-danger btn-sm" onclick="removeLot(${lot.numero})">🗑️ Supprimer le lot</button>
      </div>
      <div class="lot-body open">
        <table class="bons-table">
          <thead>
            <tr>
              <th rowspan="2" style="width:110px">BON</th>
              <th colspan="2" class="th-dafeanne">💊 DAFEANNE</th>
              <th colspan="2" class="th-depot">🏪 DÉPÔT</th>
              <th rowspan="2">OBSERVATION</th>
              <th rowspan="2" style="width:36px"></th>
            </tr>
            <tr>
              <th class="th-dafeanne">INAM (F)</th><th class="th-dafeanne">AMU (F)</th>
              <th class="th-depot">INAM (F)</th><th class="th-depot">AMU (F)</th>
            </tr>
          </thead>
          <tbody id="bon-rows-${lot.numero}">
            ${lot.bons.map(bon => bonRow(lot.numero, bon)).join('')}
          </tbody>
        </table>
        <div style="padding:10px 12px;border-top:1px dashed var(--border)">
          <button class="btn btn-outline btn-sm" onclick="addBon(${lot.numero})">
            ➕ Ajouter un bon
          </button>
        </div>
      </div>
    </div>`).join('');
}

function bonRow(lotNum, bon) {
  return `<tr id="row-${bon.id}">
    <td><strong>${bon.label}</strong></td>
    <td><input type="number" min="0" class="cell-input" data-lot="${lotNum}" data-bon="${bon.id}" data-account="dafeanne" data-field="inam" value="${bon.dafeanne.inam}" onchange="updateCell(this)"></td>
    <td><input type="number" min="0" class="cell-input" data-lot="${lotNum}" data-bon="${bon.id}" data-account="dafeanne" data-field="amu"  value="${bon.dafeanne.amu}"  onchange="updateCell(this)"></td>
    <td><input type="number" min="0" class="cell-input" data-lot="${lotNum}" data-bon="${bon.id}" data-account="depot"    data-field="inam" value="${bon.depot.inam}"    onchange="updateCell(this)"></td>
    <td><input type="number" min="0" class="cell-input" data-lot="${lotNum}" data-bon="${bon.id}" data-account="depot"    data-field="amu"  value="${bon.depot.amu}"     onchange="updateCell(this)"></td>
    <td><input type="text" class="cell-input cell-remark" data-lot="${lotNum}" data-bon="${bon.id}" data-account="remarque" data-field="remarque" value="${esc(bon.remarque)}" onchange="updateCell(this)" placeholder="Observation…"></td>
    <td><button class="btn btn-danger btn-sm btn-icon" onclick="removeBon(${lotNum},'${bon.id}')" title="Supprimer ce bon">×</button></td>
  </tr>`;
}

function updateCell(input) {
  const { lot: lotN, bon: bonId, account, field } = input.dataset;
  const lot = _lots.find(l => l.numero === parseInt(lotN));
  const bon = lot && lot.bons.find(b => String(b.id) === String(bonId));
  if (!bon) return;
  if (account === 'remarque') { bon.remarque = input.value; }
  else { bon[account][field] = parseFloat(input.value) || 0; }
}

function removeLot(num) {
  _lots = _lots.filter(l => l.numero !== num);
  _lots.forEach((l, i) => l.numero = i + 1);
  renderLotsBuilder();
}

async function saveNouvelle() {
  const year     = parseInt(document.getElementById('new-year').value);
  const month    = parseInt(document.getElementById('new-month').value);
  const quinzaine = document.getElementById('new-quinzaine').value;
  if (!year || !month || !quinzaine) { toast('Remplissez tous les champs','error'); return; }

  const existing = await getPeriod(year, month, quinzaine);
  if (existing && !confirm(`Une quinzaine ${quinzaine} pour ${MOIS_APP[month]} ${year} existe déjà. Écraser ?`)) return;

  try {
    await savePeriod({ year, month, quinzaine, lots: _lots });
    toast(`Quinzaine ${quinzaine} ${MOIS_APP[month]} ${year} enregistrée ✓`, 'success');
    navigate('quinzaines');
  } catch(e) { toast('Erreur sauvegarde: '+e.message,'error'); }
}

// ══════════════════════════════════════════════════════════════
//  IMPORT EXCEL
// ══════════════════════════════════════════════════════════════

let _importData = null;

function renderImportView() {
  _importData = null;
  document.getElementById('import-preview').classList.add('hidden');
  document.getElementById('import-loading').classList.add('hidden');
  document.getElementById('btn-confirm-import').classList.add('hidden');
  document.getElementById('import-results-body').innerHTML = '';
  document.getElementById('file-input').value = '';
}

async function handleFileSelect(input) {
  const file = input.files[0];
  if (!file) return;
  if (!/\.xlsx?$/i.test(file.name)) { toast('Format invalide. Utilisez un fichier .xlsx','error'); return; }
  document.getElementById('import-loading').classList.remove('hidden');
  document.getElementById('import-preview').classList.add('hidden');
  try {
    _importData = await importExcelFile(file);
    showImportPreview(_importData);
  } catch(e) {
    toast('Erreur lecture fichier: '+e.message,'error');
    console.error(e);
  } finally {
    document.getElementById('import-loading').classList.add('hidden');
  }
}

async function showImportPreview(results) {
  if (!results.length) { toast('Aucune donnée trouvée','error'); return; }
  document.getElementById('imp-nb-sheets').textContent = results.length;
  document.getElementById('imp-nb-lots').textContent   = results.reduce((s,r)=>s+(r.lots||[]).length,0);
  document.getElementById('imp-nb-bons').textContent   = results.reduce((s,r)=>s+(r.lots||[]).reduce((ss,l)=>ss+(l.bons||[]).length,0),0);

  const tbody = document.getElementById('import-results-body');
  const checks = await Promise.all(results.map(r => getPeriod(r.year, r.month, r.quinzaine)));
  tbody.innerHTML = results.map((r, i) => {
    const exists = !!checks[i];
    const T = r.totaux||{};
    return `<tr>
      <td>${r.sheetName}</td>
      <td>${MOIS_APP[r.month]} ${r.year}</td>
      <td><span class="badge badge-${r.quinzaine==='Q1'?'q1':'q2'}">${r.quinzaine}</span></td>
      <td>${(r.lots||[]).length}</td>
      <td class="amount dafeanne">${fmtA(T.dafeanne&&T.dafeanne.inam)}</td>
      <td class="amount dafeanne">${fmtA(T.dafeanne&&T.dafeanne.amu)}</td>
      <td class="amount depot">${fmtA(T.depot&&T.depot.inam)}</td>
      <td class="amount depot">${fmtA(T.depot&&T.depot.amu)}</td>
      <td class="amount total">${fmtA(T.global)}</td>
      <td>${exists ? '<span class="badge badge-warning">Mise à jour</span>' : '<span class="badge badge-success">Nouveau</span>'}</td>
    </tr>`;
  }).join('');

  document.getElementById('import-preview').classList.remove('hidden');
  document.getElementById('btn-confirm-import').classList.remove('hidden');
}

async function confirmImport() {
  if (!_importData) return;
  const btn = document.getElementById('btn-confirm-import');
  btn.disabled = true; btn.textContent = 'Import en cours…';
  try {
    let done = 0;
    for (const r of _importData) {
      await savePeriod(r);
      done++;
    }
    toast(`${done} quinzaine(s) importée(s) avec succès ✓`, 'success');
    navigate('quinzaines');
  } catch(e) {
    toast('Erreur import: '+e.message, 'error');
    btn.disabled = false; btn.textContent = '✅ Confirmer l\'import';
  }
}

// Drop zone
document.addEventListener('DOMContentLoaded', () => {
  const zone = document.getElementById('drop-zone');
  if (zone) {
    zone.addEventListener('dragover', e => { e.preventDefault(); zone.classList.add('drag-over'); });
    zone.addEventListener('dragleave', () => zone.classList.remove('drag-over'));
    zone.addEventListener('drop', async e => {
      e.preventDefault(); zone.classList.remove('drag-over');
      const file = e.dataTransfer.files[0];
      if (file) {
        document.getElementById('import-loading').classList.remove('hidden');
        try { _importData = await importExcelFile(file); showImportPreview(_importData); }
        catch(err) { toast('Erreur: '+err.message,'error'); }
        finally { document.getElementById('import-loading').classList.add('hidden'); }
      }
    });
  }
});

// ══════════════════════════════════════════════════════════════
//  UTILISATEURS
// ══════════════════════════════════════════════════════════════

async function renderUsers() {
  if (!currentUser || currentUser.role !== 'superadmin') { navigate('dashboard'); return; }
  const tbody = document.getElementById('users-tbody');
  tbody.innerHTML = '<tr><td colspan="5" style="text-align:center;padding:20px">Chargement…</td></tr>';
  try {
    const users = await getAllUsers();
    tbody.innerHTML = users.map(u => `
      <tr>
        <td><strong>${esc(u.name)}</strong></td>
        <td>${esc(u.email)}</td>
        <td><span class="badge badge-${u.role==='superadmin'?'superadmin':'user'}">${u.role==='superadmin'?'Super Admin':'Utilisateur'}</span></td>
        <td>${u.createdAt ? new Date(u.createdAt.seconds*1000).toLocaleDateString('fr-FR') : '—'}</td>
        <td>
          <div style="display:flex;gap:6px">
            <button class="btn btn-outline btn-sm" onclick="openEditUser('${u.uid}')">✏️ Modifier</button>
            ${u.uid !== currentUser.uid ? `<button class="btn btn-danger btn-sm" onclick="doDeleteUser('${u.uid}','${esc(u.name)}')">🗑️</button>` : ''}
          </div>
        </td>
      </tr>`).join('');
  } catch(e) { toast('Erreur chargement utilisateurs','error'); }
}

function openAddUser() {
  document.getElementById('modal-user-title').textContent = 'Nouvel utilisateur';
  document.getElementById('user-form').reset();
  document.getElementById('user-uid').value = '';
  document.getElementById('user-password-row').style.display = 'block';
  document.getElementById('btn-save-user').onclick = doSaveUser;
  openModal('modal-user');
}

async function openEditUser(uid) {
  const users = await getAllUsers();
  const u = users.find(x => x.uid === uid);
  if (!u) return;
  document.getElementById('modal-user-title').textContent = 'Modifier utilisateur';
  document.getElementById('user-uid').value   = uid;
  document.getElementById('user-name').value  = u.name;
  document.getElementById('user-email').value = u.email;
  document.getElementById('user-role').value  = u.role;
  document.getElementById('user-password').value = '';
  document.getElementById('user-password').placeholder = 'Laisser vide = inchangé';
  document.getElementById('user-password-row').style.display = 'block';
  document.getElementById('btn-save-user').onclick = doSaveUser;
  openModal('modal-user');
}

async function doSaveUser() {
  const uid      = document.getElementById('user-uid').value;
  const name     = document.getElementById('user-name').value.trim();
  const email    = document.getElementById('user-email').value.trim();
  const role     = document.getElementById('user-role').value;
  const password = document.getElementById('user-password').value;
  if (!name || !email || !role) { toast('Remplissez tous les champs obligatoires','error'); return; }

  const btn = document.getElementById('btn-save-user');
  btn.disabled = true; btn.textContent = 'Enregistrement…';
  try {
    if (uid) {
      await updateAccount(uid, { name, role });
      toast('Utilisateur modifié ✓','success');
    } else {
      if (!password) { toast('Le mot de passe est obligatoire','error'); btn.disabled=false; btn.textContent='💾 Enregistrer'; return; }
      await createAccount(name, email, password, role);
      toast('Utilisateur créé ✓','success');
    }
    closeModal();
    renderUsers();
  } catch(e) { toast('Erreur: '+e.message,'error'); }
  finally { btn.disabled=false; btn.textContent='💾 Enregistrer'; }
}

async function doDeleteUser(uid, name) {
  if (!confirm(`Supprimer l'utilisateur "${name}" ?`)) return;
  try {
    await deleteAccount(uid);
    toast('Utilisateur supprimé','success');
    renderUsers();
  } catch(e) { toast(e.message,'error'); }
}

// ══════════════════════════════════════════════════════════════
//  EXPORTS
// ══════════════════════════════════════════════════════════════

async function doExportPDF(key) {
  try {
    const snap = await getDB().collection('quinzaines').doc(key).get();
    if (!snap.exists) return;
    const p = { key: snap.id, ...snap.data() };
    exportPDF([p], `INAM_AMU_${p.quinzaine}_${MOIS_APP[p.month]}_${p.year}.pdf`, periodLbl(p));
  } catch(e) { toast('Erreur PDF: '+e.message,'error'); }
}

async function doExportExcel(key) {
  try {
    const snap = await getDB().collection('quinzaines').doc(key).get();
    if (!snap.exists) return;
    const p = { key: snap.id, ...snap.data() };
    exportExcel([p], `INAM_AMU_${p.quinzaine}_${MOIS_APP[p.month]}_${p.year}.xlsx`);
  } catch(e) { toast('Erreur Excel: '+e.message,'error'); }
}

async function exportAllPDF() {
  try {
    const periods = await getAllPeriods();
    if (!periods.length) { toast('Aucune donnée à exporter','error'); return; }
    exportPDF(periods, 'INAM_AMU_RAPPORT_COMPLET.pdf', 'Rapport Complet');
  } catch(e) { toast('Erreur: '+e.message,'error'); }
}

async function exportAllExcel() {
  try {
    const periods = await getAllPeriods();
    if (!periods.length) { toast('Aucune donnée à exporter','error'); return; }
    exportExcel(periods, 'INAM_AMU_COMPLET.xlsx');
  } catch(e) { toast('Erreur: '+e.message,'error'); }
}

async function doDeletePeriod(key) {
  const snap = await getDB().collection('quinzaines').doc(key).get();
  if (!snap.exists) return;
  const p = snap.data();
  if (!confirm(`Supprimer définitivement la quinzaine ${periodLbl(p)} ?\nCette action est irréversible.`)) return;
  try {
    await deletePeriod(key);
    toast('Quinzaine supprimée','success');
    renderQuinzaines();
  } catch(e) { toast('Erreur: '+e.message,'error'); }
}

// ══════════════════════════════════════════════════════════════
//  MODAL
// ══════════════════════════════════════════════════════════════

function openModal(id) {
  document.getElementById('modal-overlay').classList.remove('hidden');
  document.querySelectorAll('.modal').forEach(m => m.classList.add('hidden'));
  document.getElementById(id).classList.remove('hidden');
}
function closeModal() {
  document.getElementById('modal-overlay').classList.add('hidden');
}
document.getElementById('modal-overlay').addEventListener('click', e => {
  if (e.target === document.getElementById('modal-overlay')) closeModal();
});

// ══════════════════════════════════════════════════════════════
//  TOAST
// ══════════════════════════════════════════════════════════════

function toast(msg, type = 'info') {
  const el = document.createElement('div');
  el.className = `toast toast-${type}`;
  el.innerHTML = `${type==='success'?'✅':type==='error'?'❌':'ℹ️'} ${msg}`;
  document.getElementById('toast-container').appendChild(el);
  setTimeout(() => el.remove(), 4000);
}

// ══════════════════════════════════════════════════════════════
//  UTILS
// ══════════════════════════════════════════════════════════════

function fmtA(v) {
  const n = Number(v || 0);
  return n === 0 ? '—' : n.toLocaleString('fr-FR') + ' F';
}
function periodLbl(p) {
  return `${p.quinzaine==='Q1'?'1ère':'2ème'} Quinzaine — ${MOIS_APP[p.month]} ${p.year}`;
}
function esc(str) {
  return String(str||'').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
}

// ══════════════════════════════════════════════════════════════
//  BOOT
// ══════════════════════════════════════════════════════════════

document.addEventListener('DOMContentLoaded', initApp);
