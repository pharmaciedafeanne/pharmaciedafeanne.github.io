// ===== DATA LAYER — Firestore Multi-Pharmacie =====
// Structure : pharmacies/{pharmacieId}/quinzaines/{key}
// Chaque bon porte { dafeanne: {inam, amu}, depot: {inam, amu} }

const COLLECTIONS = { USERS: 'users', PHARMACIES: 'pharmacies' };

// Contexte pharmacie courant (défini par app.js)
let _currentPharmacieId = null;
function setPharmacieContext(id) { _currentPharmacieId = id; }
function getPharmacieId() { return _currentPharmacieId; }

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

function periodKey(year, month, quinzaine, bis) {
  return `${year}-${String(month).padStart(2,'0')}-${quinzaine}${bis ? '-BIS' : ''}`;
}

// ── Référence sous-collection quinzaines ─────────────────────────────

function quinzainesRef(pharmacieId) {
  const pid = pharmacieId || _currentPharmacieId;
  return getDB().collection(COLLECTIONS.PHARMACIES).doc(pid).collection('quinzaines');
}

function getQuinzaineDocRef(key, pharmacieId) {
  return quinzainesRef(pharmacieId).doc(key);
}

// ── Pharmacies ───────────────────────────────────────────────────────

async function createPharmacie(data) {
  const code = data.code.toUpperCase().replace(/\s+/g,'');
  await getDB().collection(COLLECTIONS.PHARMACIES).doc(code).set({
    code,
    nom:       data.nom || '',
    adresse:   data.adresse || '',
    telephone: data.telephone || '',
    abonnement: { statut: 'essai', plan: null, dateDebut: null, dateFin: null },
    createdAt: firebase.firestore.FieldValue.serverTimestamp()
  });
  return code;
}

async function getAllPharmacies() {
  const snap = await getDB().collection(COLLECTIONS.PHARMACIES).get();
  const list = snap.docs.map(d => ({ id: d.id, ...d.data() }));
  list.sort((a, b) => {
    const ta = a.createdAt ? a.createdAt.seconds : 0;
    const tb = b.createdAt ? b.createdAt.seconds : 0;
    return tb - ta;
  });
  return list;
}

async function getPharmacie(id) {
  const doc = await getDB().collection(COLLECTIONS.PHARMACIES).doc(id).get();
  return doc.exists ? { id: doc.id, ...doc.data() } : null;
}

async function updatePharmacie(id, data) {
  await getDB().collection(COLLECTIONS.PHARMACIES).doc(id).update(data);
}

async function deletePharmacie(id) {
  await getDB().collection(COLLECTIONS.PHARMACIES).doc(id).delete();
}

// ── Migration : root quinzaines → pharmacies/DAFEANNE/quinzaines ─────

async function migrateRootQuinzaines() {
  const rootSnap = await getDB().collection('quinzaines').get();
  if (rootSnap.empty) return 0;
  const subSnap = await quinzainesRef('DAFEANNE').limit(1).get();
  if (!subSnap.empty) return 0; // déjà migré

  const batchSize = 400;
  const docs = rootSnap.docs;
  for (let i = 0; i < docs.length; i += batchSize) {
    const batch = getDB().batch();
    docs.slice(i, i + batchSize).forEach(doc => {
      batch.set(quinzainesRef('DAFEANNE').doc(doc.id), doc.data(), { merge: true });
    });
    await batch.commit();
  }
  return docs.length;
}

// ── Quinzaines ───────────────────────────────────────────────────────

async function savePeriod(period) {
  period = recalcPeriod(period);
  const key = periodKey(period.year, period.month, period.quinzaine, period.bis);
  period.updatedAt = firebase.firestore.FieldValue.serverTimestamp();
  if (!period.createdAt) period.createdAt = firebase.firestore.FieldValue.serverTimestamp();
  await quinzainesRef().doc(key).set(period, { merge: true });
  return { key, ...period };
}

async function getPeriod(year, month, quinzaine, bis) {
  const doc = await quinzainesRef().doc(periodKey(year, month, quinzaine, bis)).get();
  return doc.exists ? { key: doc.id, ...doc.data() } : null;
}

async function getAllPeriods() {
  const snap = await quinzainesRef().get();
  return snap.docs
    .map(d => ({ key: d.id, ...d.data() }))
    .sort((a, b) => b.year - a.year || b.month - a.month || a.quinzaine.localeCompare(b.quinzaine));
}

async function deletePeriod(key) {
  await quinzainesRef().doc(key).delete();
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
  const snap = await getDB().collection(COLLECTIONS.USERS).get();
  return snap.docs
    .map(d => ({ uid: d.id, ...d.data() }))
    .sort((a, b) => {
      const ta = a.createdAt ? a.createdAt.seconds : 0;
      const tb = b.createdAt ? b.createdAt.seconds : 0;
      return tb - ta;
    });
}

async function getUsersByPharmacie(pharmacieId) {
  const snap = await getDB().collection(COLLECTIONS.USERS)
    .where('pharmacieId', '==', pharmacieId).get();
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
