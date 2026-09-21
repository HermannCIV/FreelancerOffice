// Validation du jeton OAuth émis pour Claude. Résout un périmètre société figé côté
// serveur — jamais négocié par l'appelant (voir docs/02-MATRICE-DROITS.md).
//
// La vérification de signature JWT (oauthVerifier.js, via JWKS) est injectée ici en tant
// que `verifyToken` : ce fichier définit le CONTRAT (scope, périmètre, expiration) et
// traduit tout échec — signature invalide, jeton expiré, émetteur/audience incorrects,
// mais aussi les erreurs de contrat ci-dessous — en `AuthError` (401), jamais en erreur
// serveur générique (500), pour ne pas fuiter de détail interne côté client.

export class AuthError extends Error {
  constructor(message, code) {
    super(message);
    this.code = code;
  }
}

/**
 * `verifyToken` est injecté (pas codé en dur) pour permettre de brancher la vérification
 * de signature réelle (JWKS) au moment du déploiement, sans toucher au reste du serveur.
 * Elle doit retourner `{ subject, scope, tenantScopeId, expiresAt }` ou lever.
 */
export function createAuthMiddleware({ verifyToken, requiredScope = 'reporting:read' }) {
  return async function authenticate(bearerToken) {
    if (!bearerToken) {
      throw new AuthError('Jeton manquant.', 'missing_token');
    }

    let claims;
    try {
      claims = await verifyToken(bearerToken);
    } catch (error) {
      throw new AuthError(`Jeton invalide: ${error.message}`, 'invalid_token');
    }

    if (!claims || typeof claims !== 'object') {
      throw new AuthError('Jeton invalide.', 'invalid_token');
    }

    if (claims.expiresAt && claims.expiresAt < Date.now()) {
      throw new AuthError('Jeton expiré.', 'expired_token');
    }

    const scopes = String(claims.scope || '').split(' ').filter(Boolean);
    if (!scopes.includes(requiredScope)) {
      throw new AuthError(`Scope requis absent: ${requiredScope}`, 'insufficient_scope');
    }

    if (!claims.tenantScopeId) {
      throw new AuthError('Périmètre entreprise non résolu pour ce jeton.', 'missing_tenant_scope');
    }

    return {
      subject: claims.subject,
      tenantScopeId: claims.tenantScopeId,
      tokenRef: bearerToken.slice(0, 10),
    };
  };
}
