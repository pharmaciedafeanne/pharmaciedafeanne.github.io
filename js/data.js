// ===== DATA LAYER — Firestore =====
// Modèle : chaque bon porte { dafeanne: {inam, amu}, depot: {inam, amu} }
// DAFEANNE et DÉPÔT = deux comptes de facturation distincts
// Facture finale quinzaine = (DAFEANNE_INAM + DÉPÔT_INAM) + (DAFEANNE_AMU + DÉPÔT_AMU)

const COLLECTIONS = { QUINZAINES: 'quinzaines', USERS: 'users' };

// ── Calculs ──────────────────────────────────────────────────────────

function recalcPeriod(period) {
  const t = {
    dafeanne: { inam: 0, amu: 0, total: 0 },
    depot:    { inam: 0, amu: 0, total: 0 },
    inam: 0, amu: 0, global: 0
  };

  (period.lots || []).forEach(lot => {
    const lt = {
      dafeanne: { inam: 0, amu: 0 },
      depot:    { inam: 0, amu: 0 }
    };
    (lot.bons || []).forEach(bon => {
      lt.dafeanne.inam += (bon.dafeanne && bon.dafeanne.inam) || 0;
      lt.dafeanne.amu  += (bon.dafeanne && bon.dafeanne.amu)  || 0;
      lt.depot.inam    += (bon.depot    && bon.depot.inam)    || 0;
      lt.depot.amu     += (bon.depot    && bon.depot.amu)     || 0;
    });
    lot.totaux = lt;
    t.dafeanne.inam += lt.dafeanne.inam;
    t.dafeanne.amu  += lt.dafeanne.amu;
    t.depot.inam    += lt.depot.inam;
    t.depot.amu     += lt.depot.amu;
  });

  t.dafeanne.total = t.dafeanne.inam + t.dafeanne.amu;
  t.depot.total    = t.depot.inam    + t.depot.amu;
  t.inam           = t.dafeanne.inam + t.depot.inam;
  t.amu            = t.dafeanne.amu  + t.depot.amu;
  t.global         = t.inam + t.amu;

  period.totaux = t;
  return period;
}

function periodKey(year, month, quinzaine) {
  return `${year}-${String(month).padStart(2,'0')}-${quinzaine}`;
}

// ── Quinzaines ───────────────────────────────────────────────────────

async function savePeriod(period) {
  period = recalcPeriod(period);
  const key = periodKey(period.year, period.month, period.quinzaine);
  period.updatedAt = firebase.firestore.FieldValue.serverTimestamp();
  if (!period.createdAt) period.createdAt = firebase.firestore.FieldValue.serverTimestamp();
  await getDB().collection(COLLECTIONS.QUINZAINES).doc(key).set(period, { merge: true });
  return { key, ...period };
}

async function getPeriod(year, month, quinzaine) {
  const doc = await getDB().collection(COLLECTIONS.QUINZAINES)
    .doc(periodKey(year, month, quinzaine)).get();
  return doc.exists ? { key: doc.id, ...doc.data() } : null;
}

async function getAllPeriods() {
  const snap = await getDB().collection(COLLECTIONS.QUINZAINES)
    .orderBy('year', 'desc').orderBy('month', 'desc').orderBy('quinzaine', 'asc').get();
  return snap.docs.map(d => ({ key: d.id, ...d.data() }));
}

async function deletePeriod(key) {
  await getDB().collection(COLLECTIONS.QUINZAINES).doc(key).delete();
}

async function getGlobalStats() {
  const periods = await getAllPeriods();
  return {
    total_inam:    periods.reduce((s, p) => s + ((p.totaux && p.totaux.inam)   || 0), 0),
    total_amu:     periods.reduce((s, p) => s + ((p.totaux && p.totaux.amu)    || 0), 0),
    total_global:  periods.reduce((s, p) => s + ((p.totaux && p.totaux.global) || 0), 0),
    dafeanne_inam: periods.reduce((s, p) => s + ((p.totaux && p.totaux.dafeanne && p.totaux.dafeanne.inam) || 0), 0),
    dafeanne_amu:  periods.reduce((s, p) => s + ((p.totaux && p.totaux.dafeanne && p.totaux.dafeanne.amu)  || 0), 0),
    depot_inam:    periods.reduce((s, p) => s + ((p.totaux && p.totaux.depot    && p.totaux.depot.inam)    || 0), 0),
    depot_amu:     periods.reduce((s, p) => s + ((p.totaux && p.totaux.depot    && p.totaux.depot.amu)     || 0), 0),
    nb_periods:    periods.length,
    nb_lots:       periods.reduce((s, p) => s + (p.lots || []).length, 0),
    nb_bons:       periods.reduce((s, p) => s + (p.lots || []).reduce((ss, l) => ss + (l.bons || []).length, 0), 0),
  };
}

async function getMonthlyStats() {
  const periods = await getAllPeriods();
  const monthly = {};
  periods.forEach(p => {
    const k = `${p.year}-${String(p.month).padStart(2,'0')}`;
    if (!monthly[k]) monthly[k] = {
      year: p.year, month: p.month,
      dafeanne_inam: 0, dafeanne_amu: 0,
      depot_inam: 0,    depot_amu: 0,
      total_inam: 0,    total_amu: 0, global: 0
    };
    const t = p.totaux || {};
    monthly[k].dafeanne_inam += (t.dafeanne && t.dafeanne.inam) || 0;
    monthly[k].dafeanne_amu  += (t.dafeanne && t.dafeanne.amu)  || 0;
    monthly[k].depot_inam    += (t.depot    && t.depot.inam)    || 0;
    monthly[k].depot_amu     += (t.depot    && t.depot.amu)     || 0;
    monthly[k].total_inam    += t.inam   || 0;
    monthly[k].total_amu     += t.amu    || 0;
    monthly[k].global        += t.global || 0;
  });
  return Object.values(monthly).sort((a, b) =>
    a.year !== b.year ? a.year - b.year : a.month - b.month
  );
}

// ── Utilisateurs ─────────────────────────────────────────────────────

async function getAllUsers() {
  const snap = await getDB().collection(COLLECTIONS.USERS)
    .orderBy('createdAt', 'desc').get();
  return snap.docs.map(d => ({ uid: d.id, ...d.data() }));
}

async function getUserProfile(uid) {
  const doc = await getDB().collection(COLLECTIONS.USERS).doc(uid).get();
  return doc.exists ? { uid: doc.id, ...doc.data() } : null;
}

async function createUserProfile(uid, data) {
  await getDB().collection(COLLECTIONS.USERS).doc(uid).set({
    ...data,
    createdAt: firebase.firestore.FieldValue.serverTimestamp()
  });
}

async function updateUserProfile(uid, data) {
  await getDB().collection(COLLECTIONS.USERS).doc(uid).update(data);
}

async function deleteUserProfile(uid) {
  await getDB().collection(COLLECTIONS.USERS).doc(uid).delete();
}
