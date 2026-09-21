// Journalisation minimale, sans secret ni donnée personnelle (cf. docs/05-SECURITE.md).
// N'accepte jamais un objet libre à logger tel quel : chaque appelant doit passer des
// champs nommés explicitement whitelistés ici, pour empêcher qu'un futur ajout de code
// journalise par erreur un corps de réponse contenant des données métier.

const ALLOWED_FIELDS = new Set([
  'tool',
  'tokenRef',
  'statusCode',
  'durationMs',
  'recordCount',
  'pagesFetched',
  'message',
  'errorCode',
]);

function truncateTokenRef(tokenRef) {
  if (!tokenRef) return 'anonymous';
  return `${tokenRef.slice(0, 6)}…(${tokenRef.length})`;
}

function sanitize(fields) {
  const out = {};
  for (const [key, value] of Object.entries(fields || {})) {
    if (!ALLOWED_FIELDS.has(key)) continue;
    out[key] = key === 'tokenRef' ? truncateTokenRef(value) : value;
  }
  return out;
}

export function createLogger({ level = 'info' } = {}) {
  const levels = ['debug', 'info', 'warn', 'error'];
  const threshold = levels.indexOf(level) === -1 ? 1 : levels.indexOf(level);

  function log(levelName, fields) {
    if (levels.indexOf(levelName) < threshold) return;
    const entry = {
      ts: new Date().toISOString(),
      level: levelName,
      ...sanitize(fields),
    };
    // stdout uniquement : la collecte/rotation est déléguée à la plateforme d'hébergement.
    process.stdout.write(`${JSON.stringify(entry)}\n`);
  }

  return {
    debug: (fields) => log('debug', fields),
    info: (fields) => log('info', fields),
    warn: (fields) => log('warn', fields),
    error: (fields) => log('error', fields),
  };
}
