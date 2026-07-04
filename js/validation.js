// ═══════════════════════════════════════════════════════════════════════════
// VALIDATION — Front-end et helpers
// ═══════════════════════════════════════════════════════════════════════════

class ValidationError extends Error {
  constructor(field, message) {
    super(message);
    this.field = field;
    this.name = 'ValidationError';
  }
}

const Validation = {
  // ── STRING ────────────────────────────────────────────────────────────
  requireString(value, fieldName, minLen = 1, maxLen = 500) {
    if (!value || typeof value !== 'string') {
      throw new ValidationError(fieldName, `${fieldName} doit être une chaîne`);
    }
    const trimmed = value.trim();
    if (trimmed.length < minLen) {
      throw new ValidationError(fieldName, `${fieldName} doit avoir au moins ${minLen} caractère(s)`);
    }
    if (trimmed.length > maxLen) {
      throw new ValidationError(fieldName, `${fieldName} ne doit pas dépasser ${maxLen} caractères`);
    }
    return trimmed;
  },

  // ── NOMBRE ────────────────────────────────────────────────────────────
  requireNumber(value, fieldName, min = 0, max = 999999999) {
    const num = parseFloat(value);
    if (isNaN(num)) {
      throw new ValidationError(fieldName, `${fieldName} doit être un nombre`);
    }
    if (num < min || num > max) {
      throw new ValidationError(fieldName, `${fieldName} doit être entre ${min} et ${max}`);
    }
    return num;
  },

  // ── DATE ──────────────────────────────────────────────────────────────
  requireDate(value, fieldName, minDate = null, maxDate = null) {
    if (!value || typeof value !== 'string') {
      throw new ValidationError(fieldName, `${fieldName} est requis`);
    }
    if (!PATTERNS.DATE_ISO.test(value)) {
      throw new ValidationError(fieldName, `${fieldName} doit être au format YYYY-MM-DD`);
    }
    const date = new Date(value);
    if (isNaN(date.getTime())) {
      throw new ValidationError(fieldName, `${fieldName} n'est pas une date valide`);
    }
    if (minDate && date < minDate) {
      throw new ValidationError(fieldName, `${fieldName} doit être après ${minDate.toLocaleDateString()}`);
    }
    if (maxDate && date > maxDate) {
      throw new ValidationError(fieldName, `${fieldName} doit être avant ${maxDate.toLocaleDateString()}`);
    }
    return value;
  },

  // ── ENUM ──────────────────────────────────────────────────────────────
  requireEnum(value, fieldName, allowedValues) {
    if (!allowedValues.includes(value)) {
      throw new ValidationError(fieldName,
        `${fieldName} doit être parmi: ${allowedValues.join(', ')}`);
    }
    return value;
  },

  // ── EMAIL ────────────────────────────────────────────────────────────
  requireEmail(value, fieldName) {
    const trimmed = this.requireString(value, fieldName, 5, 255);
    if (!PATTERNS.EMAIL.test(trimmed)) {
      throw new ValidationError(fieldName, `${fieldName} n'est pas un email valide`);
    }
    return trimmed;
  },

  // ── PHONE ────────────────────────────────────────────────────────────
  optionalPhone(value, fieldName) {
    if (!value) return '';
    const trimmed = this.requireString(value, fieldName, 7, 20);
    if (!PATTERNS.PHONE.test(trimmed)) {
      throw new ValidationError(fieldName, `${fieldName} n'est pas un téléphone valide`);
    }
    return trimmed;
  },

  // ── MONTANT ──────────────────────────────────────────────────────────
  requireAmount(value, fieldName) {
    return this.requireNumber(value, fieldName, 0, 999999999);
  },
};

// ── VALIDATEURS MÉTIER ────────────────────────────────────────────────────

function validateFacture(data) {
  const errors = [];
  try {
    data.fournisseur = Validation.requireString(data.fournisseur, 'Fournisseur', 2, 100);
  } catch (e) { errors.push(e); }

  try {
    data.montant = Validation.requireAmount(data.montant, 'Montant');
  } catch (e) { errors.push(e); }

  if (data.dateFacture) {
    try {
      data.dateFacture = Validation.requireDate(data.dateFacture, 'Date facture');
    } catch (e) { errors.push(e); }
  }

  if (data.echeance) {
    try {
      data.echeance = Validation.requireDate(data.echeance, 'Échéance');
    } catch (e) { errors.push(e); }
  }

  if (data.statut) {
    try {
      data.statut = Validation.requireEnum(data.statut, 'Statut',
        Object.values(FACTURE_STATUS));
    } catch (e) { errors.push(e); }
  }

  if (errors.length > 0) {
    throw new ValidationError('facture',
      `Validation échouée: ${errors.map(e => e.message).join('; ')}`);
  }

  return data;
}

function validateQuinzaine(data) {
  const errors = [];

  try {
    data.year = Validation.requireNumber(data.year, 'Année', 2000, 2100);
  } catch (e) { errors.push(e); }

  try {
    data.month = Validation.requireNumber(data.month, 'Mois', 1, 12);
  } catch (e) { errors.push(e); }

  try {
    data.quinzaine = Validation.requireEnum(data.quinzaine, 'Quinzaine',
      Object.values(QUINZAINE));
  } catch (e) { errors.push(e); }

  try {
    data.entite = Validation.requireEnum(data.entite, 'Entité',
      Object.values(ENTITY));
  } catch (e) { errors.push(e); }

  if (!Array.isArray(data.lots) || data.lots.length === 0) {
    errors.push(new ValidationError('lots', 'Au moins un lot est requis'));
  }

  if (errors.length > 0) {
    throw new ValidationError('quinzaine',
      `Validation échouée: ${errors.map(e => e.message).join('; ')}`);
  }

  return data;
}
