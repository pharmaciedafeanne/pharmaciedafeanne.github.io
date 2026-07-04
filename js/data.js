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
  try {
    // Initialiser structure totaux
    const totaux = {
      dafeanne: { inam: 0, amu: 0, total: 0 },
      depot:    { inam: 0, amu: 0, total: 0 },
      inam: 0, amu: 0, global: 0
    };

    // Parcourir les lots et calculer les sous-totaux
    (period.lots || []).forEach(lot => {
      const lotTotaux = {
        dafeanne: { inam: 0, amu: 0 },
        depot: { inam: 0, amu: 0 }
      };

      // Parcourir les bons et accumuler les valeurs
      (lot.bons || []).forEach(bon => {
        lotTotaux.dafeanne.inam += (bon.dafeanne?.inam) || 0;
        lotTotaux.dafeanne.amu  += (bon.dafeanne?.amu) || 0;
        lotTotaux.depot.inam    += (bon.depot?.inam) || 0;
        lotTotaux.depot.amu     += (bon.depot?.amu) || 0;
      });

      lot.totaux = lotTotaux;

      // Ajouter aux totaux globaux
      totaux.dafeanne.inam += lotTotaux.dafeanne.inam;
      totaux.dafeanne.amu  += lotTotaux.dafeanne.amu;
      totaux.depot.inam    += lotTotaux.depot.inam;
      totaux.depot.amu     += lotTotaux.depot.amu;
    });

    // Calculer les totaux finaux
    totaux.dafeanne.total = totaux.dafeanne.inam + totaux.dafeanne.amu;
    totaux.depot.total    = totaux.depot.inam + totaux.depot.amu;
    totaux.inam           = totaux.dafeanne.inam + totaux.depot.inam;
    totaux.amu            = totaux.dafeanne.amu + totaux.depot.amu;
    totaux.global         = totaux.inam + totaux.amu;

    period.totaux = totaux;

    Logger.debug('recalcPeriod: calcul complété', {
      nbLots: period.lots?.length || 0,
      global: totaux.global,
      inam: totaux.inam,
      amu: totaux.amu
    });

    return period;

  } catch (e) {
    Logger.error('Erreur recalcPeriod', { error: e.message, period: period?.entite || '?' });
    throw e;
  }
}

function periodKey(year, month, quinzaine, entite) {
  return `${year}-${String(month).padStart(2,'0')}-${quinzaine}-${(entite||'INAM').toUpperCase()}`;
}

function getBisKey(parentKey, entite) {
  return `${parentKey}-${entite}-BIS`;
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
  try {
    // Valider les champs essentiels
    if (!period.year || !period.month || !period.quinzaine || !period.entite) {
      const msg = 'Champs requis manquants: year, month, quinzaine, entite';
      Logger.error('savePeriod validation failed', { period });
      throw new Error(msg);
    }

    // Recalculer les totaux
    period = recalcPeriod(period);

    // Générer la clé du document
    const key = period._key || periodKey(period.year, period.month, period.quinzaine, period.entite);
    delete period._key;

    // Ajouter les timestamps
    period.updatedAt = firebase.firestore.FieldValue.serverTimestamp();
    if (!period.createdAt) {
      period.createdAt = firebase.firestore.FieldValue.serverTimestamp();
    }

    Logger.info('Sauvegarde période', {
      key,
      entite: period.entite,
      quinzaine: period.quinzaine,
      nbLots: period.lots?.length || 0,
      brouillon: period.brouillon
    });

    // Sauvegarder
    if (period.brouillon === false) {
      // Finalisation: set + update pour bien forcer le flag brouillon=false
      await quinzainesRef().doc(key).set(period, { merge: true });
      await quinzainesRef().doc(key).update({ brouillon: false });
    } else {
      await quinzainesRef().doc(key).set(period, { merge: true });
    }

    Logger.info('Période sauvegardée', { key });
    return { key, ...period };

  } catch (e) {
    Logger.error('Erreur savePeriod', { error: e.message, period: period?.entite, stack: e.stack });
    throw e;
  }
}

async function getPeriod(year, month, quinzaine, entite) {
  try {
    Logger.debug('Chargement période', { year, month, quinzaine, entite });

    const key = periodKey(year, month, quinzaine, entite);
    const doc = await quinzainesRef().doc(key).get();

    if (!doc.exists) {
      Logger.debug('Période non trouvée', { key });
      return null;
    }

    const data = doc.data();

    // Ignorer si soft-deleted
    if (data.deleted) {
      Logger.debug('Période supprimée (ignorée)', { key });
      return null;
    }

    Logger.debug('Période trouvée', { key });
    return { key: doc.id, ...data };

  } catch (e) {
    Logger.error('Erreur getPeriod', { year, month, quinzaine, entite, error: e.message });
    throw e;
  }
}

async function getAllPeriods() {
  try {
    Logger.debug('Chargement toutes périodes');

    const snap = await quinzainesRef().get();
    const periods = snap.docs
      .map(d => ({ key: d.id, ...d.data() }))
      .filter(p => !p.brouillon && !p.deleted) // exclure brouillons et soft-deleted
      .sort((a, b) => b.year - a.year || b.month - a.month || b.quinzaine.localeCompare(a.quinzaine));

    Logger.info('Périodes chargées', { count: periods.length });
    return periods;

  } catch (e) {
    Logger.error('Erreur getAllPeriods', { error: e.message });
    throw e;
  }
}

async function deletePeriod(key) {
  try {
    Logger.info('Soft delete période', { key });

    // Soft delete: marquer comme supprimée au lieu de vraiment supprimer
    await quinzainesRef().doc(key).update({
      deleted: true,
      deletedAt: firebase.firestore.FieldValue.serverTimestamp(),
      deletedBy: currentUser?.uid || 'unknown'
    });

    Logger.info('Période supprimée (soft delete)', { key });
    logAction('Suppression quinzaine', key, currentUser?.name || '');

  } catch (e) {
    Logger.error('Erreur deletePeriod', { key, error: e.message });
    throw e;
  }
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

// ── Suivi INAM / AMU ─────────────────────────────────────────────────

function inamRef(pharmacieId) {
  const pid = pharmacieId || _currentPharmacieId;
  return getDB().collection(COLLECTIONS.PHARMACIES).doc(pid).collection('inam_amu');
}

async function saveSuiviInamAmu(data) {
  const ref = data.id ? inamRef().doc(data.id) : inamRef().doc();
  const id = ref.id;
  await ref.set({ ...data, id, updatedAt: firebase.firestore.FieldValue.serverTimestamp() }, { merge: true });
  return id;
}

async function getAllSuiviInamAmu() {
  const snap = await inamRef().get();
  const list = snap.docs.map(d => ({ id: d.id, ...d.data() }));
  list.sort((a, b) => (b.date||'').localeCompare(a.date||''));
  return list;
}

async function updateSuiviInamAmu(id, data) {
  await inamRef().doc(id).update({ ...data, updatedAt: firebase.firestore.FieldValue.serverTimestamp() });
}

async function deleteSuiviInamAmu(id) {
  await inamRef().doc(id).delete();
}

// ── Petite Caisse ────────────────────────────────────────────────────

function caisseRef(pharmacieId) {
  const pid = pharmacieId || _currentPharmacieId;
  return getDB().collection(COLLECTIONS.PHARMACIES).doc(pid).collection('caisse');
}

async function saveCaisseOp(data) {
  const ref = data.id ? caisseRef().doc(data.id) : caisseRef().doc();
  const id = ref.id;
  await ref.set({ ...data, id, createdAt: data.createdAt || firebase.firestore.FieldValue.serverTimestamp() }, { merge: true });
  return id;
}

async function getAllCaisseOps() {
  const snap = await caisseRef().get();
  const list = snap.docs.map(d => ({ id: d.id, ...d.data() }));
  list.sort((a, b) => {
    const da = a.date || '';
    const db = b.date || '';
    return db.localeCompare(da);
  });
  return list;
}

async function deleteCaisseOp(id) {
  await caisseRef().doc(id).delete();
}

// ── Suivi Fournisseurs ───────────────────────────────────────────────

function facturesRef(pharmacieId) {
  const pid = pharmacieId || _currentPharmacieId;
  return getDB().collection(COLLECTIONS.PHARMACIES).doc(pid).collection('factures');
}

async function saveFacture(data) {
  try {
    // Valider champs requis
    if (!data.fournisseur) throw new Error('Fournisseur requis');
    if (data.montant === undefined || data.montant === null) throw new Error('Montant requis');

    const ref = data.id ? facturesRef().doc(data.id) : facturesRef().doc();
    const id = ref.id;

    const factureData = {
      ...data,
      id,
      updatedAt: firebase.firestore.FieldValue.serverTimestamp()
    };

    if (!data.id) {
      factureData.createdAt = firebase.firestore.FieldValue.serverTimestamp();
    }

    Logger.info('Sauvegarde facture', { id, fournisseur: data.fournisseur, montant: data.montant });
    await ref.set(factureData, { merge: true });
    Logger.info('Facture sauvegardée', { id });

    return id;

  } catch (e) {
    Logger.error('Erreur saveFacture', { error: e.message, fournisseur: data?.fournisseur });
    throw e;
  }
}

async function getAllFactures() {
  try {
    Logger.debug('Chargement toutes factures');

    const snap = await facturesRef().get();
    const list = snap.docs
      .map(d => ({ id: d.id, ...d.data() }))
      .filter(f => !f.deleted) // exclure soft-deleted
      .sort((a, b) => {
        const da = a.dateFacture || '';
        const db = b.dateFacture || '';
        return db.localeCompare(da);
      });

    Logger.info('Factures chargées', { count: list.length });
    return list;

  } catch (e) {
    Logger.error('Erreur getAllFactures', { error: e.message });
    throw e;
  }
}

async function updateFacture(id, data) {
  try {
    Logger.info('Modification facture', { id, changes: Object.keys(data) });

    await facturesRef().doc(id).update({
      ...data,
      updatedAt: firebase.firestore.FieldValue.serverTimestamp()
    });

    Logger.info('Facture modifiée', { id });

  } catch (e) {
    Logger.error('Erreur updateFacture', { id, error: e.message });
    throw e;
  }
}

async function deleteFacture(id) {
  try {
    Logger.info('Soft delete facture', { id });

    // Soft delete
    await facturesRef().doc(id).update({
      deleted: true,
      deletedAt: firebase.firestore.FieldValue.serverTimestamp(),
      deletedBy: currentUser?.uid || 'unknown'
    });

    Logger.info('Facture supprimée (soft delete)', { id });
    logAction('Suppression facture', id, currentUser?.name || '');

  } catch (e) {
    Logger.error('Erreur deleteFacture', { id, error: e.message });
    throw e;
  }
}

// Retourne les factures dont l'échéance est dans les prochaines `hours` heures
async function getUpcomingDue(hours) {
  const now = Date.now();
  const limit = now + hours * 3600 * 1000;
  const all = await getAllFactures();
  return all.filter(f => {
    if (f.statut === 'payé') return false;
    if (!f.echeance) return false;
    const ts = new Date(f.echeance).getTime();
    return ts >= now && ts <= limit;
  });
}

// ── Catalogue Fournisseurs ───────────────────────────────────────────

function catalogueFrsRef(pharmacieId) {
  const pid = pharmacieId || _currentPharmacieId;
  return getDB().collection(COLLECTIONS.PHARMACIES).doc(pid).collection('catalogue_frs');
}

async function getAllCatalogueFrs() {
  const snap = await catalogueFrsRef().get();
  const list = snap.docs.map(d => ({ id: d.id, ...d.data() }));
  list.sort((a, b) => (a.nom||'').localeCompare(b.nom||''));
  return list;
}

async function saveCatalogueFrs(data) {
  try {
    if (!data.nom) throw new Error('Nom fournisseur requis');

    const ref = data.id ? catalogueFrsRef().doc(data.id) : catalogueFrsRef().doc();
    const { id, ...rest } = data;

    Logger.info('Sauvegarde fournisseur catalogue', { nom: data.nom });
    await ref.set(rest, { merge: true });
    Logger.info('Fournisseur sauvegardé', { id: ref.id });

    return ref.id;

  } catch (e) {
    Logger.error('Erreur saveCatalogueFrs', { nom: data?.nom, error: e.message });
    throw e;
  }
}

async function deleteCatalogueFrs(id) {
  try {
    Logger.info('Soft delete fournisseur catalogue', { id });

    await catalogueFrsRef().doc(id).update({
      deleted: true,
      deletedAt: firebase.firestore.FieldValue.serverTimestamp(),
      deletedBy: currentUser?.uid || 'unknown'
    });

    Logger.info('Fournisseur supprimé (soft delete)', { id });
    logAction('Suppression fournisseur', id, currentUser?.name || '');

  } catch (e) {
    Logger.error('Erreur deleteCatalogueFrs', { id, error: e.message });
    throw e;
  }
}

// ── Journal de bord ──────────────────────────────────────────────────

function journalRef(pharmacieId) {
  const pid = pharmacieId || _currentPharmacieId;
  return getDB().collection(COLLECTIONS.PHARMACIES).doc(pid).collection('journal');
}

async function logAction(action, details, userName) {
  try {
    if (!_currentPharmacieId) return;
    await journalRef().doc().set({
      action,
      details: details || '',
      userName: userName || '',
      date: new Date().toLocaleDateString('fr-FR'),
      heure: new Date().toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' }),
      timestamp: firebase.firestore.FieldValue.serverTimestamp()
    });
  } catch(e) { /* silencieux */ }
}

async function getJournalEntries(limitN) {
  const snap = await journalRef().orderBy('timestamp', 'desc').limit(limitN || 300).get();
  return snap.docs.map(d => ({ id: d.id, ...d.data() }));
}
