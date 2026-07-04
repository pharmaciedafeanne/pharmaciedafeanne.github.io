# 🔧 PLAN DE REFACTORING COMPLET

## ✅ COMPLÉTÉ (Phase 1 - Infrastructure)

### Fichiers créés :
- ✅ `js/constants.js` — Constantes, enums, patterns de validation
- ✅ `js/validation.js` — Système de validation front-end
- ✅ `js/state.js` — State manager centralisé (remplace les globals)
- ✅ `js/logger.js` — Logging structuré avec contexte
- ✅ `js/migration.js` — Migration de données v1
- ✅ `firestore.rules` — Firestore Security Rules (à appliquer manuellement)
- ✅ Updated `index.html` — Ajout des nouveaux scripts

### Données : 
- ✅ **AUCUNE DONNÉE PERDUE** — Les migrations sont non-destructives
- Les champs `version`, `deleted`, `createdAt`, `updatedAt` seront ajoutés sans écraser les existants

---

## 🔴 À FAIRE (Phase 2 - Refactoring progressif)

### Priorité 1 : CRITIQUE (Sécurité)

#### 1.1 Appliquer les Firestore Rules
**Fichier** : `firestore.rules`
**Action** : Copier le contenu dans Firebase Console → Firestore → Rules
**Impact** : Sécurité immédiate, zéro données perdues
**Durée** : 5 min

#### 1.2 Remplacer les validations ad-hoc par `Validation` module
**Fichiers** : `js/app.js`, `js/data.js`
**Changements** :
```js
// AVANT
if (!fournisseur) { toast('Fournisseur requis','error'); return; }

// APRÈS
try {
  const fournisseur = Validation.requireString(fournisseur, 'Fournisseur');
  const montant = Validation.requireAmount(montant, 'Montant');
} catch (e) {
  toast(e.message, 'error');
  return;
}
```
**Fichiers à modifier** :
- `js/app.js` : ~5 fonctions (saveFactureForm, saveNouvelle, etc.)
- Impact : Zéro données perdues

#### 1.3 Ajouter versioning/etag pour détecter conflits
**Fichier** : `js/data.js` → `savePeriod()`
**Changement** :
```js
// Ajouter un champ version pour optimistic locking
if (!period.version) period.version = 1;
else period.version = (period.version || 0) + 1;
```
**Impact** : Détection de conflits concurrents
**Durée** : 30 min

---

### Priorité 2 : HAUTE (Architecture)

#### 2.1 Remplacer les globals `_lots`, `_saisieEntite`, etc. par `AppState`
**Fichiers** : `js/app.js` (partout)
**Changements** :
```js
// AVANT
_lots = [];
_saisieEntite = null;

// APRÈS
AppState.set('saisie.lots', []);
AppState.set('saisie.entite', null);
```
**À faire** :
- Remplacer ~50 références à `_lots` par `AppState.get('saisie.lots')`
- Remplacer `_saisieEntite` par `AppState.get('saisie.entite')`
- Remplacer `_bisMode` par `AppState.get('bisMode')`
- Remplacer `_detailEditingKey` par `AppState.get('saisie.editingKey')`
- Remplacer `_currentPharmacieId` par `AppState.get('currentPharmacyId')`
- Remplacer `appState.view` par `AppState.get('currentView')`

**Impact** :
- ✅ Pas de mutations accidentelles en multi-tab
- ✅ Debugging facile (AppState.getFullState())
- ✅ Observateurs possibles (AppState.on())
- Durée** : 2-3 heures

#### 2.2 Remplacer les constantes en dur par le module `constants.js`
**Fichiers** : `js/app.js`, `js/data.js`, `js/export.js`
**Changements** :
```js
// AVANT
const canClose = currentUser.role !== 'operateur' || ...

// APRÈS
const canClose = [ROLES.TITULAIRE, ROLES.SUPERADMIN, ROLES.ASSISTANT].includes(currentUser.role) || ...
```
**À faire** :
- Remplacer `'INAM'` et `'AMU'` par `ENTITY.INAM`, `ENTITY.AMU`
- Remplacer `'payé'`, `'en cours'`, `'non payé'` par `FACTURE_STATUS.*`
- Remplacer `'Q1'`, `'Q2'` par `QUINZAINE.*`
- Remplacer `'superadmin'`, `'titulaire'`, etc. par `ROLES.*`
- Remplacer les magic strings (e.g. `72 * 3600 * 1000`) par `TIMINGS.*`

**Impact** :
- ✅ Pas de typos
- ✅ Single source of truth
- **Durée** : 1 heure

#### 2.3 Remplacer les console.log par `Logger`
**Fichiers** : Partout
**Changements** :
```js
// AVANT
console.log('Données chargées');
console.error('Erreur:', e.message);

// APRÈS
Logger.info('Données chargées');
Logger.error('Erreur', { originalError: e });
```
**Impact** :
- ✅ Logging structuré avec contexte
- ✅ Stack traces en Firestore
- **Durée** : 30 min

---

### Priorité 3 : MOYENNE (Performance & Maintenance)

#### 3.1 Éliminer la duplication dans les renders
**Fichiers** : `js/app.js`
**Duplication** :
- `renderLotsBuilder()` + `renderDetailEditLotsBuilder()` — 90% similaire
- `bonRow()` + inline HTML dans renders
- Excel/PDF exports — logique filtrée dupliquée

**À faire** :
- Créer une fonction `renderLotsHTML(lots, config)` réutilisable
- Créer une fonction `getFilteredFactures(filter)` pour les exports
- Supprimer les dupes

**Impact** :
- ✅ -200 lignes de code
- ✅ Bugs fixés une seule fois
- **Durée** : 1 heure

#### 3.2 Implémenter la pagination Firestore
**Fichiers** : `js/data.js`
**Changements** :
```js
// AVANT
async function getAllPeriods() {
  const snap = await quinzainesRef().get(); // Tout charge
}

// APRÈS
async function getAllPeriods(pageSize = 50, lastKey = null) {
  let q = quinzainesRef().limit(pageSize + 1);
  if (lastKey) q = q.startAfter(lastKey);
  const snap = await q.get();
  return {
    items: snap.docs.slice(0, pageSize).map(...),
    hasMore: snap.docs.length > pageSize,
    lastKey: snap.docs[pageSize - 1].id,
  };
}
```
**À faire** :
- Ajouter pagination à `getAllPeriods()`, `getAllFactures()`
- Implémenter infinite scroll ou pagination UI
- Ajouter index Firestore

**Impact** :
- ✅ Charge mieux avec 10k+ documents
- ✅ UX plus rapide
- **Durée** : 2 heures

#### 3.3 Implémenter le "soft delete"
**Fichiers** : `js/app.js`, `js/data.js`
**Changements** :
```js
// AVANT
await deletePeriod(key);

// APRÈS
await updatePeriod(key, { deleted: true, deletedAt: serverTimestamp(), deletedBy: user.uid });
```
**À faire** :
- Remplacer `doDeletePeriod()` par un soft delete
- Filtrer `deleted: true` dans les reads
- Ajouter UI pour restaurer/purger des soft-deletes
- Ajouter audit trail

**Impact** :
- ✅ Récupération possible
- ✅ Audit trail
- **Durée** : 1 heure

#### 3.4 Memoization des calculs coûteux
**Fichiers** : `js/app.js`, `js/export.js`
**À faire** :
- Cache `recalcPeriod()` results (appelé 3x par render)
- Cache `fmtA()` si possible
- Ajouter `useMemo` equivalent pour React-like caching

**Impact** :
- ✅ Moins d'appels inutiles
- **Durée** : 30 min

---

### Priorité 4 : BASSE (QA & Polish)

#### 4.1 Ajouter des tests unitaires
**Fichiers** : `tests/` (nouveau dossier)
**À tester** :
- `Validation.*` — 10 tests
- `recalcPeriod()` — 5 tests
- `fmtA()` — 5 tests
- State mutations — 5 tests

**Outil** : Jest ou Mocha
**Impact** :
- ✅ Régression prevention
- **Durée** : 2 heures

#### 4.2 Gestion d'erreurs robuste avec retry logic
**Fichiers** : `js/data.js`
**À faire** :
- Ajouter retry logic pour les appels Firestore
- Implémenter exponential backoff
- Better error messages

**Durée** : 1 heure

#### 4.3 Unsaved changes warning
**Fichiers** : `js/app.js`
**À faire** :
```js
window.addEventListener('beforeunload', (e) => {
  if (AppState.get('autosave.isDirty')) {
    e.preventDefault();
    e.returnValue = 'Vous avez des changements non enregistrés.';
  }
});
```
**Durée** : 15 min

#### 4.4 Normaliser les noms de fonctions
**À faire** :
- `renderFournisseurs()` → `renderFactures()` (cohérent avec la vue)
- `setFrsFilter()` → `setFacturesFilter()`
- `openEditFacture()` → `editFacture()`
- Ajouter préfixes : `handle*`, `load*`, `save*`, `delete*`

**Impact** :
- ✅ Code plus lisible
- **Durée** : 30 min

---

## 📊 RÉSUMÉ

| Phase | Priorité | Tâches | Durée estimée | Données perdues ? |
|-------|----------|--------|-------------------|------------------|
| 1 | 🔴 CRITIQUE | Infrastructure | 1 jour | ✅ NON |
| 2 | 🔴 HAUTE | Refactoring | 3-4 jours | ✅ NON |
| 3 | 🟡 MOYENNE | Performance | 2-3 jours | ✅ NON |
| 4 | 🟢 BASSE | QA & Polish | 1-2 jours | ✅ NON |
| **TOTAL** | — | — | **7-10 jours** | **✅ NON** |

---

## 🚀 PROCHAINES ÉTAPES IMMÉDIATES

1. **Appliquer les Firestore Rules** (5 min)
2. **Tester la migration** sur une copie de données
3. **Commencer Phase 2.1** — Remplacer les globals par AppState
4. **Committer chaque sous-tâche** pour faciliter les rollbacks

## ⚠️ POINTS DE SÉCURITÉ

- ✅ Les données existantes ne seront PAS perdues
- ✅ Les migrations sont non-destructives
- ✅ Les champs ajoutés ne touchent pas aux champs existants
- ✅ Les Firestore Rules vont empêcher l'accès non-autorisé
- ✅ Soft delete garde l'historique complet

**COMMENCER PAR PHASE 1 (infrastructure) — c'est le fondement pour tout le reste.**
