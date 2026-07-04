# AUDIT COMPLET — Capture/Chargement Champs Formulaires

**Date:** 2026-07-04  
**Codebase:** Pharmacie Dafeanne v20260713  

---

## 1. MODAL EDIT BON (modal-edit-bon)

### Champs HTML identifiés:
- `eb-label` (affichage uniquement)
- `eb-df-simple` (DAFEANNE montant simple)
- `eb-dp-simple` (DÉPÔT montant simple)
- `eb-df-inam` (DAFEANNE INAM)
- `eb-df-amu` (DAFEANNE AMU)
- `eb-dp-inam` (DÉPÔT INAM)
- `eb-dp-amu` (DÉPÔT AMU)
- `eb-remarque` (textarea observation)

### Fonctions associées:
- **Chargement:** `openEditBon(periodKey, lotNum, bonId)` — ligne 698
- **Sauvegarde:** Inline dans `openEditBon()` — ligne 744

### Analyse:

| Champ HTML | Type | Capture | Chargement | Statut |
|------------|------|---------|-----------|--------|
| eb-label | affichage | N/A | ✓ (lignes 709) | ✓ OK |
| eb-df-simple | input | ✓ (ligne 746) | ✓ (ligne 727) | ✓ OK |
| eb-dp-simple | input | ✓ (ligne 747) | ✓ (ligne 728) | ✓ OK |
| eb-df-inam | input | ✓ (ligne 749) | ✓ (ligne 737) | ✓ OK |
| eb-df-amu | input | ✓ (ligne 749) | ✓ (ligne 738) | ✓ OK |
| eb-dp-inam | input | ✓ (ligne 750) | ✓ (ligne 739) | ✓ OK |
| eb-dp-amu | input | ✓ (ligne 750) | ✓ (ligne 740) | ✓ OK |
| eb-remarque | textarea | ✓ (ligne 752) | ✓ (ligne 742) | ✓ OK |

### Statut global: ✓ **COMPLET**

---

## 2. MODAL UTILISATEUR (modal-user)

### Champs HTML identifiés:
- `user-uid` (hidden)
- `user-name` (input text)
- `user-email` (hidden)
- `user-password` (input password)
- `user-role` (select)
- `perm-cloturer` (checkbox)
- `perm-rouvrir` (checkbox)
- `perm-inam` (checkbox)
- `perm-caisse` (checkbox)
- `perm-recharge` (checkbox)
- `perm-fournisseurs` (checkbox)
- `perm-import` (checkbox)

### Fonctions associées:
- **Édition:** `openEditUser(uid)` — ligne 1942
- **Ajout:** `openAddUser()` (implicit)
- **Sauvegarde:** `doSaveUser()` — ligne 1967

### Analyse:

| Champ HTML | Type | Capture | Chargement | Statut |
|------------|------|---------|-----------|--------|
| user-uid | hidden | ✓ (ligne 1968) | ✓ (ligne 1949) | ✓ OK |
| user-name | input | ✓ (ligne 1969) | ✓ (ligne 1950) | ✓ OK |
| user-email | hidden | N/A (lecture) | ✓ (ligne 1951) | ✓ OK |
| user-password | input | ✓ (ligne 1972) | ✓ (ligne 1955) | ✓ OK |
| user-role | select | ✓ (ligne 1971) | ✓ (ligne 1952-1954) | ✓ OK |
| perm-cloturer | checkbox | ✓ (ligne 1980) | ✓ (ligne 1960-1961) | ✓ OK |
| perm-rouvrir | checkbox | ✓ (ligne 1980) | ✓ (ligne 1960-1961) | ✓ OK |
| perm-inam | checkbox | ✓ (ligne 1980) | ✓ (ligne 1960-1961) | ✓ OK |
| perm-caisse | checkbox | ✓ (ligne 1980) | ✓ (ligne 1960-1961) | ✓ OK |
| perm-recharge | checkbox | ✓ (ligne 1980) | ✓ (ligne 1960-1961) | ✓ OK |
| perm-fournisseurs | checkbox | ✓ (ligne 1980) | ✓ (ligne 1960-1961) | ✓ OK |
| perm-import | checkbox | ✓ (ligne 1980) | ✓ (ligne 1960-1961) | ✓ OK |

### Statut global: ✓ **COMPLET**

---

## 3. MODAL ENTRÉE INAM/AMU (modal-inam-entry)

### Champs HTML identifiés:
- `inam-entry-id` (hidden)
- `inam-entry-date` (input date)
- `inam-entry-entite` (select INAM/AMU)
- `inam-entry-qnum` (select Q1/Q2)
- `inam-entry-mois` (select mois)
- `inam-entry-annee` (select année)
- `inam-entry-bis` (checkbox BIS)
- `inam-entry-facture` (input number)
- `inam-entry-paye` (input number)
- `inam-entry-statut` (select)
- `inam-entry-virement` (input date)

### Fonctions associées:
- **Édition:** `openEditInamEntry(id)` — ligne 2742
- **Sauvegarde:** `saveInamEntry()` — ligne 2760

### Analyse:

| Champ HTML | Type | Capture | Chargement | Statut |
|------------|------|---------|-----------|--------|
| inam-entry-id | hidden | ✓ (ligne 2761) | ✓ (ligne 2747) | ✓ OK |
| inam-entry-date | input date | ✓ (ligne 2762) | ✓ (ligne 2748) | ✓ OK |
| inam-entry-entite | select | ✓ (ligne 2763) | ✓ (ligne 2749) | ✓ OK |
| inam-entry-qnum | select | ✓ (indirect 2764) | ✓ (indirect 2755) | ✓ OK |
| inam-entry-mois | select | ✓ (indirect 2764) | ✓ (indirect 2755) | ✓ OK |
| inam-entry-annee | select | ✓ (indirect 2764) | ✓ (indirect 2755) | ✓ OK |
| inam-entry-bis | checkbox | ✓ (indirect 2764) | ✓ (indirect 2755) | ✓ OK |
| inam-entry-facture | input | ✓ (ligne 2765) | ✓ (ligne 2750) | ✓ OK |
| inam-entry-paye | input | ✓ (ligne 2766) | ✓ (ligne 2751) | ✓ OK |
| inam-entry-statut | select | ✓ (ligne 2767) | ✓ (ligne 2752) | ✓ OK |
| inam-entry-virement | input date | ✓ (ligne 2768) | ✓ (ligne 2753) | ✓ OK |

### Statut global: ✓ **COMPLET**

---

## 4. MODAL RECHARGE CAISSE (modal-recharge)

### Champs HTML identifiés:
- `recharge-id` (hidden)
- `recharge-date` (input date)
- `recharge-montant` (input number)
- `recharge-type` (select: espece/mobilemoney)
- `recharge-ref` (input text, visible si MM)
- `recharge-obs` (textarea)

### Fonctions associées:
- **Nouveau:** `openRecharge()` — ligne 2856
- **Édition:** `openEditRecharge(id)` — ligne 2867
- **Sauvegarde:** `saveRecharge()` — ligne 2881

### Analyse:

| Champ HTML | Type | Capture | Chargement | Statut |
|------------|------|---------|-----------|--------|
| recharge-id | hidden | ✓ (ligne 2882) | ✓ (ligne 2857) | ✓ OK |
| recharge-date | input date | ✓ (ligne 2883) | ✓ (ligne 2858, 2872) | ✓ OK |
| recharge-montant | input number | ✓ (ligne 2884) | ✓ (ligne 2859, 2873) | ✓ OK |
| recharge-type | select | ✓ (ligne 2885) | ✓ (ligne 2860, 2874) | ✓ OK |
| recharge-ref | input text | ✓ (ligne 2886) | ✓ (ligne 2861, 2875) | ✓ OK |
| recharge-obs | textarea | ✓ (ligne 2887) | ✓ (ligne 2862, 2876) | ✓ OK |

### Statut global: ✓ **COMPLET**

---

## 5. MODAL DÉPENSE CAISSE (modal-depense)

### Champs HTML identifiés:
- `depense-id` (hidden)
- `depense-date` (input date)
- `depense-montant` (input number)
- `depense-fournisseur` (input text)
- `depense-designation` (input text)
- `depense-obs` (textarea)

### Fonctions associées:
- **Nouveau:** `openDepense()` — ligne 2902
- **Sauvegarde:** `saveDepense()` — ligne 2912

### Analyse:

| Champ HTML | Type | Capture | Chargement | Statut |
|------------|------|---------|-----------|--------|
| depense-id | hidden | ✓ (ligne 2913) | ✓ (ligne 2903) | ✓ OK |
| depense-date | input date | ✓ (ligne 2914) | ✓ (ligne 2904) | ✓ OK |
| depense-montant | input number | ✓ (ligne 2915) | ✓ (ligne 2905) | ✓ OK |
| depense-fournisseur | input text | ✓ (ligne 2916) | ✓ (ligne 2906) | ✓ OK |
| depense-designation | input text | ✓ (ligne 2917) | ✓ (ligne 2907) | ✓ OK |
| depense-obs | textarea | ✓ (ligne 2918) | ✓ (ligne 2908) | ✓ OK |

### ⚠️ PROBLÈME DÉTECTÉ:
**BUG:** saveDepense() ne récupère pas `depense-id` — la fonction ne permet PAS la modification d'une dépense existante !
- Ligne 2921: `await saveCaisseOp({ type: 'depense', date, montant, fournisseur, libelle, note })` — pas de `id`
- Les dépenses CRÉÉES ne peuvent pas être modifiées (pas de openEditDepense)

### Statut global: ⚠️ **INCOMPLET — BUG: pas de mode édition**

---

## 6. MODAL CATALOGUE FOURNISSEUR (modal-cat-frs)

### Champs HTML identifiés:
- `cat-frs-id` (hidden)
- `cat-frs-nom` (input text)
- `cat-frs-tel` (input text)
- `cat-frs-adresse` (input text)

### Fonctions associées:
- **Nouveau:** `openAddCatFrs()` — ligne 2039
- **Édition:** `openEditCatFrs(id, nom, tel, adresse)` — ligne 2048
- **Sauvegarde:** `saveCatFrs()` — ligne 2057

### Analyse:

| Champ HTML | Type | Capture | Chargement | Statut |
|------------|------|---------|-----------|--------|
| cat-frs-id | hidden | ✓ (ligne 2058) | ✓ (ligne 2040, 2049) | ✓ OK |
| cat-frs-nom | input text | ✓ (ligne 2059) | ✓ (ligne 2041, 2050) | ✓ OK |
| cat-frs-tel | input text | ✓ (ligne 2060) | ✓ (ligne 2042, 2051) | ✓ OK |
| cat-frs-adresse | input text | ✓ (ligne 2061) | ✓ (ligne 2043, 2052) | ✓ OK |

### Statut global: ✓ **COMPLET**

---

## 7. FORMULAIRE NOUVELLE QUINZAINE (form-nouvelle)

### Champs HTML identifiés:
- `new-year` (select année)
- `new-month` (select mois)
- `new-quinzaine` (select Q1/Q2)
- `new-bis` (checkbox BIS)
- `lots-builder` (dynamique — gestion dans AppState)

### Fonctions associées:
- **Rendu:** `renderNouvelle()` — ligne 794
- **Sauvegarde:** `saveNouvelle()` — ligne 1716

### Analyse:

| Champ HTML | Type | Capture | Chargement | Statut |
|------------|------|---------|-----------|--------|
| new-year | select | ✓ (ligne 1719) | ✓ (via form.reset()) | ✓ OK |
| new-month | select | ✓ (ligne 1720) | ✓ (via form.reset()) | ✓ OK |
| new-quinzaine | select | ✓ (ligne 1721) | ✓ (via form.reset()) | ✓ OK |
| new-bis | checkbox | ✗ **MANQUANT** | N/A | ❌ **BUG** |
| lots-builder | dynamic | ✓ (AppState) | ✓ (AppState) | ✓ OK |

### ⚠️ PROBLÈME DÉTECTÉ:
**BUG:** Checkbox `new-bis` n'est jamais lue dans `saveNouvelle()`
- Le checkbox BIS existe en HTML (ligne 394) 
- Mais saveNouvelle() ne l'utilise pas — la logique BIS dépend entièrement d'AppState
- **CORRECTION NÉCESSAIRE:** Lire `#new-bis` dans saveNouvelle() ou la supprimer du HTML

### Statut global: ⚠️ **INCOMPLET — BUG: checkbox BIS non traité**

---

## 8. MODAL FACTURE FOURNISSEUR (modal-facture)

### Champs HTML identifiés:
- `facture-id` (hidden)
- `facture-date` (input date)
- `facture-echeance` (input date)
- `facture-fournisseur` (input text)
- `facture-montant` (input number)
- `facture-designation` (input text)
- `facture-mode` (select)
- `facture-ref` (input text)
- `facture-statut` (select)
- `facture-date-paye` (input date)
- `facture-obs` (textarea)
- `facture-prospective` (checkbox)
- `facture-alerte-jours` (input number, conditionnel)

### Fonctions associées:
- **Nouveau:** `openNewFacture()` — ligne 3168
- **Édition:** `openEditFacture(id)` — ligne 3197
- **Sauvegarde:** `saveFactureForm()` — ligne 3223

### Analyse:

| Champ HTML | Type | Capture | Chargement | Statut |
|------------|------|---------|-----------|--------|
| facture-id | hidden | ✓ (ligne 3226) | ✓ (ligne 3201) | ✓ OK |
| facture-date | input date | ✓ (ligne 3228) | ✓ (ligne 3203) | ✓ OK |
| facture-echeance | input date | ✓ (ligne 3229) | ✓ (ligne 3204) | ✓ OK |
| facture-fournisseur | input text | ✓ (ligne 3227) | ✓ (ligne 3202) | ✓ OK |
| facture-montant | input number | ✓ (ligne 3230) | ✓ (ligne 3205) | ✓ OK |
| facture-designation | input text | ✓ (ligne 3231) | ✓ (ligne 3206) | ✓ OK |
| facture-mode | select | ✓ (ligne 3235) | ✓ (ligne 3210) | ✓ OK |
| facture-ref | input text | ✓ (ligne 3236) | ✓ (ligne 3211) | ✓ OK |
| facture-statut | select | ✓ (ligne 3232) | ✓ (ligne 3207) | ✓ OK |
| facture-date-paye | input date | ✓ (ligne 3233) | ✓ (ligne 3208) | ✓ OK |
| facture-obs | textarea | ✓ (ligne 3234) | ✓ (ligne 3209) | ✓ OK |
| facture-prospective | checkbox | ✓ (ligne 3237) | ✓ (ligne 3212-3213) | ✓ OK |
| facture-alerte-jours | input number | ✓ (ligne 3238) | ✓ (ligne 3216-3217) | ✓ OK |

### Statut global: ✓ **COMPLET**

---

## 9. MODAL PHARMACIE ADMIN (adm-modal-pharma)

### Champs HTML identifiés:
- `pharma-form-id` (hidden)
- `pharma-code` (input text)
- `pharma-nom` (input text)
- `pharma-telephone` (input text)

### Fonctions associées:
- **Nouveau:** `openNewPharmacie()` — ligne 2481
- **Édition:** `openEditPharmacie(id)` — ligne 2488
- **Sauvegarde:** `submit` event listener sur `#pharma-form` — ligne 2501

### Analyse:

| Champ HTML | Type | Capture | Chargement | Statut |
|------------|------|---------|-----------|--------|
| pharma-form-id | hidden | ✓ (ligne 2503) | ✓ (ligne 2483, 2492) | ✓ OK |
| pharma-code | input text | ✓ (ligne 2504) | ✓ (ligne 2493) | ✓ OK |
| pharma-nom | input text | ✓ (ligne 2505) | ✓ (ligne 2494) | ✓ OK |
| pharma-telephone | input text | ✓ (ligne 2506) | ✓ (ligne 2495) | ✓ OK |

### Statut global: ✓ **COMPLET**

---

## 10. MODAL UTILISATEUR ADMIN (adm-modal-user)

### Champs HTML identifiés:
- `adm-user-uid` (hidden)
- `adm-user-name` (input text)
- `adm-user-email` (input email)
- `adm-user-password` (input password)
- `adm-user-role` (select: titulaire/operateur)
- `adm-user-pharmacie` (select)
- `adm-perm-cloturer` (checkbox)
- `adm-perm-rouvrir` (checkbox)
- `adm-perm-inam` (checkbox)
- `adm-perm-caisse` (checkbox)
- `adm-perm-recharge` (checkbox)
- `adm-perm-fournisseurs` (checkbox)
- `adm-perm-import` (checkbox)

### Fonctions associées:
- **Sauvegarde:** `doSaveAdminUser()` — ligne 2326

### Analyse:

| Champ HTML | Type | Capture | Chargement | Statut |
|------------|------|---------|-----------|--------|
| adm-user-uid | hidden | ✓ (ligne 2327) | ⚠️ **NON CHARGÉ** | ⚠️ **MANQUANT** |
| adm-user-name | input text | ✓ (ligne 2328) | ⚠️ **NON CHARGÉ** | ⚠️ **MANQUANT** |
| adm-user-email | input email | ✓ (ligne 2329) | ⚠️ **NON CHARGÉ** | ⚠️ **MANQUANT** |
| adm-user-password | input password | ✓ (ligne 2330) | ⚠️ **NON CHARGÉ** | ⚠️ **MANQUANT** |
| adm-user-role | select | ✓ (ligne 2331) | ⚠️ **NON CHARGÉ** | ⚠️ **MANQUANT** |
| adm-user-pharmacie | select | ✓ (ligne 2332) | ⚠️ **NON CHARGÉ** | ⚠️ **MANQUANT** |
| adm-perm-cloturer | checkbox | ✓ (ligne 2340) | ⚠️ **NON CHARGÉ** | ⚠️ **MANQUANT** |
| adm-perm-rouvrir | checkbox | ✓ (ligne 2340) | ⚠️ **NON CHARGÉ** | ⚠️ **MANQUANT** |
| adm-perm-inam | checkbox | ✓ (ligne 2340) | ⚠️ **NON CHARGÉ** | ⚠️ **MANQUANT** |
| adm-perm-caisse | checkbox | ✓ (ligne 2340) | ⚠️ **NON CHARGÉ** | ⚠️ **MANQUANT** |
| adm-perm-recharge | checkbox | ✓ (ligne 2340) | ⚠️ **NON CHARGÉ** | ⚠️ **MANQUANT** |
| adm-perm-fournisseurs | checkbox | ✓ (ligne 2340) | ⚠️ **NON CHARGÉ** | ⚠️ **MANQUANT** |
| adm-perm-import | checkbox | ✓ (ligne 2340) | ⚠️ **NON CHARGÉ** | ⚠️ **MANQUANT** |

### ⚠️ PROBLÈME MAJEUR DÉTECTÉ:
**BUG CRITIQUE:** Pas de fonction `openEditAdminUser()` !
- `doSaveAdminUser()` capture tous les champs (CREATE + UPDATE)
- Mais il n'existe PAS de fonction pour CHARGER les données existantes lors d'une édition
- Les champs ne sont jamais pré-remplis en édition
- **CORRECTION NÉCESSAIRE:** Créer une fonction `openEditAdminUser(uid)` qui charge les données

### Statut global: ❌ **CRITIQUE — Pas de fonction d'édition (chargement)**

---

## RÉSUMÉ DES BUGS IDENTIFIÉS

### 1. ❌ CRITIQUE: Modal Utilisateur Admin (adm-modal-user)
**Problème:** Pas de fonction `openEditAdminUser(uid)` pour charger les données en édition
- **Impact:** Les utilisateurs admin ne peuvent pas être modifiés correctement (formulaire vide)
- **Fichier:** js/app.js, lignes 2326-2363
- **Correction:** Créer `openEditAdminUser(uid)` qui peuple les champs

### 2. ⚠️ BUG: Formulaire Nouvelle Quinzaine (form-nouvelle)
**Problème:** Checkbox `new-bis` en HTML mais non traité dans `saveNouvelle()`
- **Impact:** Incohérence HTML/JS, risque de confusion UX
- **Fichier:** index.html ligne 394, js/app.js ligne 1716
- **Correction:** Supprimer le checkbox du HTML OU l'utiliser dans la logique

### 3. ⚠️ BUG: Modal Dépense Caisse (modal-depense)
**Problème:** Pas de mode édition — `saveDepense()` ne gère que la création
- **Impact:** Les dépenses ne peuvent pas être modifiées
- **Fichier:** js/app.js ligne 2912
- **Correction:** Ajouter param `id` et logique d'UPDATE dans `saveDepense()`

---

## RÉSUMÉ PAR FORMULAIRE

| Formulaire | Champs Total | Statut | Détail |
|-----------|--------------|--------|--------|
| 1. Edit Bon | 8 | ✓ OK | Tous les champs capturés et chargés |
| 2. Utilisateur | 13 | ✓ OK | Tous les champs capturés et chargés |
| 3. Entrée INAM/AMU | 11 | ✓ OK | Tous les champs capturés et chargés |
| 4. Recharge Caisse | 6 | ✓ OK | Tous les champs capturés et chargés |
| 5. Dépense Caisse | 6 | ❌ BUG | Pas de mode édition (id ignoré) |
| 6. Catalogue Fournisseur | 4 | ✓ OK | Tous les champs capturés et chargés |
| 7. Nouvelle Quinzaine | 5 | ⚠️ BUG | Checkbox BIS en HTML mais non utilisé |
| 8. Facture Fournisseur | 13 | ✓ OK | Tous les champs capturés et chargés |
| 9. Pharmacie Admin | 4 | ✓ OK | Tous les champs capturés et chargés |
| 10. Utilisateur Admin | 13 | ❌ CRITIQUE | Pas de fonction openEditAdminUser() |

---

## RECOMMANDATIONS

### Priorité P0 (URGENT):
1. **Créer `openEditAdminUser(uid)`** pour charger les données existantes en édition admin
2. **Fixer `saveDepense()`** pour permettre la modification des dépenses existantes

### Priorité P1 (Important):
3. Résoudre l'incohérence du checkbox `new-bis` (supprimer ou implémenter)

### Priorité P2 (Nettoyage):
4. Ajouter du logging pour les champs optionnels vs obligatoires
5. Ajouter des validations de type côté client

---

**Fin de l'audit — 2026-07-04**
