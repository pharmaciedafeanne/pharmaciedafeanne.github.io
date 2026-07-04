// ═══════════════════════════════════════════════════════════════════════════
// CONSTANTES & ENUMS — Source unique de vérité
// ═══════════════════════════════════════════════════════════════════════════

// ── RÔLES UTILISATEUR ────────────────────────────────────────────────────
const ROLES = {
  SUPERADMIN: 'superadmin',
  TITULAIRE: 'titulaire',
  ASSISTANT: 'assistant',
  OPERATEUR: 'operateur',
};

const ROLE_LABELS = {
  [ROLES.SUPERADMIN]: 'Super Admin',
  [ROLES.TITULAIRE]: 'Pharmacien Titulaire',
  [ROLES.ASSISTANT]: 'Assistant',
  [ROLES.OPERATEUR]: 'Opérateur',
};

// ── STATUTS FACTURES ─────────────────────────────────────────────────────
const FACTURE_STATUS = {
  NON_PAYE: 'non payé',
  EN_COURS: 'en cours',
  PAYE: 'payé',
};

const FACTURE_STATUS_LABELS = {
  [FACTURE_STATUS.NON_PAYE]: 'Non payé',
  [FACTURE_STATUS.EN_COURS]: 'En cours',
  [FACTURE_STATUS.PAYE]: 'Payé',
};

// ── ENTITÉS (INAM/AMU) ───────────────────────────────────────────────────
const ENTITY = {
  INAM: 'INAM',
  AMU: 'AMU',
};

const ENTITY_ICONS = {
  [ENTITY.INAM]: '🏥',
  [ENTITY.AMU]: '💊',
};

const ENTITY_COLOR = {
  [ENTITY.INAM]: 'var(--primary)',
  [ENTITY.AMU]: 'var(--success)',
};

// ── QUINZAINES ───────────────────────────────────────────────────────────
const QUINZAINE = {
  Q1: 'Q1',
  Q2: 'Q2',
};

const QUINZAINE_LABELS = {
  [QUINZAINE.Q1]: '1ère quinzaine',
  [QUINZAINE.Q2]: '2ème quinzaine',
};

// ── PERMISSIONS ──────────────────────────────────────────────────────────
const PERMISSIONS = {
  CLOTURER: 'cloturer',
  ROUVRIR: 'rouvrir',
  GERER_USERS: 'gerer_users',
  VOIR_JOURNAL: 'voir_journal',
  MODIFIER_CATALOGUE: 'modifier_catalogue',
};

// ── TIMINGS ──────────────────────────────────────────────────────────────
const TIMINGS = {
  AUTO_SAVE_LOCAL_DEBOUNCE: 1500,       // ms après dernier keystroke
  AUTO_SAVE_FIRESTORE_INTERVAL: 20000,  // ms entre saves Firestore
  FACTURE_ALERTE_DEFAUT: 72 * 3600 * 1000, // 72h en ms
};

// ── FIREBASE COLLECTIONS ────────────────────────────────────────────────
const FIREBASE_COLLECTIONS = {
  USERS: 'users',
  PHARMACIES: 'pharmacies',
  QUINZAINES: 'quinzaines',
  FACTURES: 'factures',
  CATALOGUE_FRS: 'catalogue_frs',
  JOURNAL: 'journal',
  CAISSE: 'caisse',
  INAM_AMU: 'inam_amu',
};

// ── MOIS (INDEX 1-12) ────────────────────────────────────────────────────
const MOIS_NOMS = [
  '', // placeholder index 0
  'Janvier', 'Février', 'Mars', 'Avril', 'Mai', 'Juin',
  'Juillet', 'Août', 'Septembre', 'Octobre', 'Novembre', 'Décembre'
];

const MOIS_ABREV = [
  '', // placeholder
  'Jan', 'Fév', 'Mar', 'Avr', 'Mai', 'Jun',
  'Jul', 'Aoû', 'Sep', 'Oct', 'Nov', 'Déc'
];

// ── MODES DE PAIEMENT ────────────────────────────────────────────────────
const PAYMENT_MODES = {
  CHEQUE: 'chèque',
  VIREMENT: 'virement',
  ESPECES: 'espèces',
  CARTE: 'carte',
};

// ── VALIDATION PATTERNS ──────────────────────────────────────────────────
const PATTERNS = {
  EMAIL: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
  PHONE: /^[\d\s\-\+\(\)]{7,}$/,
  AMOUNT: /^\d+(\.\d{1,2})?$/,
  DATE_ISO: /^\d{4}-\d{2}-\d{2}$/,
};

// ── LIMITES ──────────────────────────────────────────────────────────────
const LIMITS = {
  MAX_BONS_PAR_LOT: 10,
  MAX_LOTS_PAR_QUINZAINE: 100,
  MAX_FACTURES_EXPORT: 5000,
  PAGINATION_SIZE: 50,
};

// ── ERREURS MESSAGES ─────────────────────────────────────────────────────
const ERROR_MESSAGES = {
  AUTH_REQUIRED: 'Authentification requise',
  PERMISSION_DENIED: 'Vous n\'avez pas les permissions nécessaires',
  DATA_NOT_FOUND: 'Les données n\'ont pas été trouvées',
  VALIDATION_FAILED: 'Les données ne respectent pas le format',
  NETWORK_ERROR: 'Erreur réseau — veuillez vérifier votre connexion',
  FIRESTORE_ERROR: 'Erreur Firestore — veuillez réessayer',
  CONCURRENT_EDIT: 'Cette donnée a été modifiée. Veuillez recharger.',
};
