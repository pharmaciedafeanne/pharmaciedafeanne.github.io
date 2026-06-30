// ===== APPLICATION PRINCIPALE v20260701 =====

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
    console.error('Firebase init error:', e);
    return;
  }

  onAuthReady((status, user) => {
    if (status === 'logged_in') {
      showMainApp(user);
    } else {
      showLogin();
    }
  });
}


// ══════════════════════════════════════════════════════════════
//  LOGIN
// ══════════════════════════════════════════════════════════════

function showLogin() {
  document.getElementById('app').classList.add('hidden');
  document.getElementById('login-page').classList.remove('hidden');
  startLoginClock();
}

// Horloge de la page de connexion
let _clockInterval = null;
function startLoginClock() {
  if (_clockInterval) clearInterval(_clockInterval);
  function tick() {
    const now = new Date();
    const clockEl = document.getElementById('lp-clock');
    const dateEl  = document.getElementById('lp-date');
    if (clockEl) clockEl.textContent = now.toLocaleTimeString('fr-FR');
    if (dateEl) {
      const jours = ['Dimanche','Lundi','Mardi','Mercredi','Jeudi','Vendredi','Samedi'];
      const mois  = ['janvier','février','mars','avril','mai','juin','juillet','août','septembre','octobre','novembre','décembre'];
      dateEl.textContent = `${jours[now.getDay()]} ${now.getDate()} ${mois[now.getMonth()]} ${now.getFullYear()}`;
    }
  }
  tick();
  _clockInterval = setInterval(tick, 1000);
}

// Basculer entre connexion normale et connexion admin
let _adminMode = false;
function toggleAdminLogin() {
  _adminMode = !_adminMode;
  const codeRow  = document.getElementById('login-code-row');
  const emailRow = document.getElementById('login-email-row');
  const linkEl   = document.getElementById('lp-admin-link');
  const btn      = document.getElementById('btn-login');
  if (_adminMode) {
    codeRow.classList.add('hidden');
    if (emailRow) emailRow.classList.remove('hidden');
    if (linkEl) linkEl.textContent = '↩ Retour connexion pharmacie';
    if (btn) btn.textContent = 'ACCÉDER AU PANNEAU ADMIN →';
  } else {
    codeRow.classList.remove('hidden');
    if (emailRow) emailRow.classList.add('hidden');
    if (linkEl) linkEl.textContent = '🔑 Accès Administrateur';
    if (btn) btn.textContent = 'ACCÉDER À MA PHARMACIE →';
  }
}

document.getElementById('login-form').addEventListener('submit', async (e) => {
  e.preventDefault();
  const code  = (document.getElementById('login-code').value || '').trim().toUpperCase();
  const email = (document.getElementById('login-email').value || '').trim();
  const pass  = document.getElementById('login-password').value;
  const errEl = document.getElementById('login-error');
  const btn   = document.getElementById('btn-login');
  errEl.classList.add('hidden'); errEl.textContent = '';
  btn.disabled = true; btn.textContent = 'Connexion…';
  try {
    if (_adminMode) {
      // Mode admin : connexion par email direct
      await login(email, pass);
    } else {
      // Mode pharmacie : connexion par code pharmacie partagé
      await loginByCode(code, pass);
    }
    // onAuthReady appellera showMainApp
  } catch(err) {
    errEl.textContent = err.message || 'Identifiants incorrects.';
    errEl.classList.remove('hidden');
    btn.disabled = false;
    btn.textContent = _adminMode ? 'ACCÉDER AU PANNEAU ADMIN →' : 'ACCÉDER À MA PHARMACIE →';
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
  document.getElementById('admin-app').classList.add('hidden');

  if (user.role === 'superadmin') {
    document.getElementById('app').classList.add('hidden');
    showAdminDashboard();
  } else {
    const pid = user.pharmacieId || 'DAFEANNE';
    setPharmacieContext(pid);
    document.getElementById('app').classList.remove('hidden');
    renderSidebar(user);
    navigate('dashboard');
    setTimeout(() => logAction('Connexion', user.role, user.name||''), 1000);
    setTimeout(check72hNotifications, 2000);
  }
}

// Retour vers le dashboard admin (depuis une pharmacie)
function backToAdmin() {
  document.getElementById('app').classList.add('hidden');
  showAdminDashboard();
}

function renderSidebar(user) {
  const u = user || currentUser;
  document.getElementById('sb-name').textContent = u.name;
  const roleLabel = { superadmin: 'Super Admin', titulaire: 'Pharmacien Titulaire', operateur: 'Opérateur' };
  document.getElementById('sb-role').textContent = roleLabel[u.role] || u.role;
  document.getElementById('sb-avatar').textContent = u.name.charAt(0).toUpperCase();

  const isSuperAdmin = u.role === 'superadmin';
  const isTitulaire  = u.role === 'titulaire';
  const isOperateur  = u.role === 'operateur';

  const perms = u.permissions || {};

  // Imports : masqué pour opérateur sans permission
  const navImport = document.getElementById('nav-import');
  if (navImport) navImport.style.display = (isOperateur && !perms.import) ? 'none' : 'flex';

  // INAM/AMU : masqué pour opérateur sans permission
  const navInam = document.getElementById('nav-inam-amu');
  if (navInam) navInam.style.display = (isOperateur && !perms.inam) ? 'none' : 'flex';

  // Caisse : masqué pour opérateur sans permission caisse ni recharge
  const navCaisse = document.getElementById('nav-caisse');
  if (navCaisse) navCaisse.style.display = (isOperateur && !perms.caisse && !perms.recharge) ? 'none' : 'flex';

  // Fournisseurs : masqué pour opérateur sans permission
  const navFourn = document.getElementById('nav-fournisseurs');
  if (navFourn) navFourn.style.display = (isOperateur && !perms.fournisseurs) ? 'none' : 'flex';

  // Équipe : titulaire peut gérer ses opérateurs
  const navUsers = document.getElementById('nav-users');
  if (navUsers) navUsers.style.display = isTitulaire ? 'flex' : 'none';

  // Catalogue fournisseurs + Journal : titulaire et superadmin uniquement
  const navCatFrs = document.getElementById('nav-catalogue-frs');
  if (navCatFrs) navCatFrs.style.display = (isTitulaire || isSuperAdmin) ? 'flex' : 'none';
  const navJournal = document.getElementById('nav-journal');
  if (navJournal) navJournal.style.display = (isTitulaire || isSuperAdmin) ? 'flex' : 'none';

  // Bouton retour admin (si superadmin navigue dans une pharmacie)
  const navBack = document.getElementById('nav-back-admin');
  if (navBack) navBack.style.display = isSuperAdmin ? 'flex' : 'none';
}

function setActiveNav(view) {
  document.querySelectorAll('.nav-item[data-view]').forEach(el =>
    el.classList.toggle('active', el.dataset.view === view));
}

function navigate(view, params = {}) {
  appState.view = view;
  if (params.key) appState.detailKey = params.key;
  setActiveNav(view);

  ['dashboard','quinzaines','detail','import','nouvelle','users','inam-amu','caisse','fournisseurs','catalogue-frs','journal','donnees'].forEach(v => {
    const el = document.getElementById(`view-${v}`);
    if (el) el.classList.add('hidden');
  });
  const el = document.getElementById(`view-${view}`);
  if (el) el.classList.remove('hidden');

  const titles = {
    dashboard:    '📊 Tableau de Bord Quinzaines INAM AMU',
    quinzaines:   '📋 Gestion des Quinzaines',
    detail:       '🔍 Détail Quinzaine',
    import:       '📥 Import Excel',
    nouvelle:     '➕ Nouvelle Quinzaine',
    users:        '👥 Mon Équipe — Opérateurs',
    'inam-amu':   '🏥 Suivi Paiements INAM / AMU',
    caisse:       '💰 Petite Caisse',
    fournisseurs:    '🏭 Suivi Fournisseurs',
    'catalogue-frs': '📋 Catalogue Fournisseurs',
    journal:         '📒 Journal de Bord',
    donnees:         '📊 Section Données — Exports'
  };
  document.getElementById('content-title').textContent = titles[view] || '';

  ({
    dashboard:       renderDashboard,
    quinzaines:      renderQuinzaines,
    detail:          () => renderDetail(appState.detailKey),
    import:          renderImportView,
    nouvelle:        renderNouvelle,
    users:           renderUsers,
    'inam-amu':      renderInamAmu,
    caisse:          renderCaisse,
    fournisseurs:    renderFournisseurs,
    'catalogue-frs': renderCatalogueFrs,
    journal:         renderJournal,
    donnees:         renderDonnees
  }[view] || (() => {}))();
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
    // Séparer quinzaines normales et BIS
    const normales = periods.filter(p => !p.entiteBis);
    const bisMap   = {};
    periods.filter(p => p.entiteBis).forEach(p => {
      if (!bisMap[p.parentKey]) bisMap[p.parentKey] = [];
      bisMap[p.parentKey].push(p);
    });

    const actionBtns = (key) => `
      <button class="btn btn-primary btn-sm" onclick="navigate('detail',{key:'${key}'})">📋</button>
      <button class="btn btn-outline btn-sm" onclick="doExportPDF('${key}')">PDF</button>
      <button class="btn btn-outline btn-sm" onclick="doExportExcel('${key}')">Excel</button>
      <button class="btn btn-danger btn-sm btn-icon" onclick="doDeletePeriod('${key}')">🗑️</button>`;

    tbody.innerHTML = normales.map(p => {
      const T  = p.totaux || {};
      const df = T.dafeanne || {}; const dp = T.depot || {};
      const qBadge = `<span class="badge badge-${p.quinzaine==='Q1'?'q1':'q2'}">${p.quinzaine==='Q1'?'1ère Q.':'2ème Q.'}</span>`;
      const periode = `<strong>${MOIS_APP[p.month]} ${p.year}</strong>`;

      // Lots INAM et AMU de cette quinzaine
      const lotsInam = (p.lots||[]).filter(l => !l.entite || l.entite==='INAM');
      const lotsAmu  = (p.lots||[]).filter(l => !l.entite || l.entite==='AMU');

      // Facture INAM
      const rowInam = `<tr style="border-left:3px solid var(--primary)">
        <td rowspan="2">${periode}<br><small style="opacity:.6">${p.key}</small></td>
        <td>${qBadge} <span class="badge badge-q1" style="margin-left:4px">INAM</span></td>
        <td>${lotsInam.length}</td>
        <td class="amount dafeanne">${fmtA(df.inam)}</td>
        <td class="amount depot">${fmtA(dp.inam)}</td>
        <td class="amount total"><strong>${fmtA((df.inam||0)+(dp.inam||0))}</strong></td>
        <td><div style="display:flex;gap:4px">${actionBtns(p.key)}</div></td>
      </tr>`;

      // Facture AMU
      const rowAmu = `<tr style="border-left:3px solid var(--success);background:rgba(0,184,148,.04)">
        <td>${qBadge} <span class="badge badge-q2" style="margin-left:4px">AMU</span></td>
        <td>${lotsAmu.length}</td>
        <td class="amount dafeanne">${fmtA(df.amu)}</td>
        <td class="amount depot">${fmtA(dp.amu)}</td>
        <td class="amount total"><strong>${fmtA((df.amu||0)+(dp.amu||0))}</strong></td>
        <td></td>
      </tr>`;

      // BIS
      const bisRows = (bisMap[p.key] || []).map(b => {
        const color = b.entiteBis === 'INAM' ? 'var(--primary)' : 'var(--success)';
        const Tb = b.totaux||{}; const dfb=Tb.dafeanne||{}; const dpb=Tb.depot||{};
        const entiteField = (b.entiteBis||'').toLowerCase();
        return `<tr style="background:${color}08;border-left:3px solid ${color}">
          <td style="padding-left:20px;opacity:.8">↳ ${MOIS_APP[b.month]} ${b.year}</td>
          <td>${qBadge} <span class="badge" style="background:${color};color:white">${b.entiteBis} BIS</span></td>
          <td>${(b.lots||[]).length}</td>
          <td class="amount dafeanne">${fmtA(dfb[entiteField])}</td>
          <td class="amount depot">${fmtA(dpb[entiteField])}</td>
          <td class="amount total">${fmtA(Tb.global)}</td>
          <td><div style="display:flex;gap:4px">${actionBtns(b.key)}</div></td>
        </tr>`;
      }).join('');

      return rowInam + rowAmu + bisRows;
    }).join('');
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
    const snap = await getQuinzaineDocRef(key).get();
    if (!snap.exists) { navigate('quinzaines'); return; }
    period = { key: snap.id, ...snap.data() };
  } catch(e) { toast('Erreur chargement quinzaine','error'); return; }

  document.getElementById('detail-period-title').textContent = periodLbl(period);

  // Bannière clôture
  const clotureBanner = document.getElementById('cloture-banner');
  if (clotureBanner) {
    const closed = !!period.cloturee;
    const canReopen = currentUser && (currentUser.role === 'titulaire' || currentUser.role === 'superadmin' ||
      (currentUser.permissions && currentUser.permissions.rouvrir));
    const canClose  = currentUser && (currentUser.role !== 'operateur' ||
      (currentUser.permissions && currentUser.permissions.cloturer));
    clotureBanner.className = `cloture-banner ${closed ? 'closed' : 'open'}`;
    clotureBanner.innerHTML = closed
      ? `<span>🔒 Quinzaine <strong>clôturée</strong> — saisie verrouillée</span>
         <div style="display:flex;gap:8px;align-items:center;flex-wrap:wrap">
           <button class="btn btn-primary btn-sm" onclick="openBisSaisie('${key}','INAM',${period.year},${period.month},'${period.quinzaine}')">➕ BIS INAM</button>
           <button class="btn btn-success btn-sm" onclick="openBisSaisie('${key}','AMU',${period.year},${period.month},'${period.quinzaine}')">➕ BIS AMU</button>
           ${canReopen ? `<button class="btn-rouvrir" onclick="doRouvrirQuinzaine('${key}')">🔓 Rouvrir</button>` : ''}
         </div>`
      : `<span>🟢 Quinzaine <strong>ouverte</strong></span>
         ${canClose ? `<button class="btn-cloturer" onclick="doCloturerQuinzaine('${key}')">🔒 Clôturer</button>` : ''}`;
    clotureBanner.classList.remove('hidden');
  }

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
    const entite = lot.entite || null; // null = ancien format multi-entités
    const dfVal = entite ? (ld[entite.toLowerCase()]||0) : ((ld.inam||0)+(ld.amu||0));
    const dpVal = entite ? (lp[entite.toLowerCase()]||0) : ((lp.inam||0)+(lp.amu||0));
    const lotTotal = dfVal + dpVal;
    const entiteBadge = entite
      ? `<span class="badge badge-${entite==='INAM'?'q1':'q2'}" style="margin-left:8px">${entite}</span>` : '';

    const bonRows = (lot.bons||[]).map(bon => {
      if (entite) {
        const e = entite.toLowerCase();
        const dfB = (bon.dafeanne&&bon.dafeanne[e])||0;
        const dpB = (bon.depot&&bon.depot[e])||0;
        return `<tr>
          <td><strong>${esc(bon.label||'BON N°'+bon.numero)}</strong></td>
          <td class="amount dafeanne">${fmtA(dfB)}</td>
          <td class="amount depot">${fmtA(dpB)}</td>
          <td class="amount total">${fmtA(dfB+dpB)}</td>
          <td class="remark-cell" title="${esc(bon.remarque||'')}">${esc(bon.remarque||'—')}</td>
          <td style="white-space:nowrap">
            <button class="btn btn-outline btn-sm btn-icon" onclick="openEditBon('${key}',${lot.numero},'${bon.id}')" title="Modifier">✏️</button>
            <button class="btn btn-danger btn-sm btn-icon" onclick="deleteExistingBon('${key}',${lot.numero},'${bon.id}')" title="Supprimer">×</button>
          </td>
        </tr>`;
      }
      // Ancien format : 4 colonnes INAM/AMU
      const di=(bon.dafeanne&&bon.dafeanne.inam)||0, da=(bon.dafeanne&&bon.dafeanne.amu)||0;
      const pi=(bon.depot&&bon.depot.inam)||0,       pa=(bon.depot&&bon.depot.amu)||0;
      return `<tr>
        <td><strong>${esc(bon.label||'BON N°'+bon.numero)}</strong></td>
        <td class="amount dafeanne">${fmtA(di)}</td><td class="amount dafeanne">${fmtA(da)}</td>
        <td class="amount depot">${fmtA(pi)}</td><td class="amount depot">${fmtA(pa)}</td>
        <td class="amount total">${fmtA(di+da+pi+pa)}</td>
        <td class="remark-cell">${esc(bon.remarque||'—')}</td>
        <td style="white-space:nowrap">
          <button class="btn btn-outline btn-sm btn-icon" onclick="openEditBon('${key}',${lot.numero},'${bon.id}')">✏️</button>
          <button class="btn btn-danger btn-sm btn-icon" onclick="deleteExistingBon('${key}',${lot.numero},'${bon.id}')">×</button>
        </td>
      </tr>`;
    }).join('');

    const thead = entite
      ? `<tr>
          <th>BON</th>
          <th class="th-dafeanne">💊 DAFEANNE ${entite} (F)</th>
          <th class="th-depot">🏪 DÉPÔT ${entite} (F)</th>
          <th>TOTAL BON</th><th>OBSERVATION</th><th></th>
         </tr>`
      : `<tr>
          <th rowspan="2">BON</th>
          <th colspan="2" class="th-dafeanne">💊 DAFEANNE</th>
          <th colspan="2" class="th-depot">🏪 DÉPÔT</th>
          <th rowspan="2">TOTAL</th><th rowspan="2">OBS.</th><th rowspan="2"></th>
         </tr>
         <tr>
          <th class="th-dafeanne">INAM</th><th class="th-dafeanne">AMU</th>
          <th class="th-depot">INAM</th><th class="th-depot">AMU</th>
         </tr>`;

    const tfootRow = entite
      ? `<tr class="lot-total-row">
          <td><strong>TOTAL LOT ${lot.numero}</strong></td>
          <td class="amount dafeanne"><strong>${fmtA(dfVal)}</strong></td>
          <td class="amount depot"><strong>${fmtA(dpVal)}</strong></td>
          <td class="amount total"><strong>${fmtA(lotTotal)}</strong></td>
          <td></td><td></td>
         </tr>`
      : `<tr class="lot-total-row">
          <td><strong>TOTAL LOT ${lot.numero}</strong></td>
          <td class="amount dafeanne"><strong>${fmtA(ld.inam)}</strong></td>
          <td class="amount dafeanne"><strong>${fmtA(ld.amu)}</strong></td>
          <td class="amount depot"><strong>${fmtA(lp.inam)}</strong></td>
          <td class="amount depot"><strong>${fmtA(lp.amu)}</strong></td>
          <td class="amount total"><strong>${fmtA(lotTotal)}</strong></td>
          <td></td><td></td>
         </tr>`;

    return `
    <div class="lot-card">
      <div class="lot-header" onclick="toggleLot(${lot.numero})">
        <h4>LOT N°${lot.numero}${entiteBadge} <span style="font-weight:400;font-size:12px;opacity:.7">(${(lot.bons||[]).length} bons)</span></h4>
        <div class="lot-totals">
          <span class="lt-item dafeanne">💊 ${fmtA(dfVal)}</span>
          <span class="lt-sep">|</span>
          <span class="lt-item depot">🏪 ${fmtA(dpVal)}</span>
          <span class="lt-sep">→</span>
          <span class="lt-total">${fmtA(lotTotal)}</span>
        </div>
        <span class="lot-toggle" id="toggle-${lot.numero}">▼</span>
      </div>
      <div class="lot-body" id="lot-body-${lot.numero}">
        <table class="bons-table">
          <thead>${thead}</thead>
          <tbody>${bonRows}</tbody>
          <tfoot>${tfootRow}</tfoot>
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
  const snap = await getQuinzaineDocRef(periodKey).get();
  if (!snap.exists) return;
  const period = snap.data();
  const lot = (period.lots || []).find(l => l.numero === lotNum);
  if (!lot) return;
  if ((lot.bons || []).length >= 10) {
    toast(`⚠️ LOT N°${lotNum}${lot.entite?' ('+lot.entite+')':''} a atteint 10 bons. Créez un nouveau lot pour continuer.`, 'info');
    return;
  }
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
  const snap = await getQuinzaineDocRef(periodKey).get();
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
  const snap = await getQuinzaineDocRef(periodKey).get();
  if (!snap.exists) return;
  const period = snap.data();
  const lot = (period.lots||[]).find(l => l.numero === lotNum);
  const bon = lot && (lot.bons||[]).find(b => String(b.id) === String(bonId));
  if (!bon) return;

  const entite = lot.entite || null;
  const e = entite ? entite.toLowerCase() : null;

  document.getElementById('eb-label').textContent = `${bon.label||'BON N°'+bon.numero} — LOT N°${lotNum}${entite?' ('+entite+')':''}`;

  // Adapter les labels et champs selon entité
  const rowDfInam = document.getElementById('eb-row-df-inam');
  const rowDfAmu  = document.getElementById('eb-row-df-amu');
  const rowDpInam = document.getElementById('eb-row-dp-inam');
  const rowDpAmu  = document.getElementById('eb-row-dp-amu');
  const rowDfSimple = document.getElementById('eb-row-df-simple');
  const rowDpSimple = document.getElementById('eb-row-dp-simple');

  if (entite) {
    // Mode entité unique : afficher 2 champs simples
    if (rowDfInam)  rowDfInam.style.display  = 'none';
    if (rowDfAmu)   rowDfAmu.style.display   = 'none';
    if (rowDpInam)  rowDpInam.style.display  = 'none';
    if (rowDpAmu)   rowDpAmu.style.display   = 'none';
    if (rowDfSimple) { rowDfSimple.style.display=''; rowDfSimple.querySelector('label').textContent=`DAFEANNE ${entite} (F)`; }
    if (rowDpSimple) { rowDpSimple.style.display=''; rowDpSimple.querySelector('label').textContent=`DÉPÔT ${entite} (F)`; }
    document.getElementById('eb-df-simple').value = (bon.dafeanne&&bon.dafeanne[e])||0;
    document.getElementById('eb-dp-simple').value = (bon.depot&&bon.depot[e])||0;
  } else {
    // Ancien format : 4 champs
    if (rowDfInam)  rowDfInam.style.display  = '';
    if (rowDfAmu)   rowDfAmu.style.display   = '';
    if (rowDpInam)  rowDpInam.style.display  = '';
    if (rowDpAmu)   rowDpAmu.style.display   = '';
    if (rowDfSimple) rowDfSimple.style.display = 'none';
    if (rowDpSimple) rowDpSimple.style.display = 'none';
    document.getElementById('eb-df-inam').value = (bon.dafeanne&&bon.dafeanne.inam)||0;
    document.getElementById('eb-df-amu').value  = (bon.dafeanne&&bon.dafeanne.amu) ||0;
    document.getElementById('eb-dp-inam').value = (bon.depot&&bon.depot.inam)      ||0;
    document.getElementById('eb-dp-amu').value  = (bon.depot&&bon.depot.amu)       ||0;
  }
  document.getElementById('eb-remarque').value = bon.remarque||'';

  document.getElementById('btn-eb-save').onclick = async () => {
    if (entite) {
      bon.dafeanne = { inam: 0, amu: 0, [e]: parseFloat(document.getElementById('eb-df-simple').value)||0 };
      bon.depot    = { inam: 0, amu: 0, [e]: parseFloat(document.getElementById('eb-dp-simple').value)||0 };
    } else {
      bon.dafeanne = { inam: parseFloat(document.getElementById('eb-df-inam').value)||0, amu: parseFloat(document.getElementById('eb-df-amu').value)||0 };
      bon.depot    = { inam: parseFloat(document.getElementById('eb-dp-inam').value)||0, amu: parseFloat(document.getElementById('eb-dp-amu').value)||0 };
    }
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
let _bisMode = null; // null | { parentKey, entite, year, month, quinzaine }

function renderNouvelle() {
  document.getElementById('form-nouvelle').reset();
  _lots = [];

  const banner = document.getElementById('bis-mode-banner');
  if (_bisMode && banner) {
    const color = _bisMode.entite === 'INAM' ? 'var(--primary)' : 'var(--success)';
    banner.innerHTML = `<div style="background:${color}15;border:1px solid ${color}40;border-radius:8px;padding:12px 16px;margin-bottom:16px;display:flex;align-items:center;gap:10px">
      <span style="font-size:20px">${_bisMode.entite === 'INAM' ? '🏥' : '💊'}</span>
      <div>
        <strong style="color:${color}">MODE SAISIE BIS — ${_bisMode.entite}</strong>
        <div style="font-size:12px;opacity:.8">Complément de la quinzaine ${_bisMode.quinzaine} — lots ${_bisMode.entite} uniquement</div>
      </div>
      <button class="btn btn-outline btn-sm" style="margin-left:auto" onclick="_bisMode=null;navigate('nouvelle')">✕ Annuler</button>
    </div>`;
    // Pré-remplir les champs et les verrouiller
    const yEl = document.getElementById('new-year');
    const mEl = document.getElementById('new-month');
    const qEl = document.getElementById('new-quinzaine');
    if (yEl) { yEl.value = _bisMode.year; yEl.disabled = true; }
    if (mEl) { mEl.value = _bisMode.month; mEl.disabled = true; }
    if (qEl) { qEl.value = _bisMode.quinzaine; qEl.disabled = true; }
    const bisEl = document.getElementById('new-bis-row');
    if (bisEl) bisEl.style.display = 'none';
  } else {
    if (banner) banner.innerHTML = '';
    ['new-year','new-month','new-quinzaine'].forEach(id => {
      const el = document.getElementById(id); if (el) el.disabled = false;
    });
    const bisEl = document.getElementById('new-bis-row');
    if (bisEl) bisEl.style.display = '';
  }

  renderLotsBuilder();
}

function openBisSaisie(parentKey, entite, year, month, quinzaine) {
  _bisMode = { parentKey, entite, year, month, quinzaine };
  navigate('nouvelle');
}

function addLot() {
  const n = _lots.length + 1;
  const entite = _bisMode ? _bisMode.entite : null;
  _lots.push({ numero: n, entite, bons: [] });
  if (entite) addBon(n); // premier bon automatique si entité connue
  renderLotsBuilder();
  setTimeout(() => {
    const builder = document.getElementById('lots-builder');
    if (builder && builder.lastElementChild) {
      builder.lastElementChild.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
  }, 80);
}

function setLotEntite(lotNum, entite) {
  const lot = _lots.find(l => l.numero === lotNum);
  if (!lot) return;
  lot.entite = entite;
  renderLotsBuilder();
  addBon(lotNum); // premier bon automatique
}

function add10Bons(lotNum) {
  const lot = _lots.find(l => l.numero === lotNum);
  if (!lot || !lot.entite) return;
  const places = 10 - lot.bons.length;
  if (places <= 0) { toast(`⚠️ LOT N°${lot.numero} déjà complet.`, 'info'); return; }
  for (let i = 0; i < places; i++) addBon(lotNum);
}

function addBon(lotNum) {
  const lot = _lots.find(l => l.numero === lotNum);
  if (!lot || !lot.entite) return;
  if (lot.bons.length >= 10) {
    toast(`⚠️ LOT N°${lot.numero} (${lot.entite}) a atteint 10 bons. Créez un nouveau lot pour continuer.`, 'info');
    return;
  }
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

  const tbody = document.getElementById(`bon-rows-${lotNum}`);
  if (tbody) {
    tbody.insertAdjacentHTML('beforeend', bonRow(lotNum, bon, lot.entite));
    const header = tbody.closest('.lot-card').querySelector('.lot-header h4');
    if (header) header.innerHTML = lotHeaderLabel(lot);
    tbody.lastElementChild.querySelector('input[type="number"]')?.focus();
  } else {
    renderLotsBuilder();
  }
}

function removeBon(lotNum, bonId) {
  const lot = _lots.find(l => l.numero === lotNum);
  if (!lot) return;
  lot.bons = lot.bons.filter(b => String(b.id) !== String(bonId));
  lot.bons.forEach((b, i) => { b.numero = i + 1; b.label = `BON N°${i + 1}`; });
  document.getElementById(`row-${bonId}`)?.remove();
  const tbody = document.getElementById(`bon-rows-${lotNum}`);
  if (tbody) {
    tbody.querySelectorAll('tr').forEach((tr, i) => {
      const strong = tr.querySelector('td:first-child strong');
      if (strong) strong.textContent = `BON N°${i + 1}`;
    });
    const header = tbody.closest('.lot-card').querySelector('.lot-header h4');
    if (header) header.innerHTML = `LOT N°${lot.numero} <span style="font-weight:400;font-size:12px;opacity:.7">(${lot.bons.length} bon${lot.bons.length > 1 ? 's' : ''})</span>`;
  }
  updateLotSubtotal(lotNum);
}

function lotHeaderLabel(lot) {
  const badge = lot.entite
    ? `<span class="badge badge-${lot.entite==='INAM'?'q1':'q2'}" style="margin-left:8px">${lot.entite}</span>`
    : '';
  const nb = lot.bons.length;
  const full = nb >= 10;
  const countColor = full ? 'color:var(--danger);font-weight:700' : 'opacity:.7';
  const count = nb
    ? `<span style="font-weight:400;font-size:12px;margin-left:6px;${countColor}">(${nb}/10 bons${full?' — COMPLET ⚠️':''})</span>`
    : '';
  return `LOT N°${lot.numero}${badge}${count}`;
}

function renderLotsBuilder() {
  const c = document.getElementById('lots-builder');
  let html = '';

  if (!_lots.length) {
    html += `<div style="padding:20px;text-align:center;color:var(--text-muted)">
      <div style="font-size:40px;margin-bottom:8px">📦</div>
      <p style="margin-bottom:16px">Aucun lot — commencez par en créer un.</p>
    </div>`;
  } else {
    _lots.forEach(lot => {
      if (!lot.entite) {
        html += `
        <div class="lot-card" style="margin-bottom:14px">
          <div class="lot-header" style="cursor:default;justify-content:space-between">
            <h4>${lotHeaderLabel(lot)}</h4>
            <button class="btn btn-danger btn-sm" onclick="removeLot(${lot.numero})">🗑️ Supprimer</button>
          </div>
          <div class="lot-body open" style="padding:24px;text-align:center">
            <p style="margin-bottom:14px;color:var(--text-muted);font-size:14px">Choisissez l'entité de ce lot :</p>
            <div style="display:flex;gap:16px;justify-content:center">
              <button class="btn btn-primary" style="min-width:130px;font-size:15px" onclick="setLotEntite(${lot.numero},'INAM')">🏥 INAM</button>
              <button class="btn btn-success" style="min-width:130px;font-size:15px" onclick="setLotEntite(${lot.numero},'AMU')">💊 AMU</button>
            </div>
          </div>
        </div>`;
      } else {
        const e = lot.entite;
        const complet = lot.bons.length >= 10;
        html += `
        <div class="lot-card" style="margin-bottom:14px">
          <div class="lot-header" style="cursor:default;justify-content:space-between">
            <h4>${lotHeaderLabel(lot)}</h4>
            <button class="btn btn-danger btn-sm" onclick="removeLot(${lot.numero})">🗑️ Supprimer le lot</button>
          </div>
          <div class="lot-body open">
            <table class="bons-table">
              <thead><tr>
                <th style="width:110px">BON</th>
                <th class="th-dafeanne">💊 DAFEANNE ${e} (F)</th>
                <th class="th-depot">🏪 DÉPÔT ${e} (F)</th>
                <th>OBSERVATION</th>
                <th style="width:36px"></th>
              </tr></thead>
              <tbody id="bon-rows-${lot.numero}">
                ${lot.bons.map(bon => bonRow(lot.numero, bon, e)).join('')}
              </tbody>
              <tfoot><tr class="lot-total-row">
                <td><strong>SOUS-TOTAL LOT ${lot.numero} — ${e}</strong></td>
                <td class="amount th-dafeanne" id="st-${lot.numero}-df">0</td>
                <td class="amount th-depot"    id="st-${lot.numero}-dp">0</td>
                <td class="amount" colspan="2">Total : <strong id="st-${lot.numero}-total" style="color:var(--primary)">0</strong> F</td>
              </tr></tfoot>
            </table>
            <div style="padding:12px;border-top:1px dashed var(--border);display:flex;gap:8px;align-items:center;flex-wrap:wrap">
              ${complet
                ? `<span style="color:var(--danger);font-size:12px;font-weight:600">⚠️ Lot complet (10/10)</span>`
                : `<button class="btn btn-outline btn-sm" onclick="addBon(${lot.numero})">➕ 1 bon</button>
                   <button class="btn btn-outline btn-sm" onclick="add10Bons(${lot.numero})">➕ 10 bons</button>`
              }
              <button class="btn btn-primary btn-sm" onclick="addLot()">➕ Lot suivant →</button>
            </div>
          </div>
        </div>`;
      }
    });
  }

  // Bouton ajouter un lot — toujours visible en bas
  html += `<div style="padding:12px;margin-top:4px">
    <button class="btn btn-primary" style="width:100%;padding:12px;font-size:15px" onclick="addLot()">➕ Ajouter un lot</button>
  </div>`;

  c.innerHTML = html;
  _lots.forEach(lot => { if (lot.entite) updateLotSubtotal(lot.numero); });
}

function bonRow(lotNum, bon, entite) {
  const e = (entite || 'inam').toLowerCase();
  const dfVal = (bon.dafeanne && bon.dafeanne[e]) || 0;
  const dpVal = (bon.depot    && bon.depot[e])    || 0;
  return `<tr id="row-${bon.id}">
    <td><strong>${bon.label}</strong></td>
    <td><input type="number" min="0" class="cell-input" data-lot="${lotNum}" data-bon="${bon.id}" data-account="dafeanne" data-field="${e}" value="${dfVal}" oninput="updateCell(this)"></td>
    <td><input type="number" min="0" class="cell-input" data-lot="${lotNum}" data-bon="${bon.id}" data-account="depot"    data-field="${e}" value="${dpVal}" oninput="updateCell(this)"></td>
    <td><input type="text" class="cell-input cell-remark" data-lot="${lotNum}" data-bon="${bon.id}" data-account="remarque" data-field="remarque" value="${esc(bon.remarque)}" oninput="updateCell(this)" placeholder="Observation…"></td>
    <td><button class="btn btn-danger btn-sm btn-icon" onclick="removeBon(${lotNum},'${bon.id}')" title="Supprimer ce bon">×</button></td>
  </tr>`;
}

function updateCell(input) {
  const { lot: lotN, bon: bonId, account, field } = input.dataset;
  const lotNum = parseInt(lotN);
  const lot = _lots.find(l => l.numero === lotNum);
  const bon = lot && lot.bons.find(b => String(b.id) === String(bonId));
  if (!bon) return;
  if (account === 'remarque') { bon.remarque = input.value; }
  else { bon[account][field] = parseFloat(input.value) || 0; }
  updateLotSubtotal(lotNum);
}

function updateLotSubtotal(lotNum) {
  const lot = _lots.find(l => l.numero === lotNum);
  if (!lot || !lot.entite) return;
  const e = lot.entite.toLowerCase();
  let dfVal=0, dpVal=0;
  lot.bons.forEach(b => {
    dfVal += (b.dafeanne && b.dafeanne[e]) || 0;
    dpVal += (b.depot    && b.depot[e])    || 0;
  });
  const total = dfVal + dpVal;
  const s = (id, val) => { const el = document.getElementById(id); if (el) el.textContent = fmtA(val); };
  s(`st-${lotNum}-df`,    dfVal);
  s(`st-${lotNum}-dp`,    dpVal);
  s(`st-${lotNum}-total`, total);
}

function removeLot(num) {
  if (!confirm(`Supprimer le LOT N°${num} et tous ses bons ?`)) return;
  _lots = _lots.filter(l => l.numero !== num);
  _lots.forEach((l, i) => l.numero = i + 1);
  renderLotsBuilder();
}

async function saveNouvelle() {
  const year      = parseInt(document.getElementById('new-year').value);
  const month     = parseInt(document.getElementById('new-month').value);
  const quinzaine = document.getElementById('new-quinzaine').value;
  const bisCheck  = document.getElementById('new-bis').checked;
  if (!year || !month || !quinzaine) { toast('Remplissez tous les champs','error'); return; }
  if (!_lots.length) { toast('Ajoutez au moins un lot','error'); return; }

  try {
    if (_bisMode) {
      // Saisie BIS entité
      const key = getBisKey(_bisMode.parentKey, _bisMode.entite);
      const existing = await getQuinzaineDocRef(key).get();
      if (existing.exists) { toast(`Une saisie BIS ${_bisMode.entite} existe déjà pour cette quinzaine.`, 'error'); return; }
      await savePeriod({ year, month, quinzaine, bis: true, entiteBis: _bisMode.entite, parentKey: _bisMode.parentKey, lots: _lots, _key: key });
      toast(`Saisie BIS ${_bisMode.entite} enregistrée ✓`, 'success');
      logAction(`Saisie BIS ${_bisMode.entite}`, `${quinzaine} ${MOIS_APP[month]} ${year}`, currentUser?.name||'');
      _bisMode = null;
    } else {
      const existing = await getPeriod(year, month, quinzaine, bisCheck);
      if (existing) { toast(`Cette quinzaine ${quinzaine} ${MOIS_APP[month]} ${year} existe déjà. Supprimez-la d'abord si vous souhaitez la recréer.`, 'error'); return; }
      await savePeriod({ year, month, quinzaine, bis: bisCheck, lots: _lots });
      toast(`Quinzaine ${quinzaine}${bisCheck?' BIS':''} ${MOIS_APP[month]} ${year} enregistrée ✓`, 'success');
      logAction('Nouvelle quinzaine', `${quinzaine} ${MOIS_APP[month]} ${year}`, currentUser?.name||'');
    }
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

function openAddUser() {
  document.getElementById('modal-user-title').textContent = 'Nouvel opérateur';
  document.getElementById('user-uid').value  = '';
  document.getElementById('user-name').value = '';
  document.getElementById('user-password').value = '';
  document.getElementById('user-password').placeholder = '';
  ['cloturer','rouvrir','inam','caisse','recharge','fournisseurs','import'].forEach(p => {
    const el = document.getElementById(`perm-${p}`); if (el) el.checked = false;
  });
  document.getElementById('user-password-row').style.display = 'block';
  // Titulaire ne peut créer que des opérateurs
  const roleSelect = document.getElementById('user-role');
  roleSelect.innerHTML = '<option value="operateur">Opérateur</option>';
  document.getElementById('btn-save-user').onclick = doSaveUser;
  openModal('modal-user');
}

async function openEditUser(uid) {
  const users = currentUser.role === 'titulaire'
    ? await getUsersByPharmacie(currentUser.pharmacieId)
    : await getAllUsers();
  const u = users.find(x => x.uid === uid);
  if (!u) return;
  document.getElementById('modal-user-title').textContent = 'Modifier opérateur';
  document.getElementById('user-uid').value   = uid;
  document.getElementById('user-name').value  = u.name;
  document.getElementById('user-email').value = u.email;
  const roleSelect = document.getElementById('user-role');
  roleSelect.innerHTML = '<option value="operateur">Opérateur</option>';
  roleSelect.value = 'operateur';
  document.getElementById('user-password').value = '';
  document.getElementById('user-password').placeholder = 'Laisser vide = inchangé';
  document.getElementById('user-password-row').style.display = 'block';
  const perms = u.permissions || {};
  ['cloturer','rouvrir','inam','caisse','recharge','fournisseurs','import'].forEach(p => {
    const el = document.getElementById(`perm-${p}`);
    if (el) el.checked = !!perms[p];
  });
  document.getElementById('btn-save-user').onclick = doSaveUser;
  openModal('modal-user');
}

async function doSaveUser() {
  const uid      = document.getElementById('user-uid').value;
  const name     = document.getElementById('user-name').value.trim();
  const email    = document.getElementById('user-email').value.trim();
  const role     = document.getElementById('user-role').value;
  const password = document.getElementById('user-password').value;
  if (!name) { toast('Le nom est obligatoire','error'); return; }

  const btn = document.getElementById('btn-save-user');
  btn.disabled = true; btn.textContent = 'Enregistrement…';
  const permissions = {};
  ['cloturer','rouvrir','inam','caisse','recharge','fournisseurs','import'].forEach(p => {
    const el = document.getElementById(`perm-${p}`);
    if (el) permissions[p] = el.checked;
  });

  try {
    if (uid) {
      await updateAccount(uid, { name, role: 'operateur', permissions });
      toast('Opérateur modifié ✓','success');
    } else {
      if (!password) { toast('Le mot de passe est obligatoire','error'); btn.disabled=false; btn.textContent='💾 Enregistrer'; return; }
      const pharmacieId = (currentUser.pharmacieId || _currentPharmacieId || 'PHARMACIE').toUpperCase();
      // Email technique auto-généré, invisible pour l'utilisateur
      const autoEmail = `${pharmacieId.toLowerCase()}_op_${Date.now()}@pharmacie.app`;
      const newUid = await createAccount(name, autoEmail, password, 'operateur', pharmacieId);
      await updateUserProfile(newUid, { permissions });
      toast('Opérateur créé ✓','success');
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
//  CATALOGUE FOURNISSEURS
// ══════════════════════════════════════════════════════════════

async function renderCatalogueFrs() {
  const tbody = document.getElementById('cat-frs-tbody');
  if (!tbody) return;
  tbody.innerHTML = '<tr><td colspan="4" style="text-align:center;padding:20px">Chargement…</td></tr>';
  try {
    const list = await getAllCatalogueFrs();
    if (!list.length) {
      tbody.innerHTML = '<tr><td colspan="4" style="text-align:center;padding:30px;opacity:.5">Aucun fournisseur. Ajoutez-en un.</td></tr>';
      return;
    }
    tbody.innerHTML = list.map(f => `<tr>
      <td><strong>${esc(f.nom||'—')}</strong></td>
      <td>${esc(f.telephone||'—')}</td>
      <td>${esc(f.adresse||'—')}</td>
      <td>
        <button class="btn btn-outline btn-sm" onclick="openEditCatFrs('${f.id}','${esc(f.nom||'')}','${esc(f.telephone||'')}','${esc(f.adresse||'')}')">✏️</button>
        <button class="btn btn-danger btn-sm" onclick="doDeleteCatFrs('${f.id}','${esc(f.nom||'')}')">🗑️</button>
      </td>
    </tr>`).join('');
    // Mise à jour du datalist global
    await refreshFrsDatalist();
  } catch(e) { toast('Erreur: '+e.message,'error'); }
}

function openAddCatFrs() {
  document.getElementById('cat-frs-id').value      = '';
  document.getElementById('cat-frs-nom').value     = '';
  document.getElementById('cat-frs-tel').value     = '';
  document.getElementById('cat-frs-adresse').value = '';
  document.getElementById('modal-cat-frs-title').textContent = '🏭 Nouveau Fournisseur';
  openModal('modal-cat-frs');
}

function openEditCatFrs(id, nom, tel, adresse) {
  document.getElementById('cat-frs-id').value      = id;
  document.getElementById('cat-frs-nom').value     = nom;
  document.getElementById('cat-frs-tel').value     = tel;
  document.getElementById('cat-frs-adresse').value = adresse;
  document.getElementById('modal-cat-frs-title').textContent = '✏️ Modifier Fournisseur';
  openModal('modal-cat-frs');
}

async function saveCatFrs() {
  const id      = document.getElementById('cat-frs-id').value;
  const nom     = document.getElementById('cat-frs-nom').value.trim();
  const telephone = document.getElementById('cat-frs-tel').value.trim();
  const adresse = document.getElementById('cat-frs-adresse').value.trim();
  if (!nom) return toast('Le nom est obligatoire','error');
  try {
    await saveCatalogueFrs({ id: id||undefined, nom, telephone, adresse });
    closeModal();
    toast(id ? 'Fournisseur modifié ✓' : 'Fournisseur ajouté ✓','success');
    renderCatalogueFrs();
    logAction(id ? 'Modif fournisseur catalogue' : 'Ajout fournisseur catalogue', nom, currentUser?.name||'');
  } catch(e) { toast('Erreur: '+e.message,'error'); }
}

async function doDeleteCatFrs(id, nom) {
  if (!confirm(`Supprimer "${nom}" du catalogue ?`)) return;
  try {
    await deleteCatalogueFrs(id);
    toast('Fournisseur supprimé','success');
    logAction('Suppression fournisseur catalogue', nom, currentUser?.name||'');
    renderCatalogueFrs();
  } catch(e) { toast('Erreur: '+e.message,'error'); }
}

async function refreshFrsDatalist() {
  try {
    const list = await getAllCatalogueFrs();
    const html = list.map(f => `<option value="${esc(f.nom)}"></option>`).join('');
    document.querySelectorAll('datalist[id="frs-list"]').forEach(dl => dl.innerHTML = html);
  } catch(e) { /* silencieux */ }
}

// ══════════════════════════════════════════════════════════════
//  JOURNAL DE BORD
// ══════════════════════════════════════════════════════════════

async function renderJournal() {
  const tbody = document.getElementById('journal-tbody');
  if (!tbody) return;
  tbody.innerHTML = '<tr><td colspan="5" style="text-align:center;padding:20px">Chargement…</td></tr>';
  try {
    const entries = await getJournalEntries(300);
    if (!entries.length) {
      tbody.innerHTML = '<tr><td colspan="5" style="text-align:center;padding:30px;opacity:.5">Aucune entrée dans le journal.</td></tr>';
      return;
    }
    const icons = {
      'Connexion': '🔑', 'Déconnexion': '🔒', 'Clôture quinzaine': '✅',
      'Réouverture quinzaine': '🔓', 'Nouvelle quinzaine': '➕',
      'Ajout facture': '🏭', 'Modif facture': '✏️', 'Suppression facture': '🗑️',
      'Paiement facture': '💳', 'Recharge caisse': '💰', 'Dépense caisse': '💸',
      'Ajout fournisseur catalogue': '🏭', 'Modif fournisseur catalogue': '✏️',
      'Suppression fournisseur catalogue': '🗑️'
    };
    tbody.innerHTML = entries.map(e => {
      const icon = icons[e.action] || '📝';
      return `<tr>
        <td>${esc(e.date||'—')}</td>
        <td>${esc(e.heure||'—')}</td>
        <td>${esc(e.userName||'—')}</td>
        <td><span style="display:flex;align-items:center;gap:6px">${icon} <strong>${esc(e.action||'—')}</strong></span></td>
        <td style="opacity:.8">${esc(e.details||'')}</td>
      </tr>`;
    }).join('');
  } catch(e) { toast('Erreur journal: '+e.message,'error'); }
}

// ══════════════════════════════════════════════════════════════
//  EXPORTS
// ══════════════════════════════════════════════════════════════

async function doExportPDF(key) {
  try {
    const snap = await getQuinzaineDocRef(key).get();
    if (!snap.exists) return;
    const p = { key: snap.id, ...snap.data() };
    exportPDF([p], `INAM_AMU_${p.quinzaine}_${MOIS_APP[p.month]}_${p.year}.pdf`, periodLbl(p));
  } catch(e) { toast('Erreur PDF: '+e.message,'error'); }
}

async function doExportExcel(key) {
  try {
    const snap = await getQuinzaineDocRef(key).get();
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
  const snap = await getQuinzaineDocRef(key).get();
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
  return `${p.quinzaine==='Q1'?'1ère':'2ème'} Quinzaine${p.bis?' BIS':''} — ${MOIS_APP[p.month]} ${p.year}`;
}
function esc(str) {
  return String(str||'').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
}

// ══════════════════════════════════════════════════════════════
//  SUPER ADMIN DASHBOARD
// ══════════════════════════════════════════════════════════════

async function showAdminDashboard() {
  document.getElementById('login-page').classList.add('hidden');
  document.getElementById('app').classList.add('hidden');
  document.getElementById('admin-app').classList.remove('hidden');
  document.getElementById('admin-name').textContent = currentUser.name;
  document.getElementById('admin-avatar').textContent = currentUser.name.charAt(0).toUpperCase();

  // Créer la pharmacie DAFEANNE si elle n'existe pas encore
  try {
    const dafeanne = await getPharmacie('DAFEANNE');
    if (!dafeanne) {
      await createPharmacie({ code: 'DAFEANNE', nom: 'Pharmacie Dafeanne', telephone: '' });
    }
  } catch(e) { console.warn('Init DAFEANNE:', e.message); }

  adminNavigate('admin-overview');
}

function adminNavigate(view) {
  ['admin-overview','admin-pharmacies','admin-utilisateurs','admin-abonnements'].forEach(v => {
    const el = document.getElementById(v);
    if (el) el.classList.add('hidden');
  });
  document.querySelectorAll('.admin-nav-item').forEach(el =>
    el.classList.toggle('active', el.dataset.view === view));
  const el = document.getElementById(view);
  if (el) el.classList.remove('hidden');

  if (view === 'admin-overview')       renderAdminOverview();
  if (view === 'admin-pharmacies')     renderAdminPharmacies();
  if (view === 'admin-utilisateurs')   renderAdminUsers();
  if (view === 'admin-abonnements')    renderAdminAbonnements();
}

// ── Gestion utilisateurs (superadmin) ────────────────────────

async function renderAdminUsers() {
  const tbody = document.getElementById('adm-users-tbody');
  if (!tbody) return;
  tbody.innerHTML = '<tr><td colspan="6" style="text-align:center;padding:20px;opacity:.5">Chargement…</td></tr>';
  try {
    const [users, pharmacies] = await Promise.all([getAllUsers(), getAllPharmacies()]);
    const phMap = {};
    pharmacies.forEach(p => phMap[p.id] = p.nom || p.code);
    const roleLabel = { superadmin: 'Super Admin', titulaire: 'Titulaire', operateur: 'Opérateur' };
    tbody.innerHTML = users.map(u => `<tr>
      <td><strong>${esc(u.name)}</strong></td>
      <td>${esc(u.email)}</td>
      <td><span class="badge badge-${u.role==='superadmin'?'superadmin':u.role==='titulaire'?'titulaire':'user'}">${roleLabel[u.role]||u.role}</span></td>
      <td>${u.pharmacieId ? esc(phMap[u.pharmacieId]||u.pharmacieId) : '—'}</td>
      <td>${u.createdAt ? new Date(u.createdAt.seconds*1000).toLocaleDateString('fr-FR') : '—'}</td>
      <td>
        <div style="display:flex;gap:6px">
          <button class="btn btn-outline btn-sm" onclick="openAdminEditUser('${u.uid}')">✏️ Modifier</button>
          ${u.uid !== currentUser.uid ? `<button class="btn btn-danger btn-sm" onclick="doAdminDeleteUser('${u.uid}','${esc(u.name)}')">🗑️</button>` : ''}
        </div>
      </td>
    </tr>`).join('') || '<tr><td colspan="6" style="text-align:center;padding:30px;opacity:.5">Aucun utilisateur</td></tr>';
  } catch(e) { console.error(e); }
}

async function openAdminAddUser() {
  document.getElementById('adm-user-modal-title').textContent = 'Nouvel utilisateur';
  document.getElementById('adm-user-uid').value = '';
  document.getElementById('adm-user-form').reset();
  document.getElementById('adm-user-password-row').style.display = 'block';
  // Remplir la liste des pharmacies
  const pharmacies = await getAllPharmacies();
  const sel = document.getElementById('adm-user-pharmacie');
  sel.innerHTML = pharmacies.map(p => `<option value="${p.id}">${esc(p.nom||p.code)}</option>`).join('');
  document.getElementById('adm-user-role').value = 'titulaire';
  onAdmUserRoleChange();
  openAdminModal('adm-modal-user');
}

async function openAdminEditUser(uid) {
  const users = await getAllUsers();
  const u = users.find(x => x.uid === uid);
  if (!u) return;
  document.getElementById('adm-user-modal-title').textContent = 'Modifier utilisateur';
  document.getElementById('adm-user-uid').value    = uid;
  document.getElementById('adm-user-name').value  = u.name;
  document.getElementById('adm-user-email').value = u.email;
  document.getElementById('adm-user-password').value = '';
  document.getElementById('adm-user-password').placeholder = 'Laisser vide = inchangé';
  document.getElementById('adm-user-password-row').style.display = 'block';
  const pharmacies = await getAllPharmacies();
  const sel = document.getElementById('adm-user-pharmacie');
  sel.innerHTML = pharmacies.map(p => `<option value="${p.id}" ${p.id===u.pharmacieId?'selected':''}>${esc(p.nom||p.code)}</option>`).join('');
  document.getElementById('adm-user-role').value = u.role;
  onAdmUserRoleChange();
  const perms = u.permissions || {};
  ['cloturer','rouvrir','inam','caisse','recharge','fournisseurs','import'].forEach(p => {
    const el = document.getElementById(`adm-perm-${p}`);
    if (el) el.checked = !!perms[p];
  });
  openAdminModal('adm-modal-user');
}

function onAdmUserRoleChange() {
  const role = document.getElementById('adm-user-role').value;
  document.getElementById('adm-user-perms-row').style.display = role === 'operateur' ? 'block' : 'none';
}

async function doSaveAdminUser() {
  const uid      = document.getElementById('adm-user-uid').value;
  const name     = document.getElementById('adm-user-name').value.trim();
  const email    = document.getElementById('adm-user-email').value.trim();
  const password = document.getElementById('adm-user-password').value;
  const role     = document.getElementById('adm-user-role').value;
  const pharmacieId = document.getElementById('adm-user-pharmacie').value;
  if (!name || !email || !role || !pharmacieId) { toast('Remplissez tous les champs','error'); return; }
  const btn = document.getElementById('adm-btn-save-user');
  btn.disabled = true; btn.textContent = 'Enregistrement…';
  const permissions = {};
  if (role === 'operateur') {
    ['cloturer','rouvrir','inam','caisse','recharge','fournisseurs','import'].forEach(p => {
      const el = document.getElementById(`adm-perm-${p}`);
      if (el) permissions[p] = el.checked;
    });
  }
  try {
    if (uid) {
      await updateAccount(uid, { name, role, pharmacieId, permissions });
      toast('Utilisateur modifié ✓','success');
    } else {
      if (!password) { toast('Le mot de passe est obligatoire','error'); btn.disabled=false; btn.textContent='💾 Enregistrer'; return; }
      await createAccount(name, email, password, role, pharmacieId);
      // Sauvegarder les permissions si opérateur
      if (role === 'operateur') {
        const allUsers = await getAllUsers();
        const newUser = allUsers.find(u => u.email === email);
        if (newUser) await updateAccount(newUser.uid, { permissions });
      }
      toast('Utilisateur créé ✓','success');
    }
    closeAdminModal();
    renderAdminUsers();
    renderAdminOverview();
  } catch(e) { toast('Erreur: '+e.message,'error'); }
  finally { btn.disabled=false; btn.textContent='💾 Enregistrer'; }
}

async function doAdminDeleteUser(uid, name) {
  if (!confirm(`Supprimer l'utilisateur "${name}" ?`)) return;
  try {
    await deleteAccount(uid);
    toast('Utilisateur supprimé','success');
    renderAdminUsers();
    renderAdminOverview();
  } catch(e) { toast(e.message,'error'); }
}

async function renderAdminOverview() {
  try {
    const pharmacies = await getAllPharmacies();
    const users = await getAllUsers();
    const actives = pharmacies.filter(p => p.abonnement && p.abonnement.statut === 'actif').length;
    const essai   = pharmacies.filter(p => p.abonnement && p.abonnement.statut === 'essai').length;

    document.getElementById('adm-stat-pharmacies').textContent = pharmacies.length;
    document.getElementById('adm-stat-users').textContent      = users.length;
    document.getElementById('adm-stat-actives').textContent    = actives;
    document.getElementById('adm-stat-essai').textContent      = essai;

    const grid = document.getElementById('adm-pharmacies-grid');
    if (!pharmacies.length) {
      grid.innerHTML = `<div style="color:rgba(255,255,255,.4);padding:30px;text-align:center;grid-column:1/-1">
        Aucune pharmacie. Créez-en une ci-dessous.</div>`;
      return;
    }
    grid.innerHTML = pharmacies.map(ph => {
      const statut = ph.abonnement ? ph.abonnement.statut : 'essai';
      const statutColors = { actif:'#00b894', essai:'#fdcb6e', expiré:'#e17055', suspendu:'#636e72' };
      const color = statutColors[statut] || '#636e72';
      return `
      <div class="admin-pharma-card">
        <div class="apc-code">${esc(ph.code)}</div>
        <div class="apc-name">${esc(ph.nom || ph.code)}</div>
        ${ph.telephone ? `<div class="apc-info">📞 ${esc(ph.telephone)}</div>` : ''}
        <div class="apc-status" style="background:${color}20;color:${color};border:1px solid ${color}40">
          ${statut.toUpperCase()}
        </div>
        <div class="apc-actions">
          <button class="btn-admin-access" onclick="enterPharmacie('${ph.id}')">🔑 Accéder</button>
          <button class="btn-admin-edit" onclick="openEditPharmacie('${ph.id}')">✏️</button>
        </div>
      </div>`;
    }).join('');
  } catch(e) { console.error(e); }
}

async function renderAdminPharmacies() {
  const pharmacies = await getAllPharmacies();
  const users = await getAllUsers();
  const tbody = document.getElementById('adm-pharma-tbody');
  tbody.innerHTML = pharmacies.map(ph => {
    const phUsers = users.filter(u => u.pharmacieId === ph.id).length;
    const statut = ph.abonnement ? ph.abonnement.statut : 'essai';
    return `<tr>
      <td><strong>${esc(ph.code)}</strong></td>
      <td>${esc(ph.nom || '—')}</td>
      <td>${esc(ph.telephone || '—')}</td>
      <td>${phUsers}</td>
      <td><span class="badge-statut statut-${statut}">${statut}</span></td>
      <td>
        <div style="display:flex;gap:6px">
          <button class="btn btn-sm btn-primary" onclick="enterPharmacie('${ph.id}')">🔑 Accéder</button>
          <button class="btn btn-sm btn-outline" onclick="openEditPharmacie('${ph.id}')">✏️</button>
          <button class="btn btn-sm btn-danger" onclick="doDeletePharmacie('${ph.id}','${esc(ph.nom||ph.code)}')">🗑️</button>
        </div>
      </td>
    </tr>`;
  }).join('') || `<tr><td colspan="6" style="text-align:center;padding:30px;opacity:.5">Aucune pharmacie</td></tr>`;
}

async function renderAdminAbonnements() {
  const pharmacies = await getAllPharmacies();
  const actives  = pharmacies.filter(p => p.abonnement?.statut === 'actif').length;
  const expires  = pharmacies.filter(p => p.abonnement?.statut === 'expiré').length;
  const essais   = pharmacies.filter(p => p.abonnement?.statut === 'essai').length;

  document.getElementById('adm-abo-actif').textContent   = actives;
  document.getElementById('adm-abo-expire').textContent  = expires;
  document.getElementById('adm-abo-essai').textContent   = essais;

  const tbody = document.getElementById('adm-abo-tbody');
  tbody.innerHTML = pharmacies.map(ph => {
    const abo = ph.abonnement || {};
    const statut = abo.statut || 'essai';
    return `<tr>
      <td><strong>${esc(ph.code)}</strong> — ${esc(ph.nom||'')}</td>
      <td><span class="badge-statut statut-${statut}">${statut}</span></td>
      <td>${abo.plan || '—'}</td>
      <td>${abo.dateDebut ? new Date(abo.dateDebut.seconds*1000).toLocaleDateString('fr-FR') : '—'}</td>
      <td>${abo.dateFin  ? new Date(abo.dateFin.seconds*1000).toLocaleDateString('fr-FR')  : '—'}</td>
      <td>
        <button class="btn btn-sm btn-outline" onclick="openGererAbonnement('${ph.id}')">⚙️ Gérer</button>
      </td>
    </tr>`;
  }).join('') || `<tr><td colspan="6" style="text-align:center;padding:30px;opacity:.5">Aucune pharmacie</td></tr>`;
}

// Entrer dans une pharmacie (super admin)
async function enterPharmacie(pharmacieId) {
  try {
    const ph = await getPharmacie(pharmacieId);
    if (!ph) { toast('Pharmacie introuvable','error'); return; }

    setPharmacieContext(pharmacieId);
    document.getElementById('admin-app').classList.add('hidden');
    document.getElementById('app').classList.remove('hidden');
    renderSidebar(currentUser);
    document.getElementById('sb-pharma-name').textContent = ph.nom || ph.code;
    navigate('dashboard');
  } catch(e) { toast('Erreur: '+e.message,'error'); }
}

// Créer une nouvelle pharmacie
function openNewPharmacie() {
  document.getElementById('pharma-form').reset();
  document.getElementById('pharma-form-id').value = '';
  document.getElementById('adm-pharma-modal-title').textContent = 'Nouvelle Pharmacie';
  openAdminModal('adm-modal-pharma');
}

function openEditPharmacie(id) {
  getAllPharmacies().then(list => {
    const ph = list.find(p => p.id === id);
    if (!ph) return;
    document.getElementById('pharma-form-id').value   = id;
    document.getElementById('pharma-code').value       = ph.code;
    document.getElementById('pharma-nom').value        = ph.nom || '';
    document.getElementById('pharma-telephone').value  = ph.telephone || '';
    document.getElementById('adm-pharma-modal-title').textContent = 'Modifier Pharmacie';
    openAdminModal('adm-modal-pharma');
  });
}

document.getElementById('pharma-form').addEventListener('submit', async (e) => {
  e.preventDefault();
  const id   = document.getElementById('pharma-form-id').value;
  const code = document.getElementById('pharma-code').value.trim().toUpperCase();
  const nom  = document.getElementById('pharma-nom').value.trim();
  const tel  = document.getElementById('pharma-telephone').value.trim();
  try {
    if (id) {
      await updatePharmacie(id, { nom, telephone: tel });
    } else {
      await createPharmacie({ code, nom, telephone: tel });
    }
    closeAdminModal();
    toast(id ? 'Pharmacie modifiée' : 'Pharmacie créée', 'success');
    renderAdminPharmacies();
    renderAdminOverview();
  } catch(err) { toast('Erreur: '+err.message,'error'); }
});

async function doDeletePharmacie(id, nom) {
  if (!confirm(`Supprimer la pharmacie "${nom}" ?\nToutes ses données seront perdues.`)) return;
  try {
    await deletePharmacie(id);
    toast('Pharmacie supprimée','success');
    renderAdminPharmacies();
    renderAdminOverview();
  } catch(e) { toast('Erreur: '+e.message,'error'); }
}

// Gérer abonnement
function openGererAbonnement(pharmacieId) {
  document.getElementById('abo-pharma-id').value = pharmacieId;
  getAllPharmacies().then(list => {
    const ph = list.find(p => p.id === pharmacieId);
    if (!ph) return;
    const abo = ph.abonnement || {};
    document.getElementById('abo-statut').value = abo.statut || 'essai';
    document.getElementById('abo-plan').value   = abo.plan   || '';
    openAdminModal('adm-modal-abonnement');
  });
}

document.getElementById('abo-form').addEventListener('submit', async (e) => {
  e.preventDefault();
  const id     = document.getElementById('abo-pharma-id').value;
  const statut = document.getElementById('abo-statut').value;
  const plan   = document.getElementById('abo-plan').value.trim();
  try {
    await updatePharmacie(id, { abonnement: {
      statut, plan: plan || null,
      dateDebut: statut === 'actif' ? firebase.firestore.FieldValue.serverTimestamp() : null,
      dateFin: null
    }});
    closeAdminModal();
    toast('Abonnement mis à jour','success');
    renderAdminAbonnements();
  } catch(err) { toast('Erreur: '+err.message,'error'); }
});

function openAdminModal(id) {
  document.getElementById('admin-modal-overlay').classList.remove('hidden');
  document.querySelectorAll('.admin-modal').forEach(m => m.classList.add('hidden'));
  document.getElementById(id).classList.remove('hidden');
}
function closeAdminModal() {
  document.getElementById('admin-modal-overlay').classList.add('hidden');
}
document.getElementById('admin-modal-overlay').addEventListener('click', e => {
  if (e.target === document.getElementById('admin-modal-overlay')) closeAdminModal();
});

// ══════════════════════════════════════════════════════════════
//  GESTION UTILISATEURS (titulaire)
// ══════════════════════════════════════════════════════════════

async function renderUsers() {
  if (!currentUser || (currentUser.role !== 'superadmin' && currentUser.role !== 'titulaire')) {
    navigate('dashboard'); return;
  }
  const tbody = document.getElementById('users-tbody');
  tbody.innerHTML = '<tr><td colspan="5" style="text-align:center;padding:20px">Chargement…</td></tr>';
  try {
    const users = currentUser.role === 'titulaire'
      ? await getUsersByPharmacie(currentUser.pharmacieId)
      : await getAllUsers();
    tbody.innerHTML = users.map(u => `
      <tr>
        <td><strong>${esc(u.name)}</strong></td>
        <td>${esc(u.email)}</td>
        <td><span class="badge badge-${u.role==='superadmin'?'superadmin':u.role==='titulaire'?'titulaire':'user'}">${
          u.role==='superadmin'?'Super Admin':u.role==='titulaire'?'Titulaire':'Opérateur'
        }</span></td>
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

// ══════════════════════════════════════════════════════════════
//  CLÔTURE QUINZAINE
// ══════════════════════════════════════════════════════════════

async function doCloturerQuinzaine(key) {
  if (!confirm('Clôturer cette quinzaine ? La saisie sera verrouillée.')) return;
  try {
    await getQuinzaineDocRef(key).update({ cloturee: true, clotureeAt: firebase.firestore.FieldValue.serverTimestamp() });
    toast('Quinzaine clôturée ✓', 'success');
    logAction('Clôture quinzaine', key, currentUser?.name||'');
    renderDetail(key);
  } catch(e) { toast('Erreur: '+e.message, 'error'); }
}

async function doRouvrirQuinzaine(key) {
  if (!confirm('Rouvrir cette quinzaine ?')) return;
  try {
    await getQuinzaineDocRef(key).update({ cloturee: false });
    toast('Quinzaine rouverte ✓', 'success');
    logAction('Réouverture quinzaine', key, currentUser?.name||'');
    renderDetail(key);
  } catch(e) { toast('Erreur: '+e.message, 'error'); }
}

// ══════════════════════════════════════════════════════════════
//  SUIVI INAM / AMU
// ══════════════════════════════════════════════════════════════

const MOIS_INAM = ['JANVIER','FÉVRIER','MARS','AVRIL','MAI','JUIN','JUILLET','AOÛT','SEPTEMBRE','OCTOBRE','NOVEMBRE','DÉCEMBRE'];

function buildInamQuinzaine() {
  const q    = document.getElementById('inam-entry-qnum').value;
  const mois = document.getElementById('inam-entry-mois').value;
  const an   = document.getElementById('inam-entry-annee').value;
  const bis  = document.getElementById('inam-entry-bis').checked;
  return `${q} ${mois} ${an}${bis ? ' BIS' : ''}`;
}

function updateInamPreview() {
  const el = document.getElementById('inam-quinzaine-preview');
  if (el) el.textContent = buildInamQuinzaine();
}

function initInamQuinzaineSelectors(quinzaine) {
  // Populate years
  const selAn = document.getElementById('inam-entry-annee');
  const curY = new Date().getFullYear();
  selAn.innerHTML = '';
  for (let y = 2024; y <= curY + 2; y++) {
    const o = document.createElement('option');
    o.value = y; o.textContent = y;
    selAn.appendChild(o);
  }
  // Wire preview update
  ['inam-entry-qnum','inam-entry-mois','inam-entry-annee','inam-entry-bis'].forEach(id => {
    const el = document.getElementById(id);
    if (el) el.addEventListener('change', updateInamPreview);
  });
  // Parse existing quinzaine string if editing
  if (quinzaine) {
    const parts = quinzaine.split(' ');
    const isBis = parts[parts.length-1] === 'BIS';
    const clean = isBis ? parts.slice(0,-1) : parts;
    if (clean[0]) document.getElementById('inam-entry-qnum').value = clean[0];
    if (clean[1]) document.getElementById('inam-entry-mois').value = clean[1];
    if (clean[2]) document.getElementById('inam-entry-annee').value = clean[2];
    document.getElementById('inam-entry-bis').checked = isBis;
  } else {
    // Defaults: current month/year
    document.getElementById('inam-entry-mois').value = MOIS_INAM[new Date().getMonth()];
    document.getElementById('inam-entry-annee').value = curY;
    document.getElementById('inam-entry-bis').checked = false;
  }
  updateInamPreview();
}

async function renderInamAmu() {
  const tableBody = document.getElementById('inam-tbody');
  if (tableBody) tableBody.innerHTML = `<tr><td colspan="9" style="text-align:center;padding:20px">Chargement…</td></tr>`;
  try {
    const list = await getAllSuiviInamAmu();

    const totFacture = list.reduce((s,r) => s + (r.montantFacture||0), 0);
    const totPaye    = list.reduce((s,r) => s + (r.montantPaye||0), 0);
    const totReste   = totFacture - totPaye;
    const nbEncours  = list.filter(r => r.statut === 'en cours de paiement').length;

    const sumRow = document.getElementById('inam-summary');
    if (sumRow) sumRow.innerHTML = `
      <div class="inam-sum-card inam-c"><div class="isc-val">${fmtA(totFacture)}</div><div class="isc-label">Total facturé</div></div>
      <div class="inam-sum-card inam-c"><div class="isc-val">${fmtA(totPaye)}</div><div class="isc-label">Total payé</div></div>
      <div class="inam-sum-card amu-c"><div class="isc-val">${fmtA(totReste)}</div><div class="isc-label">Reste à percevoir</div></div>
      ${nbEncours ? `<div class="inam-sum-card" style="border-color:var(--warning)"><div class="isc-val" style="color:var(--warning)">${nbEncours}</div><div class="isc-label">En cours de paiement</div></div>` : ''}`;

    if (!tableBody) return;
    if (!list.length) {
      tableBody.innerHTML = `<tr><td colspan="9"><div class="empty-state">
        <div class="empty-icon">🏥</div><h3>Aucun enregistrement</h3>
        <p>Cliquez sur "Nouvelle entrée" pour ajouter un paiement INAM ou AMU.</p></div></td></tr>`;
      return;
    }
    list.sort((a, b) => (b.date||'').localeCompare(a.date||''));
    tableBody.innerHTML = list.map(r => {
      const reste  = (r.montantFacture||0) - (r.montantPaye||0);
      const statut = r.statut || (reste <= 0 ? 'payé' : (r.montantPaye||0) > 0 ? 'en cours de paiement' : 'non payé');
      const cls    = statut === 'payé' ? 'statut-paye' : statut === 'en cours de paiement' ? 'statut-partiel' : 'statut-nonpaye';
      const label  = statut === 'payé' ? 'Payé' : statut === 'en cours de paiement' ? 'En cours' : 'Non payé';
      return `<tr>
        <td>${esc(r.date||'')}</td>
        <td><span class="badge" style="background:${r.entite==='INAM'?'rgba(41,128,185,.12)':'rgba(39,174,96,.12)'};color:${r.entite==='INAM'?'var(--info,#2980b9)':'var(--success)'}">${esc(r.entite||'')}</span></td>
        <td>${esc(r.quinzaine||'')}</td>
        <td class="amount">${fmtA(r.montantFacture)}</td>
        <td class="amount">${fmtA(r.montantPaye)}</td>
        <td class="amount ${reste > 0 ? 'danger' : ''}">${fmtA(reste)}</td>
        <td><span class="${cls}">${label}</span></td>
        <td>${esc(r.dateVirement||'')}</td>
        <td>
          <button class="btn btn-outline btn-sm" onclick="openEditInamEntry('${r.id}')">✏️</button>
          <button class="btn btn-danger btn-sm" onclick="doDeleteInamEntry('${r.id}')">🗑️</button>
        </td>
      </tr>`;
    }).join('');
  } catch(e) { console.error(e); toast('Erreur chargement INAM/AMU','error'); }
}

function openNewInamEntry() {
  document.getElementById('inam-entry-id').value = '';
  document.getElementById('inam-entry-date').value = new Date().toISOString().slice(0,10);
  document.getElementById('inam-entry-entite').value = 'INAM';
  document.getElementById('inam-entry-facture').value = '';
  document.getElementById('inam-entry-paye').value = '';
  document.getElementById('inam-entry-statut').value = 'non payé';
  document.getElementById('inam-entry-virement').value = '';
  document.getElementById('inam-entry-title').textContent = '🏥 Nouvelle entrée INAM / AMU';
  initInamQuinzaineSelectors(null);
  openModal('modal-inam-entry');
}

async function openEditInamEntry(id) {
  try {
    const list = await getAllSuiviInamAmu();
    const r = list.find(x => x.id === id);
    if (!r) return toast('Enregistrement introuvable','error');
    document.getElementById('inam-entry-id').value    = id;
    document.getElementById('inam-entry-date').value  = r.date||'';
    document.getElementById('inam-entry-entite').value = r.entite||'INAM';
    document.getElementById('inam-entry-facture').value = r.montantFacture||'';
    document.getElementById('inam-entry-paye').value   = r.montantPaye||'';
    document.getElementById('inam-entry-statut').value = r.statut||'non payé';
    document.getElementById('inam-entry-virement').value = r.dateVirement||'';
    document.getElementById('inam-entry-title').textContent = '✏️ Modifier entrée INAM / AMU';
    initInamQuinzaineSelectors(r.quinzaine||'');
    openModal('modal-inam-entry');
  } catch(e) { toast('Erreur: '+e.message,'error'); }
}

async function saveInamEntry() {
  const id             = document.getElementById('inam-entry-id').value;
  const date           = document.getElementById('inam-entry-date').value;
  const entite         = document.getElementById('inam-entry-entite').value;
  const quinzaine      = buildInamQuinzaine();
  const montantFacture = parseFloat(document.getElementById('inam-entry-facture').value)||0;
  const montantPaye    = parseFloat(document.getElementById('inam-entry-paye').value)||0;
  const statut         = document.getElementById('inam-entry-statut').value;
  const dateVirement   = document.getElementById('inam-entry-virement').value;
  if (!date || !entite) return toast('Veuillez remplir la Date et l\'Entité','error');
  try {
    const data = { date, entite, quinzaine, montantFacture, montantPaye, statut, dateVirement };
    if (id) { await updateSuiviInamAmu(id, data); } else { await saveSuiviInamAmu(data); }
    closeModal();
    toast('Enregistrement sauvegardé ✓','success');
    renderInamAmu();
  } catch(e) { toast('Erreur: '+e.message,'error'); }
}

async function doDeleteInamEntry(id) {
  if (!confirm('Supprimer cet enregistrement ?')) return;
  try {
    await deleteSuiviInamAmu(id);
    toast('Supprimé','success');
    renderInamAmu();
  } catch(e) { toast('Erreur: '+e.message,'error'); }
}

// ══════════════════════════════════════════════════════════════
//  PETITE CAISSE
// ══════════════════════════════════════════════════════════════

async function renderCaisse() {
  const tableBody = document.getElementById('caisse-tbody');
  if (!tableBody) return;
  tableBody.innerHTML = `<tr><td colspan="8" style="text-align:center;padding:20px">Chargement…</td></tr>`;
  try {
    const ops = await getAllCaisseOps();
    const canEdit = currentUser && (currentUser.role === 'superadmin' || currentUser.role === 'titulaire');

    // Solde global
    let solde = 0;
    ops.slice().reverse().forEach(op => {
      solde += op.type === 'recharge' ? (op.montant||0) : -(op.montant||0);
    });
    const soldeEl = document.getElementById('caisse-solde');
    if (soldeEl) {
      soldeEl.textContent = fmtA(solde);
      soldeEl.style.color = solde >= 0 ? 'var(--success)' : 'var(--danger)';
    }
    const lastRecharge = ops.find(o => o.type === 'recharge');
    const lrEl = document.getElementById('caisse-last-recharge');
    if (lrEl) lrEl.textContent = lastRecharge ? (lastRecharge.date || '—') : '—';

    if (!ops.length) {
      tableBody.innerHTML = `<tr><td colspan="8"><div class="empty-state">
        <div class="empty-icon">💰</div><h3>Caisse vide</h3>
        <p>Rechargez la caisse ou enregistrez une dépense.</p></div></td></tr>`;
      return;
    }
    // Solde progressif (tri chronologique)
    let soldeRun = 0;
    const soldesMap = {};
    ops.slice().reverse().forEach(op => {
      soldeRun += op.type === 'recharge' ? (op.montant||0) : -(op.montant||0);
      soldesMap[op.id] = soldeRun;
    });

    tableBody.innerHTML = ops.map(op => {
      const isRecharge = op.type === 'recharge';
      const rowClass   = isRecharge ? 'caisse-recharge' : 'caisse-depense';
      const ref        = isRecharge && op.typeRecharge === 'mobilemoney' ? esc(op.refTransaction||'—') : (isRecharge ? 'Espèce' : '—');
      const actions    = isRecharge && canEdit
        ? `<button class="btn btn-outline btn-sm" onclick="openEditRecharge('${op.id}')">✏️</button>
           <button class="btn btn-danger btn-sm" onclick="doDeleteCaisseOp('${op.id}')">🗑️</button>`
        : (!isRecharge ? `<button class="btn btn-danger btn-sm" onclick="doDeleteCaisseOp('${op.id}')">🗑️</button>` : '');
      return `<tr class="${rowClass}">
        <td>${esc(op.date||'—')}</td>
        <td><span class="badge" style="background:${isRecharge?'rgba(39,174,96,.15)':'rgba(231,76,60,.1)'};color:${isRecharge?'var(--success)':'var(--danger)'}">${isRecharge?'Recharge':'Dépense'}</span></td>
        <td>${esc(op.libelle || op.designation || (isRecharge ? 'Recharge caisse' : '—'))}</td>
        <td style="font-size:12px;color:var(--text-muted)">${ref}</td>
        <td class="amount ${isRecharge?'':'danger'}"><strong>${isRecharge?'+':'-'} ${fmtA(op.montant)}</strong></td>
        <td class="amount">${fmtA(soldesMap[op.id]||0)}</td>
        <td style="font-size:12px">${esc(op.note||'')}</td>
        <td style="display:flex;gap:4px">${actions}</td>
      </tr>`;
    }).join('');
  } catch(e) { console.error(e); toast('Erreur chargement caisse','error'); }
}

function onRechargeTypeChange() {
  const type = document.getElementById('recharge-type').value;
  const row  = document.getElementById('recharge-ref-row');
  if (row) row.classList.toggle('hidden', type !== 'mobilemoney');
}

function openRecharge() {
  document.getElementById('recharge-id').value     = '';
  document.getElementById('recharge-date').value   = new Date().toISOString().slice(0,10);
  document.getElementById('recharge-montant').value = '';
  document.getElementById('recharge-type').value   = 'espece';
  document.getElementById('recharge-ref').value    = '';
  document.getElementById('recharge-obs').value    = '';
  document.getElementById('recharge-ref-row').classList.add('hidden');
  openModal('modal-recharge');
}

async function openEditRecharge(id) {
  const ops = await getAllCaisseOps();
  const op  = ops.find(x => x.id === id);
  if (!op) return;
  document.getElementById('recharge-id').value      = id;
  document.getElementById('recharge-date').value    = op.date||'';
  document.getElementById('recharge-montant').value = op.montant||'';
  document.getElementById('recharge-type').value    = op.typeRecharge||'espece';
  document.getElementById('recharge-ref').value     = op.refTransaction||'';
  document.getElementById('recharge-obs').value     = op.note||'';
  document.getElementById('recharge-ref-row').classList.toggle('hidden', (op.typeRecharge||'espece') !== 'mobilemoney');
  openModal('modal-recharge');
}

async function saveRecharge() {
  const id          = document.getElementById('recharge-id').value;
  const date        = document.getElementById('recharge-date').value;
  const montant     = parseFloat(document.getElementById('recharge-montant').value)||0;
  const typeRecharge= document.getElementById('recharge-type').value;
  const refTransaction = document.getElementById('recharge-ref').value.trim();
  const note        = document.getElementById('recharge-obs').value.trim();
  if (!date || !montant) return toast('Date et montant obligatoires','error');
  if (typeRecharge === 'mobilemoney' && !refTransaction) return toast('Référence transaction obligatoire pour Mobile Money','error');
  const data = { type: 'recharge', date, montant, typeRecharge, refTransaction, note,
                 libelle: typeRecharge === 'mobilemoney' ? `Recharge MM — ${refTransaction}` : 'Recharge caisse (espèce)' };
  try {
    if (id) { await saveCaisseOp({ ...data, id }); }
    else    { await saveCaisseOp(data); }
    closeModal();
    toast(id ? 'Recharge modifiée ✓' : 'Recharge enregistrée ✓','success');
    logAction('Recharge caisse', `${montant} F`, currentUser?.name||'');
    renderCaisse();
  } catch(e) { toast('Erreur: '+e.message,'error'); }
}

function openDepense() {
  document.getElementById('depense-id').value          = '';
  document.getElementById('depense-date').value        = new Date().toISOString().slice(0,10);
  document.getElementById('depense-montant').value     = '';
  document.getElementById('depense-fournisseur').value = '';
  document.getElementById('depense-designation').value = '';
  document.getElementById('depense-obs').value         = '';
  openModal('modal-depense');
}

async function saveDepense() {
  const id          = document.getElementById('depense-id').value;
  const date        = document.getElementById('depense-date').value;
  const montant     = parseFloat(document.getElementById('depense-montant').value)||0;
  const fournisseur = document.getElementById('depense-fournisseur').value.trim();
  const libelle     = document.getElementById('depense-designation').value.trim();
  const note        = document.getElementById('depense-obs').value.trim();
  if (!date || !montant || !libelle) return toast('Date, montant et désignation obligatoires','error');
  try {
    await saveCaisseOp({ type: 'depense', date, montant, fournisseur, libelle, note });
    closeModal();
    toast('Dépense enregistrée ✓','success');
    logAction('Dépense caisse', `${libelle} — ${montant} F`, currentUser?.name||'');
    renderCaisse();
  } catch(e) { toast('Erreur: '+e.message,'error'); }
}

async function doDeleteCaisseOp(id) {
  if (!confirm('Supprimer cette opération ?')) return;
  try {
    await deleteCaisseOp(id);
    toast('Opération supprimée','success');
    renderCaisse();
  } catch(e) { toast('Erreur: '+e.message,'error'); }
}

// Afficher/masquer champ échéance dans le formulaire caisse
function toggleProspect(cb) {
  const row = document.getElementById('caisse-echeance-row');
  if (row) row.classList.toggle('hidden', !cb.checked);
}

// ══════════════════════════════════════════════════════════════
//  SUIVI FOURNISSEURS
// ══════════════════════════════════════════════════════════════

let _frsStatutFilter = 'all'; // 'all' | 'apayer' | 'payees'

function setFrsFilter(f) {
  _frsStatutFilter = f;
  ['all','apayer','payees'].forEach(k => {
    const el = document.getElementById('frs-tab-' + k);
    if (el) el.classList.toggle('active', k === f);
  });
  renderFournisseurs();
}

async function renderFournisseurs() {
  const tableBody = document.getElementById('frs-tbody');
  if (!tableBody) return;
  tableBody.innerHTML = `<tr><td colspan="8" style="text-align:center;padding:20px">Chargement…</td></tr>`;
  try {
    const list = await getAllFactures();
    const now  = Date.now();
    const limit72 = now + 72 * 3600 * 1000;

    // Alertes 72h ou selon alerteJours custom
    const alerts = list.filter(f => {
      if (f.statut === 'payé') return false;
      if (!f.echeance) return false;
      const ts = new Date(f.echeance).getTime();
      const jours = f.alerteJours ? f.alerteJours * 86400000 : 72 * 3600 * 1000;
      return ts >= now && ts <= now + jours;
    });
    const notifBar = document.getElementById('frs-notif-bar');
    if (notifBar) {
      if (alerts.length) {
        notifBar.classList.remove('hidden');
        notifBar.textContent = `⚠️ ${alerts.length} facture(s) arrivent à échéance prochainement : ${alerts.map(f=>esc(f.fournisseur)).join(', ')}`;
      } else notifBar.classList.add('hidden');
    }

    // Stats
    const total   = list.reduce((s,f) => s+(f.montant||0), 0);
    const paye    = list.reduce((s,f) => s+(f.statut==='payé'?(f.montant||0):0), 0);
    const encours = list.filter(f => f.statut === 'en cours').length;
    const el_tot  = document.getElementById('frs-stat-total');
    const el_due  = document.getElementById('frs-stat-due');
    const el_enc  = document.getElementById('frs-stat-encours');
    const el_pay  = document.getElementById('frs-stat-paye');
    if (el_tot) el_tot.textContent = fmtA(total);
    if (el_due) el_due.textContent = alerts.length;
    if (el_enc) el_enc.textContent = encours;
    if (el_pay) el_pay.textContent = fmtA(paye);

    // Filtre par mois
    const filtreMois = (document.getElementById('frs-filter-month') || {}).value || '';
    let filtered = filtreMois ? list.filter(f => (f.dateFacture||'').startsWith(filtreMois)) : list;

    // Filtre par statut
    if (_frsStatutFilter === 'apayer') filtered = filtered.filter(f => f.statut !== 'payé');
    else if (_frsStatutFilter === 'payees') filtered = filtered.filter(f => f.statut === 'payé');

    if (!filtered.length) {
      tableBody.innerHTML = `<tr><td colspan="8"><div class="empty-state">
        <div class="empty-icon">🏭</div><h3>Aucune facture</h3>
        <p>Ajoutez des factures fournisseurs.</p></div></td></tr>`;
      return;
    }

    tableBody.innerHTML = filtered.map(f => {
      const isAlerte = alerts.some(a => a.id === f.id);
      const badgeClass = f.statut === 'payé' ? 'badge-frs-paye' : isAlerte ? 'badge-frs-alerte' : f.statut === 'en cours' ? 'badge-frs-encours' : 'badge-frs-nonpaye';
      const statutLbl  = f.statut === 'payé' ? 'Payé' : isAlerte ? '⚠️ Urgent' : f.statut === 'en cours' ? 'En cours' : 'Non payé';
      return `<tr>
        <td>${esc(f.dateFacture||'—')}</td>
        <td><strong>${esc(f.fournisseur||'—')}</strong></td>
        <td>${esc(f.designation||'—')}</td>
        <td class="amount">${fmtA(f.montant)}</td>
        <td>${esc(f.echeance||'—')}</td>
        <td class="amount" style="color:var(--success)">${fmtA(f.montantPaye||0)}</td>
        <td>
          <select class="filter-select" style="padding:3px 6px;font-size:12px" onchange="quickChangeStatutFacture('${f.id}', this.value)">
            <option value="non payé" ${(f.statut||'non payé')==='non payé'?'selected':''}>Non payé</option>
            <option value="en cours" ${f.statut==='en cours'?'selected':''}>En cours</option>
            <option value="payé"     ${f.statut==='payé'?'selected':''}>Payé</option>
          </select>
        </td>
        <td>
          <button class="btn btn-outline btn-sm" onclick="openEditFacture('${f.id}')">✏️</button>
          <button class="btn btn-outline btn-sm" onclick="openPayFacture('${f.id}')">💳</button>
          <button class="btn btn-danger btn-sm btn-icon" onclick="doDeleteFacture('${f.id}')">🗑️</button>
        </td>
      </tr>`;
    }).join('');
  } catch(e) { console.error(e); toast('Erreur chargement fournisseurs','error'); }
}

async function quickChangeStatutFacture(id, newStatut) {
  try {
    await updateFacture(id, { statut: newStatut });
    toast('Statut mis à jour ✓','success');
    renderFournisseurs();
  } catch(e) { toast('Erreur: '+e.message,'error'); }
}

async function exportFrsExcel() {
  try {
    const list = await getAllFactures();
    const filtreMois = (document.getElementById('frs-filter-month')||{}).value||'';
    let filtered = filtreMois ? list.filter(f=>(f.dateFacture||'').startsWith(filtreMois)) : list;
    if (_frsStatutFilter === 'apayer') filtered = filtered.filter(f => f.statut !== 'payé');
    else if (_frsStatutFilter === 'payees') filtered = filtered.filter(f => f.statut === 'payé');
    if (!filtered.length) { toast('Aucune donnée à exporter','error'); return; }
    const wb = XLSX.utils.book_new();
    const rows = [['Date','Fournisseur','Désignation','Montant','Échéance','Montant payé','Statut','Observations']];
    filtered.forEach(f => rows.push([f.dateFacture||'',f.fournisseur||'',f.designation||'',f.montant||0,f.echeance||'',f.montantPaye||0,f.statut||'',f.note||'']));
    const ws = XLSX.utils.aoa_to_sheet(rows);
    XLSX.utils.book_append_sheet(wb, ws, 'Fournisseurs');
    const label = filtreMois || 'COMPLET';
    XLSX.writeFile(wb, `FOURNISSEURS_${label}.xlsx`);
    toast('Export Excel OK ✓','success');
  } catch(e) { toast('Erreur Excel: '+e.message,'error'); }
}

async function exportFrsPDF() {
  try {
    const list = await getAllFactures();
    const filtreMois = (document.getElementById('frs-filter-month')||{}).value||'';
    let filtered = filtreMois ? list.filter(f=>(f.dateFacture||'').startsWith(filtreMois)) : list;
    if (_frsStatutFilter === 'apayer') filtered = filtered.filter(f => f.statut !== 'payé');
    else if (_frsStatutFilter === 'payees') filtered = filtered.filter(f => f.statut === 'payé');
    if (!filtered.length) { toast('Aucune donnée à exporter','error'); return; }
    const { jsPDF } = window.jspdf;
    const doc = new jsPDF({ orientation:'landscape' });
    doc.setFontSize(14);
    doc.text('Suivi Fournisseurs' + (filtreMois ? ' — ' + filtreMois : ''), 14, 14);
    doc.autoTable({
      startY: 20,
      head: [['Date','Fournisseur','Désignation','Montant','Échéance','Payé','Statut']],
      body: filtered.map(f => [f.dateFacture||'',f.fournisseur||'',f.designation||'',fmtA(f.montant),f.echeance||'',fmtA(f.montantPaye||0),f.statut||'']),
      styles: { fontSize: 9 }
    });
    const label = filtreMois || 'COMPLET';
    doc.save(`FOURNISSEURS_${label}.pdf`);
    toast('Export PDF OK ✓','success');
  } catch(e) { toast('Erreur PDF: '+e.message,'error'); }
}

function onProspectiveChange() {
  const checked = document.getElementById('facture-prospective').checked;
  const row = document.getElementById('facture-alerte-row');
  if (row) row.style.display = checked ? '' : 'none';
}

function openNewFacture() {
  document.getElementById('facture-id').value = '';
  ['facture-fournisseur','facture-date','facture-echeance','facture-designation','facture-obs','facture-mode','facture-ref'].forEach(id => {
    const el = document.getElementById(id); if (el) el.value = '';
  });
  document.getElementById('facture-montant').value = 0;
  document.getElementById('facture-statut').value  = 'non payé';
  const prospEl = document.getElementById('facture-prospective');
  if (prospEl) { prospEl.checked = false; }
  const alerteRow = document.getElementById('facture-alerte-row');
  if (alerteRow) alerteRow.style.display = 'none';
  const alerteJoursEl = document.getElementById('facture-alerte-jours');
  if (alerteJoursEl) alerteJoursEl.value = 7;
  document.getElementById('modal-facture-title').textContent = 'Nouvelle Facture';
  refreshFrsDatalist();
  openModal('modal-facture');
}

async function openEditFacture(id) {
  const list = await getAllFactures();
  const f = list.find(x => x.id === id);
  if (!f) return;
  document.getElementById('facture-id').value          = f.id;
  document.getElementById('facture-fournisseur').value = f.fournisseur || '';
  document.getElementById('facture-date').value        = f.dateFacture || '';
  document.getElementById('facture-echeance').value    = f.echeance    || '';
  document.getElementById('facture-montant').value     = f.montant     || 0;
  document.getElementById('facture-designation').value = f.designation || '';
  document.getElementById('facture-statut').value      = f.statut      || 'non payé';
  document.getElementById('facture-obs').value         = f.note        || '';
  const prospEl = document.getElementById('facture-prospective');
  if (prospEl) prospEl.checked = !!(f.prospective);
  const alerteRow = document.getElementById('facture-alerte-row');
  if (alerteRow) alerteRow.style.display = f.prospective ? '' : 'none';
  const alerteJoursEl = document.getElementById('facture-alerte-jours');
  if (alerteJoursEl) alerteJoursEl.value = f.alerteJours || 7;
  document.getElementById('modal-facture-title').textContent = 'Modifier Facture';
  refreshFrsDatalist();
  openModal('modal-facture');
}

async function saveFactureForm() {
  const id          = document.getElementById('facture-id').value;
  const fournisseur = document.getElementById('facture-fournisseur').value.trim();
  const dateFacture = document.getElementById('facture-date').value;
  const echeance    = document.getElementById('facture-echeance').value;
  const montant     = parseFloat(document.getElementById('facture-montant').value)||0;
  const designation = document.getElementById('facture-designation').value.trim();
  const statut      = document.getElementById('facture-statut').value;
  const note        = document.getElementById('facture-obs').value.trim();
  const mode        = document.getElementById('facture-mode').value;
  const ref         = document.getElementById('facture-ref').value.trim();
  const prospective = document.getElementById('facture-prospective').checked;
  const alerteJours = prospective ? (parseInt(document.getElementById('facture-alerte-jours').value)||7) : null;
  if (!fournisseur || !montant) { toast('Remplissez fournisseur et montant','error'); return; }
  try {
    const existing = id ? (await getAllFactures()).find(f => f.id === id) : null;
    await saveFacture({ id: id||undefined, fournisseur, dateFacture, echeance, montant, designation, statut, note, mode, ref, prospective, alerteJours, montantPaye: existing ? (existing.montantPaye||0) : 0 });
    closeModal();
    toast('Facture enregistrée ✓','success');
    logAction(id ? 'Modif facture' : 'Ajout facture', `${fournisseur} — ${montant} F`, currentUser?.name||'');
    renderFournisseurs();
  } catch(e) { toast('Erreur: '+e.message,'error'); }
}

async function openPayFacture(id) {
  const list = await getAllFactures();
  const f = list.find(x => x.id === id);
  if (!f) return;
  const montant = prompt(`Montant payé pour ${f.fournisseur} (total: ${fmtA(f.montant)}) :`, '0');
  if (montant === null) return;
  const val = parseFloat(montant)||0;
  const nouvPaye = (f.montantPaye||0) + val;
  const statut   = nouvPaye >= (f.montant||0) ? 'payé' : 'en cours';
  try {
    await updateFacture(id, { montantPaye: nouvPaye, statut });
    toast('Paiement enregistré ✓','success');
    renderFournisseurs();
  } catch(e) { toast('Erreur: '+e.message,'error'); }
}

async function doDeleteFacture(id) {
  if (!confirm('Supprimer cette facture ?')) return;
  try {
    await deleteFacture(id);
    toast('Facture supprimée','success');
    renderFournisseurs();
  } catch(e) { toast('Erreur: '+e.message,'error'); }
}

// ══════════════════════════════════════════════════════════════
//  SECTION DONNÉES — exports centralisés
// ══════════════════════════════════════════════════════════════

function renderDonnees() {
  // Initialise la date fin à aujourd'hui si vide
  const fin = document.getElementById('donnees-date-fin');
  if (fin && !fin.value) fin.value = new Date().toISOString().slice(0,10);
  previewDonnees();
}

async function _getDonneesData() {
  const module = document.getElementById('donnees-module').value;
  const debut  = document.getElementById('donnees-date-debut').value || '';
  const fin    = document.getElementById('donnees-date-fin').value   || '';

  function inRange(dateStr) {
    if (!dateStr) return true;
    if (debut && dateStr < debut) return false;
    if (fin   && dateStr > fin)   return false;
    return true;
  }

  if (module === 'inam') {
    const list = await getAllSuiviInamAmu();
    return list.filter(r => inRange(r.date));
  } else if (module === 'caisse') {
    const list = await getAllCaisseOps();
    return list.filter(r => inRange(r.date));
  } else if (module === 'fournisseurs') {
    const list = await getAllFactures();
    return list.filter(f => inRange(f.dateFacture));
  }
  return [];
}

async function previewDonnees() {
  const countEl = document.getElementById('donnees-preview-count');
  const tableEl = document.getElementById('donnees-preview-table');
  if (!countEl || !tableEl) return;
  try {
    const data = await _getDonneesData();
    countEl.textContent = `${data.length} enregistrement(s) sélectionné(s)`;
  } catch(e) { /* silencieux */ }
}

async function exportDonneesExcel() {
  try {
    const module = document.getElementById('donnees-module').value;
    const debut  = document.getElementById('donnees-date-debut').value || '';
    const fin    = document.getElementById('donnees-date-fin').value   || '';
    const data   = await _getDonneesData();
    if (!data.length) { toast('Aucune donnée dans la période sélectionnée','error'); return; }
    const wb = XLSX.utils.book_new();
    let rows;
    if (module === 'inam') {
      rows = [['Date','Entité','Quinzaine','Montant facturé','Montant payé','Statut','Date virement']];
      data.forEach(r => rows.push([r.date||'',r.entite||'',r.quinzaine||'',r.montantFacture||0,r.montantPaye||0,r.statut||'',r.dateVirement||'']));
    } else if (module === 'caisse') {
      rows = [['Date','Type','Désignation','Montant','Référence transaction','Observations']];
      data.forEach(r => rows.push([r.date||'',r.type||'',r.designation||r.source||'',r.montant||0,r.refTransaction||'',r.obs||'']));
    } else {
      rows = [['Date','Fournisseur','Désignation','Montant','Échéance','Montant payé','Statut']];
      data.forEach(r => rows.push([r.dateFacture||'',r.fournisseur||'',r.designation||'',r.montant||0,r.echeance||'',r.montantPaye||0,r.statut||'']));
    }
    const ws = XLSX.utils.aoa_to_sheet(rows);
    XLSX.utils.book_append_sheet(wb, ws, module.toUpperCase());
    const label = debut && fin ? `${debut}_${fin}` : debut || fin || 'COMPLET';
    XLSX.writeFile(wb, `EXPORT_${module.toUpperCase()}_${label}.xlsx`);
    toast('Export Excel OK ✓','success');
  } catch(e) { toast('Erreur Excel: '+e.message,'error'); }
}

async function exportDonneesPDF() {
  try {
    const module = document.getElementById('donnees-module').value;
    const debut  = document.getElementById('donnees-date-debut').value || '';
    const fin    = document.getElementById('donnees-date-fin').value   || '';
    const data   = await _getDonneesData();
    if (!data.length) { toast('Aucune donnée dans la période sélectionnée','error'); return; }
    const { jsPDF } = window.jspdf;
    const doc = new jsPDF({ orientation:'landscape' });
    const titre = { inam:'INAM / AMU', caisse:'Petite Caisse', fournisseurs:'Fournisseurs' }[module] || module;
    doc.setFontSize(14);
    doc.text(`Rapport ${titre}${debut?' — du '+debut:''}${fin?' au '+fin:''}`, 14, 14);
    let head, body;
    if (module === 'inam') {
      head = [['Date','Entité','Quinzaine','Montant facturé','Montant payé','Statut','Date virement']];
      body = data.map(r => [r.date||'',r.entite||'',r.quinzaine||'',fmtA(r.montantFacture),fmtA(r.montantPaye),r.statut||'',r.dateVirement||'']);
    } else if (module === 'caisse') {
      head = [['Date','Type','Désignation','Montant','Réf. transaction','Obs.']];
      body = data.map(r => [r.date||'',r.type||'',r.designation||r.source||'',fmtA(r.montant),r.refTransaction||'',r.obs||'']);
    } else {
      head = [['Date','Fournisseur','Désignation','Montant','Échéance','Payé','Statut']];
      body = data.map(r => [r.dateFacture||'',r.fournisseur||'',r.designation||'',fmtA(r.montant),r.echeance||'',fmtA(r.montantPaye||0),r.statut||'']);
    }
    doc.autoTable({ startY:20, head, body, styles:{ fontSize:9 } });
    const label = debut && fin ? `${debut}_${fin}` : debut || fin || 'COMPLET';
    doc.save(`EXPORT_${module.toUpperCase()}_${label}.pdf`);
    toast('Export PDF OK ✓','success');
  } catch(e) { toast('Erreur PDF: '+e.message,'error'); }
}

// Vérification 72h au démarrage
async function check72hNotifications() {
  try {
    const dues = await getUpcomingDue(72);
    if (dues.length) toast(`⚠️ ${dues.length} facture(s) fournisseur arrivent à échéance dans les 72h !`, 'info');
  } catch(e) { /* silencieux */ }
}

// ══════════════════════════════════════════════════════════════
//  BOOT
// ══════════════════════════════════════════════════════════════

document.addEventListener('DOMContentLoaded', initApp);
