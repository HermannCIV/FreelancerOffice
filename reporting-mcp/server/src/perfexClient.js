// Client HTTP vers l'API Perfex existante. N'implémente QUE des requêtes GET :
// il n'existe tout simplement pas de méthode post/put/delete sur ce client, donc aucun
// appelant (même en cas de bug ailleurs dans le code) ne peut déclencher une mutation.
import { resolveVerifiedRoute } from './capabilityMap.js';

export class PerfexClient {
  constructor({ config, logger, fetchImpl = fetch, allowUnverifiedRoutes = false }) {
    this.config = config;
    this.logger = logger;
    this.fetchImpl = fetchImpl;
    this.allowUnverifiedRoutes = allowUnverifiedRoutes;
  }

  _authHeaders() {
    const { authScheme, apiKey, apiKeyHeaderName } = this.config.perfex;
    if (authScheme === 'api-key-header') {
      return { [apiKeyHeaderName]: apiKey };
    }
    if (authScheme === 'bearer') {
      return { Authorization: `Bearer ${apiKey}` };
    }
    throw new Error(`Schéma d'authentification Perfex non supporté: ${authScheme}`);
  }

  async _getOnce(resourceKey, params, attempt) {
    const route = resolveVerifiedRoute(resourceKey, { allowUnverified: this.allowUnverifiedRoutes });
    const url = new URL(route.path, this.config.perfex.baseUrl);
    for (const [key, value] of Object.entries(params || {})) {
      if (value === undefined || value === null) continue;
      url.searchParams.set(key, String(value));
    }

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), this.config.limits.upstreamTimeoutMs);
    const startedAt = Date.now();
    try {
      const response = await this.fetchImpl(url, {
        method: 'GET',
        headers: { Accept: 'application/json', ...this._authHeaders() },
        signal: controller.signal,
      });
      const durationMs = Date.now() - startedAt;

      if (!response.ok) {
        this.logger.warn({ tool: resourceKey, statusCode: response.status, durationMs });
        const err = new Error(`Réponse non-OK de l'API Perfex pour ${resourceKey}: ${response.status}`);
        err.statusCode = response.status;
        err.retryable = response.status >= 500;
        throw err;
      }

      const rawBody = await response.text();
      if (rawBody.length > this.config.limits.maxResponseBytes) {
        throw new Error(`Réponse dépassant la taille maximale autorisée pour ${resourceKey}.`);
      }
      const body = JSON.parse(rawBody);
      this.logger.info({ tool: resourceKey, statusCode: response.status, durationMs });
      return body;
    } finally {
      clearTimeout(timeout);
    }
  }

  async get(resourceKey, params) {
    const maxRetries = this.config.limits.upstreamMaxRetries;
    let lastError;
    for (let attempt = 0; attempt <= maxRetries; attempt += 1) {
      try {
        if (attempt > 0) {
          await new Promise((resolve) => setTimeout(resolve, 300 * 3 ** (attempt - 1)));
        }
        return await this._getOnce(resourceKey, params, attempt);
      } catch (error) {
        lastError = error;
        if (!error.retryable) break;
      }
    }
    throw lastError;
  }
}
