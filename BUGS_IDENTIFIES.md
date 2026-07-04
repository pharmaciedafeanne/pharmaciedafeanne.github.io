# BUGS IDENTIFIÉS — Formulaires/Modaux

Date: 2026-07-04

---

## BUG #1: Modal Utilisateur Admin — Pas de mode édition 

**Sévérité:** 🔴 CRITIQUE  
**Composant:** `adm-modal-user` (Modal Admin Utilisateur)  
**Fichier:** `js/app.js`, fonction `doSaveAdminUser()` ligne 2326  

### Symptômes:
- Impossible de modifier un utilisateur admin existant
- Les champs ne se pré-remplissent jamais
- Seule la création fonctionne

### Cause:
Absence de fonction `openEditAdminUser(uid)` qui doit:
1. Récupérer les données utilisateur existantes
2. Pré-remplir tous les champs du formulaire
3. Définir le UID dans `#adm-user-uid`

### Champs affectés:
```
- #adm-user-uid (ne sera jamais défini pour une édition)
- #adm-user-name (ne sera jamais pré-rempli)
- #adm-user-email (ne sera jamais pré-rempli)
- #adm-user-password (toujours vide)
- #adm-user-role (toujours par défaut)
- #adm-user-pharmacie (toujours par défaut)
- #adm-perm-* (jamais cochés selon les perms existantes)
```

### Solution:
```javascript
async function openEditAdminUser(uid) {
  const users = await getAllUsers();
  const u = users.find(x => x.uid === uid);
  if (!u) return toast('Utilisateur introuvable', 'error');
  
  document.getElementById('adm-user-uid').value = uid;
  document.getElementById('adm-user-name').value = u.name || '';
  document.getElementById('adm-user-email').value = u.email || '';
  document.getElementById('adm-user-password').value = ''; // Always empty for edits
  document.getElementById('adm-user-role').value = u.role || 'operateur';
  document.getElementById('adm-user-pharmacie').value = u.pharmacieId || '';
  
  const perms = u.permissions || {};
  ['cloturer','rouvrir','inam','caisse','recharge','fournisseurs','import'].forEach(p => {
    const el = document.getElementById(`adm-perm-${p}`);
    if (el) el.checked = !!perms[p];
  });
  
  document.getElementById('adm-user-modal-title').textContent = 'Modifier Utilisateur';
  openAdminModal('adm-modal-user');
}
```

### Tests suggérés:
1. Cliquer sur éditer un utilisateur admin existant
2. Vérifier que tous les champs se pré-remplissent
3. Vérifier que les permissions sont correctement cochées
4. Modifier et sauvegarder

---

## BUG #2: Modal Dépense Caisse — Pas de mode édition

**Sévérité:** 🟠 IMPORTANT  
**Composant:** `modal-depense` (Modal Dépense Caisse)  
**Fichier:** `js/app.js`, fonction `saveDepense()` ligne 2912  

### Symptômes:
- Les dépenses ne peuvent pas être modifiées
- Pas de bouton "éditer" dans le tableau de caisse
- Seul le bouton "supprimer" est disponible

### Cause:
1. `saveDepense()` ignore le champ `#depense-id`
2. La fonction crée TOUJOURS une nouvelle dépense (pas de logique d'UPDATE)
3. Il n'existe pas de fonction `openEditDepense(id)`

### Champs affectés:
```
- #depense-id (lu mais jamais utilisé dans la sauvegarde)
```

### Code problématique:
```javascript
// Ligne 2921 — manque la logique d'UPDATE
await saveCaisseOp({ type: 'depense', date, montant, fournisseur, libelle, note });
// ❌ pas de id, donc toujours création
```

### Solution:
```javascript
async function openEditDepense(id) {
  const ops = await getAllCaisseOps();
  const op = ops.find(x => x.id === id);
  if (!op) return toast('Dépense introuvable', 'error');
  
  document.getElementById('depense-id').value = id;
  document.getElementById('depense-date').value = op.date || '';
  document.getElementById('depense-montant').value = op.montant || '';
  document.getElementById('depense-fournisseur').value = op.fournisseur || '';
  document.getElementById('depense-designation').value = op.libelle || '';
  document.getElementById('depense-obs').value = op.note || '';
  
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
    const data = { type: 'depense', date, montant, fournisseur, libelle, note };
    
    if (id) {
      await saveCaisseOp({ ...data, id }); // UPDATE
    } else {
      await saveCaisseOp(data); // CREATE
    }
    
    closeModal();
    toast(id ? 'Dépense modifiée ✓' : 'Dépense enregistrée ✓', 'success');
    logAction('Dépense caisse', `${libelle} — ${montant} F`, currentUser?.name||'');
    renderCaisse();
  } catch(e) { toast('Erreur: '+e.message,'error'); }
}
```

### HTML à ajouter:
Dans `renderCaisse()` à la ligne 2832-2835, ajouter bouton éditer pour dépenses:
```javascript
// Ligne ~2832 — modifier :
const actions = isRecharge && canEdit
  ? `<button class="btn btn-outline btn-sm" onclick="openEditRecharge('${op.id}')">✏️</button>
     <button class="btn btn-danger btn-sm" onclick="doDeleteCaisseOp('${op.id}')">🗑️</button>`
  : (!isRecharge && canEdit  // ← AJOUTER: permettre édition des dépenses aussi
    ? `<button class="btn btn-outline btn-sm" onclick="openEditDepense('${op.id}')">✏️</button>
       <button class="btn btn-danger btn-sm" onclick="doDeleteCaisseOp('${op.id}')">🗑️</button>`
    : (isRecharge ? '' : `<button class="btn btn-danger btn-sm" onclick="doDeleteCaisseOp('${op.id}')">🗑️</button>`));
```

### Tests suggérés:
1. Enregistrer une dépense
2. Cliquer sur le bouton ✏️ (éditer)
3. Modifier les données
4. Sauvegarder et vérifier la mise à jour

---

## BUG #3: Formulaire Nouvelle Quinzaine — Checkbox BIS non utilisé

**Sévérité:** 🟡 MINEUR (incohérence UX)  
**Composant:** `form-nouvelle` (Formulaire Nouvelle Quinzaine)  
**Fichier:** 
- `index.html` ligne 392-396 (HTML du checkbox)
- `js/app.js` ligne 1716 (saveNouvelle)

### Symptômes:
- Le checkbox `#new-bis` existe en HTML
- Mais n'est jamais lu lors de la sauvegarde
- La logique BIS utilise `AppState.get('bisMode')` à la place

### Cause:
Le formulaire propose un checkbox BIS pour l'UX, mais la logique utilise AppState.
Ceci cause une incohérence et confuse l'utilisateur.

### Code problématique:
```html
<!-- index.html ligne 392 -->
<input type="checkbox" id="new-bis" style="width:16px;height:16px;accent-color:var(--warning)">
Quinzaine BIS
```

```javascript
// app.js ligne 1743
const bisMode = AppState.get('bisMode');
// ❌ ne lit jamais #new-bis
```

### Options de solution:

#### Option A: Supprimer le checkbox du HTML (recommandé)
- La mode BIS est déjà gérée via `openBisSaisie()` depuis la vue detail
- Le checkbox `new-bis` sur la page "Nouvelle saisie" n'est jamais utilisé

#### Option B: Implémenter le checkbox (complexe)
- Lire `#new-bis` dans `saveNouvelle()`
- Décider de la structure BIS basée sur ce checkbox

### Recommandation:
**Supprimer le checkbox** car la logique BIS provient de la vue detail, pas de form-nouvelle.

### HTML à supprimer:
```html
<!-- SUPPRIMER lignes 392-396 -->
<div id="new-bis-row" class="field" style="display:flex;align-items:flex-end;padding-bottom:4px">
  <label style="display:flex;align-items:center;gap:8px;cursor:pointer;font-weight:600;color:var(--warning)">
    <input type="checkbox" id="new-bis" style="width:16px;height:16px;accent-color:var(--warning)">
    Quinzaine BIS
  </label>
</div>
```

### Tests suggérés:
1. Aller à "Nouvelle saisie"
2. Créer une quinzaine BIS depuis la vue detail (via bouton "BIS INAM/AMU")
3. Vérifier que le formulaire se remplit correctement via AppState

---

## RÉSUMÉ DES FIXES

| Bug | Sévérité | Composant | Fichier | Ligne | Fix |
|-----|----------|-----------|---------|------|-----|
| #1 | 🔴 CRITIQUE | adm-modal-user | app.js | 2326 | Créer `openEditAdminUser(uid)` |
| #2 | 🟠 IMPORTANT | modal-depense | app.js | 2912 | Ajouter logique UPDATE + `openEditDepense(id)` |
| #3 | 🟡 MINEUR | form-nouvelle | app.js/html | 1716/392 | Supprimer checkbox BIS ou implémenter |

---

## TESTS DE RÉGRESSION RECOMMANDÉS

Après chaque correction, tester:

### Test 1: Admin User Edit
```
1. Allez à "Super Admin → Utilisateurs"
2. Cliquez sur "Modifier" un utilisateur existant
3. Vérifiez que tous les champs sont pré-remplis
4. Modifiez une permission
5. Sauvegardez
6. Vérifiez que le changement a pris effet
```

### Test 2: Dépense Caisse Edit
```
1. Allez à "Petite Caisse"
2. Enregistrez une nouvelle dépense
3. Cliquez sur "✏️ Éditer" sur la dépense
4. Modifiez la désignation et le montant
5. Sauvegardez
6. Vérifiez que la dépense est mise à jour (solde recalculé)
```

### Test 3: Form Nouvelle Quinzaine
```
1. Allez à "Nouvelle saisie"
2. Vérifiez que le formulaire n'a plus de checkbox BIS bizarre
3. Créez une saisie normale
4. Retournez à "Détail Quinzaine" et cliquez "BIS INAM"
5. Vérifiez que la saisie BIS s'ouvre correctement
```

---

**Fin de l'analyse des bugs — 2026-07-04**
