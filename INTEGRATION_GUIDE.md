# 📚 GUIDE D'INTÉGRATION — Comment utiliser les nouveaux systèmes

## 1. Constants & Enums

**Au lieu de chaînes magiques, utilisez les constantes :**

```js
// ❌ AVANT
if (user.role === 'superadmin') { ... }
if (facture.statut === 'payé') { ... }
const entite = 'INAM';

// ✅ APRÈS
if (user.role === ROLES.SUPERADMIN) { ... }
if (facture.statut === FACTURE_STATUS.PAYE) { ... }
const entite = ENTITY.INAM;
```

**Constantes disponibles :**
- `ROLES.*` — Rôles utilisateur
- `ENTITY.*` — INAM / AMU
- `QUINZAINE.*` — Q1 / Q2
- `FACTURE_STATUS.*` — Statuts factures
- `TIMINGS.*` — Délais (auto-save, alerte, etc.)
- `FIREBASE_COLLECTIONS.*` — Noms collections Firestore

---

## 2. Validation

**Valider les données avec le module Validation :**

```js
// ❌ AVANT
const fournisseur = document.getElementById('facture-fournisseur').value;
if (!fournisseur) { toast('Fournisseur requis'); return; }

// ✅ APRÈS
try {
  const fournisseur = Validation.requireString(
    document.getElementById('facture-fournisseur').value,
    'Fournisseur',
    2,    // min length
    100   // max length
  );
  // ... utiliser fournisseur
} catch (e) {
  toast(e.message, 'error');
  return;
}
```

**Méthodes disponibles :**
```js
Validation.requireString(val, fieldName, minLen, maxLen)
Validation.requireNumber(val, fieldName, min, max)
Validation.requireDate(val, fieldName, minDate, maxDate)
Validation.requireEnum(val, fieldName, allowedValues)
Validation.requireEmail(val, fieldName)
Validation.optionalPhone(val, fieldName)
Validation.requireAmount(val, fieldName)
```

**Validateurs métier :**
```js
try {
  const validFacture = validateFacture(factureData);
  const validQuinzaine = validateQuinzaine(quinzaineData);
} catch (e) {
  Logger.error('Validation failed', { error: e.message });
}
```

---

## 3. AppState (State Manager)

**Remplacer les globals par AppState :**

```js
// ❌ AVANT (globals)
let _lots = [];
let _saisieEntite = null;
let _currentPharmacieId = null;

// ✅ APRÈS (AppState)
AppState.get('saisie.lots')
AppState.get('saisie.entite')
AppState.get('currentPharmacyId')
```

**Lire l'état :**
```js
const lots = AppState.get('saisie.lots');                // Array
const entite = AppState.get('saisie.entite');            // INAM | AMU | null
const pharmacy = AppState.get('currentPharmacyId');      // string
const isDirty = AppState.get('autosave.isDirty');        // boolean
```

**Modifier l'état :**
```js
AppState.set('saisie.entite', ENTITY.INAM);
AppState.set('saisie.lots', [...lots, newLot]);
AppState.set('autosave.isDirty', true);
```

**Actions principales :**
```js
AppState.setUser(user);                    // Set auth user
AppState.setCurrentPharmacy(pharmacyId);   // Set pharmacy context
AppState.startSaisie(ENTITY.INAM);         // Démarrer saisie
AppState.endSaisie();                      // Terminer saisie
AppState.addLot(ENTITY.AMU);               // Ajouter un lot
AppState.updateLot(1, { ...updates });     // Modifier lot
AppState.removeLot(1);                     // Supprimer lot
AppState.startBisMode(parentKey, entite, year, month, quinzaine);
AppState.endBisMode();
AppState.setAutosaveDirty(true);
AppState.recordLocalSave();                // Record timestamp
AppState.recordFirestoreSave();            // Record + set isDirty=false
```

**Écouter les changements (observers) :**
```js
// S'abonner à un changement
const unsubscribe = AppState.on('saisie.entite', ({ oldValue, newValue }) => {
  console.log(`Entité changée de ${oldValue} à ${newValue}`);
  renderLotsBuilder(); // Re-render si nécessaire
});

// Se désabonner
unsubscribe();
```

**Debug :**
```js
console.log(AppState.getFullState());     // État complet
console.log(AppState.getFullState().saisie);  // Juste la saisie
```

---

## 4. Logger

**Logging structuré avec contexte :**

```js
// ❌ AVANT
console.log('Facture enregistrée');
console.error('Error:', e.message);

// ✅ APRÈS
Logger.info('Facture enregistrée');
Logger.error('Erreur enregistrement facture', {
  factureId: id,
  error: e.message,
  stack: e.stack
});
```

**Niveaux disponibles :**
```js
Logger.debug(msg, context);   // Dev only
Logger.info(msg, context);    // Info
Logger.warn(msg, context);    // Warning
Logger.error(msg, context);   // Error (envoie aussi à Firestore)
Logger.fatal(msg, context);   // Fatal (envoie aussi à Firestore)
```

**Statistiques :**
```js
console.log(Logger.getStats());  // { DEBUG: 5, INFO: 20, WARN: 2, ERROR: 1, FATAL: 0 }
Logger.exportLogs('WARN');       // Exporte en JSON (minimum WARN)
Logger.clearLogs();              // Efface les logs locaux
```

---

## 5. Migration (Data)

**La migration est automatique lors du login :**

```js
// Dans enterPharmacie() — lancée automatiquement
const migrationResult = await Migration.checkAndMigrate(_currentPharmacieId);
if (migrationResult.success) {
  Logger.info(`Migration complétée : ${migrationResult.updatedQuinzaines} quinzaines, ${migrationResult.updatedFactures} factures`);
}
```

**Champs ajoutés par la migration :**
- `version` : Numéro de version du document (incremental)
- `deleted` : Flag soft-delete (défaut: false)
- `createdAt` : Timestamp de création
- `updatedAt` : Timestamp dernière modif

**Les données existantes :**
- ✅ Ne sont PAS écrasées
- ✅ Les champs manquants sont ajoutés
- ✅ Les documents vides restent inchangés

---

## 6. Exemple d'intégration complète

```js
async function saveNewFacture() {
  try {
    // 1. Récupérer les valeurs du formulaire
    const fournisseur = document.getElementById('facture-fournisseur').value;
    const montant = document.getElementById('facture-montant').value;
    const dateFacture = document.getElementById('facture-date').value;

    // 2. Valider
    try {
      data = validateFacture({
        fournisseur,
        montant,
        dateFacture,
        statut: FACTURE_STATUS.NON_PAYE,
      });
    } catch (e) {
      Logger.warn('Validation failed', { field: e.field, error: e.message });
      toast(e.message, 'error');
      return;
    }

    // 3. Sauvegarder
    Logger.info('Sauvegarde facture', { fournisseur, montant });
    const pharmacyId = AppState.get('currentPharmacyId');
    await saveFacture(data);

    // 4. Update state
    AppState.setAutosaveDirty(false);

    // 5. UI feedback
    toast('Facture enregistrée ✓', 'success');
    Logger.info('Facture enregistrée avec succès', { fournisseur });

  } catch (e) {
    Logger.error('Erreur sauvegarde facture', {
      error: e.message,
      stack: e.stack,
    });
    toast('Erreur: ' + e.message, 'error');
  }
}
```

---

## 7. Checklist pour le refactoring

Quand vous modifiez du code existant :

- [ ] Utilisez `ROLES.*`, `ENTITY.*`, `FACTURE_STATUS.*` au lieu de strings
- [ ] Utilisez `Validation.*` pour la saisie utilisateur
- [ ] Utilisez `AppState` au lieu de `_globals`
- [ ] Utilisez `Logger.*` au lieu de `console.log/error`
- [ ] Ajoutez du contexte aux logs (ids, names, etc.)
- [ ] Wrappez dans try/catch avec Logger.error()
- [ ] Pas de hardcoded delays — utilisez `TIMINGS.*`
- [ ] Testez avec plusieurs tabs ouvertes (AppState isolation)

---

## 8. Points importants

✅ **AUCUNE DONNÉE N'EST PERDUE** — Tous ces systèmes sont additifs
✅ **Backward compatible** — L'ancien code continue de fonctionner
✅ **Rollback facile** — Si quelque chose casse, on peut revenir à l'ancien système
✅ **Graduel** — Refactorisez une fonction à la fois

**Commencez par une fonction simple (ex: `openNewFacture()`) et progressez.**
