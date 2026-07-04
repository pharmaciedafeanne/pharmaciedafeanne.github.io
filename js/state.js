// ═══════════════════════════════════════════════════════════════════════════
// STATE MANAGER — Source unique de vérité pour l'état de l'app
// ═══════════════════════════════════════════════════════════════════════════

const AppState = (() => {
  let state = {
    // ── AUTH ──────────────────────────────────────────────────────────
    user: null,
    isAuthenticated: false,

    // ── PHARMACY ──────────────────────────────────────────────────────
    currentPharmacyId: null,

    // ── UI ────────────────────────────────────────────────────────────
    currentView: 'dashboard',
    detailKey: null,

    // ── SAISIE QUINZAINE ──────────────────────────────────────────────
    saisie: {
      entite: null,       // INAM | AMU
      lots: [],           // Array of lots
      isEditing: false,
      editingKey: null,   // Key de la quinzaine en édition (via detail)
    },

    // ── BIS MODE ──────────────────────────────────────────────────────
    bisMode: {
      active: false,
      parentKey: null,
      entite: null,
      year: null,
      month: null,
      quinzaine: null,
    },

    // ── AUTO-SAVE ─────────────────────────────────────────────────────
    autosave: {
      isDirty: false,
      lastLocalSave: null,
      lastFirestoreSave: null,
      isAutoSaving: false,
    },

    // ── CACHE & FILTERS ──────────────────────────────────────────────
    cache: {
      quinzaines: [],
      factures: [],
      users: [],
      lastCacheTime: {},
    },

    filters: {
      frsStatut: 'tous',  // tous | apayer | payees
      frsMois: '',        // YYYY-MM
    },
  };

  const listeners = {};

  return {
    // ── GETTERS ───────────────────────────────────────────────────────
    get(path) {
      const parts = path.split('.');
      let value = state;
      for (const part of parts) {
        value = value[part];
        if (value === undefined) return undefined;
      }
      return structuredClone(value); // Deep clone pour éviter mutations
    },

    // ── SETTERS ───────────────────────────────────────────────────────
    set(path, value) {
      const parts = path.split('.');
      const key = parts.pop();
      let obj = state;
      for (const part of parts) {
        if (!obj[part]) obj[part] = {};
        obj = obj[part];
      }
      const oldValue = obj[key];
      obj[key] = value;

      // Notifier les listeners
      this.emit(path, { oldValue, newValue: value });
    },

    // ── MUTATIONS (actions) ───────────────────────────────────────────
    setUser(user) {
      this.set('user', user);
      this.set('isAuthenticated', !!user);
    },

    setCurrentPharmacy(pharmacyId) {
      this.set('currentPharmacyId', pharmacyId);
    },

    setView(view, params = {}) {
      this.set('currentView', view);
      if (params.key) this.set('detailKey', params.key);
    },

    startSaisie(entite) {
      this.set('saisie.entite', entite);
      this.set('saisie.lots', []);
      this.set('saisie.isEditing', false);
      this.set('saisie.editingKey', null);
    },

    endSaisie() {
      this.set('saisie.entite', null);
      this.set('saisie.lots', []);
      this.set('saisie.isEditing', false);
      this.set('saisie.editingKey', null);
      this.set('autosave.isDirty', false);
    },

    addLot(entite) {
      const lots = this.get('saisie.lots');
      const numero = lots.length + 1;
      lots.push({ numero, entite, bons: [] });
      this.set('saisie.lots', lots);
      this.set('autosave.isDirty', true);
    },

    updateLot(lotNum, updates) {
      const lots = this.get('saisie.lots');
      const lot = lots.find(l => l.numero === lotNum);
      if (lot) Object.assign(lot, updates);
      this.set('saisie.lots', lots);
      this.set('autosave.isDirty', true);
    },

    removeLot(lotNum) {
      let lots = this.get('saisie.lots');
      lots = lots.filter(l => l.numero !== lotNum);
      lots.forEach((l, i) => l.numero = i + 1);
      this.set('saisie.lots', lots);
      this.set('autosave.isDirty', true);
    },

    startBisMode(parentKey, entite, year, month, quinzaine) {
      this.set('bisMode', {
        active: true,
        parentKey,
        entite,
        year,
        month,
        quinzaine,
      });
    },

    endBisMode() {
      this.set('bisMode.active', false);
    },

    setAutosaveDirty(isDirty) {
      this.set('autosave.isDirty', isDirty);
    },

    recordLocalSave() {
      this.set('autosave.lastLocalSave', Date.now());
    },

    recordFirestoreSave() {
      this.set('autosave.lastFirestoreSave', Date.now());
      this.set('autosave.isDirty', false);
    },

    // ── LISTENERS (observers pattern) ─────────────────────────────────
    on(path, callback) {
      if (!listeners[path]) listeners[path] = [];
      listeners[path].push(callback);
      return () => {
        listeners[path] = listeners[path].filter(cb => cb !== callback);
      };
    },

    emit(path, data) {
      if (listeners[path]) {
        listeners[path].forEach(cb => {
          try { cb(data); } catch (e) { console.error('Listener error:', e); }
        });
      }
    },

    // ── DEBUG ─────────────────────────────────────────────────────────
    getFullState() {
      return structuredClone(state);
    },

    reset() {
      state = this.getFullState();
      this.setUser(null);
      this.set('currentView', 'dashboard');
    },
  };
})();
