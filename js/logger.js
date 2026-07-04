// ═══════════════════════════════════════════════════════════════════════════
// LOGGER — Logging structuré avec contexte
// ═══════════════════════════════════════════════════════════════════════════

const Logger = (() => {
  const isDev = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';

  const levels = {
    DEBUG: { code: 0, color: '#888', label: '[DEBUG]' },
    INFO: { code: 1, color: '#0066cc', label: '[INFO]' },
    WARN: { code: 2, color: '#ff9900', label: '[WARN]' },
    ERROR: { code: 3, color: '#cc0000', label: '[ERROR]' },
    FATAL: { code: 4, color: '#cc0000', label: '[FATAL]' },
  };

  let logs = [];
  let maxLogs = 500; // Garder les 500 derniers logs

  const formatTime = () => new Date().toLocaleTimeString('fr-FR', {
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  });

  const log = (level, message, context = {}) => {
    const entry = {
      timestamp: Date.now(),
      timeStr: formatTime(),
      level,
      message,
      context,
      url: window.location.href,
      userAgent: navigator.userAgent,
    };

    logs.push(entry);
    if (logs.length > maxLogs) logs.shift();

    // Console
    if (isDev || level.code >= levels.WARN.code) {
      console.log(
        `%c${entry.timeStr} ${level.label} ${message}`,
        `color: ${level.color}; font-weight: bold`,
        context
      );
    }

    // Envoyer les ERRORs et FAT ALS à Firestore (journal)
    if (level.code >= levels.ERROR.code && currentUser && _currentPharmacieId) {
      try {
        logAction(`LOG_${level}`, message, currentUser.name || '', {
          context,
          stack: new Error().stack,
        });
      } catch (e) {
        // Fail silently si on peut pas log l'erreur
      }
    }
  };

  return {
    debug(msg, ctx) { log(levels.DEBUG, msg, ctx); },
    info(msg, ctx) { log(levels.INFO, msg, ctx); },
    warn(msg, ctx) { log(levels.WARN, msg, ctx); },
    error(msg, ctx) { log(levels.ERROR, msg, ctx); },
    fatal(msg, ctx) { log(levels.FATAL, msg, ctx); },

    // Obtenir les logs (pour debug / export)
    getLogs(minLevel = 'DEBUG') {
      const minCode = levels[minLevel].code;
      return logs.filter(l => levels[l.level].code >= minCode);
    },

    // Exporter les logs en JSON
    exportLogs(minLevel = 'DEBUG') {
      const data = JSON.stringify(this.getLogs(minLevel), null, 2);
      const blob = new Blob([data], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `logs_${new Date().toISOString().split('T')[0]}.json`;
      a.click();
      URL.revokeObjectURL(url);
    },

    // Effacer les logs
    clearLogs() {
      logs = [];
    },

    // Statistiques
    getStats() {
      const stats = {};
      for (const [level, meta] of Object.entries(levels)) {
        stats[level] = logs.filter(l => l.level === meta).length;
      }
      return stats;
    },
  };
})();

// Remplacer les console.error par Logger.error
window.addEventListener('error', (event) => {
  Logger.error(`Uncaught error: ${event.message}`, {
    filename: event.filename,
    lineno: event.lineno,
    colno: event.colno,
    stack: event.error?.stack,
  });
});

window.addEventListener('unhandledrejection', (event) => {
  Logger.error(`Unhandled promise rejection: ${event.reason}`, {
    reason: event.reason,
  });
});
