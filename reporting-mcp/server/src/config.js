// Charge et valide la configuration depuis l'environnement. Aucune valeur par défaut
// n'est fournie pour un secret : un secret manquant doit faire échouer le démarrage,
// jamais retomber sur une valeur silencieuse.

function requireEnv(name, { allowEmptyInTest = false } = {}) {
  const value = process.env[name];
  if (value === undefined || value === '') {
    if (allowEmptyInTest && process.env.NODE_ENV === 'test') return '';
    throw new Error(`Variable d'environnement manquante: ${name}`);
  }
  return value;
}

function intEnv(name, fallback) {
  const raw = process.env[name];
  if (raw === undefined || raw === '') return fallback;
  const value = Number.parseInt(raw, 10);
  if (!Number.isFinite(value) || value <= 0) {
    throw new Error(`Variable d'environnement invalide (entier positif attendu): ${name}`);
  }
  return value;
}

export function loadConfig() {
  const isTest = process.env.NODE_ENV === 'test';

  const baseUrl = requireEnv('PERFEX_BASE_URL', { allowEmptyInTest: true }) || (isTest ? 'https://fixtures.local' : '');
  if (!isTest && !baseUrl.startsWith('https://')) {
    throw new Error('PERFEX_BASE_URL doit être en https:// en dehors des tests.');
  }

  return {
    nodeEnv: process.env.NODE_ENV || 'development',
    perfex: {
      baseUrl,
      authScheme: process.env.PERFEX_API_AUTH_SCHEME || 'api-key-header',
      apiKey: requireEnv('PERFEX_API_KEY', { allowEmptyInTest: true }),
      apiKeyHeaderName: process.env.PERFEX_API_KEY_HEADER_NAME || 'X-Api-Key',
    },
    oauth: {
      issuerUrl: requireEnv('OAUTH_ISSUER_URL', { allowEmptyInTest: true }),
      audience: process.env.OAUTH_AUDIENCE || 'reporting-btob',
      jwksUrl: requireEnv('OAUTH_JWKS_URL', { allowEmptyInTest: true }),
      tenantClaim: process.env.OAUTH_TENANT_CLAIM || 'tenant_scope_id',
      scopeClaim: process.env.OAUTH_SCOPE_CLAIM || 'scope',
    },
    tenantScopeId: process.env.TENANT_SCOPE_ID || '',
    limits: {
      pageSizeMax: intEnv('PAGE_SIZE_MAX', 100),
      maxPagesPerQuery: intEnv('MAX_PAGES_PER_QUERY', 20),
      maxRangeDays: intEnv('MAX_RANGE_DAYS', 31),
      maxConcurrency: intEnv('MAX_CONCURRENCY', 2),
      minRequestIntervalMs: intEnv('MIN_REQUEST_INTERVAL_MS', 150),
      rateLimitPerTokenPerMin: intEnv('RATE_LIMIT_PER_TOKEN_PER_MIN', 30),
      rateLimitPerIpPerMin: intEnv('RATE_LIMIT_PER_IP_PER_MIN', 60),
      upstreamTimeoutMs: intEnv('UPSTREAM_TIMEOUT_MS', 8000),
      upstreamMaxRetries: intEnv('UPSTREAM_MAX_RETRIES', 2),
      maxResponseBytes: intEnv('MAX_RESPONSE_BYTES', 5 * 1024 * 1024),
    },
    reportTimezone: process.env.REPORT_TIMEZONE || 'Africa/Abidjan',
    reportCurrency: process.env.REPORT_CURRENCY || 'XOF',
    logLevel: process.env.LOG_LEVEL || 'info',
  };
}
