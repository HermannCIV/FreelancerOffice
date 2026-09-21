// Validation du jeton OAuth émis pour Claude. Résout un périmètre société figé côté
// serveur — jamais négocié par l'appelant (voir docs/02-MATRICE-DROITS.md).
//
// NOTE D'HONNÊTETÉ : la vérification de signature JWT contre le JWKS de l'émetteur n'est
// volontairement PAS implémentée en dur ici avec une bibliothèque figée, car le flux
// OAuth exact supporté par les connecteurs personnalisés Claude doit être confirmé avant
// activation (voir docs/05-SECURITE.md). Cette fonction définit le CONTRAT attendu
// (scope, périmètre, expiration) que l'implémentation de vérification de signature devra
// respecter une fois le fournisseur d'autorisation choisi.

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

    const claims = await verifyToken(bearerToken);

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
