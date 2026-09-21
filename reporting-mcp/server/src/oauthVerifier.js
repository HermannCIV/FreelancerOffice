// Vérification réelle de la signature des jetons OAuth (JWT) via JWKS, avec la
// bibliothèque `jose`. Remplace le stub qui levait volontairement une erreur.
//
// Reste générique par construction : le nom exact de la revendication (claim) portant le
// périmètre société n'est standardisé par aucune RFC (contrairement à `scope`, `iss`,
// `aud`, `exp`), donc il est configurable (`OAUTH_TENANT_CLAIM`) plutôt que supposé. À
// confirmer contre le fournisseur d'autorisation réellement choisi au déploiement
// (voir docs/05-SECURITE.md) — c'est un point de configuration, pas une invention de
// route ou de table.
import { createRemoteJWKSet, createLocalJWKSet, jwtVerify } from 'jose';

/**
 * `jwks` peut être injecté directement (ex. `createLocalJWKSet(...)` dans les tests) pour
 * éviter tout appel réseau ; en production, il est dérivé de `jwksUrl` via
 * `createRemoteJWKSet`, qui met en cache et rafraîchit les clés automatiquement.
 */
export function createOAuthVerifier({ issuerUrl, audience, jwksUrl, tenantClaim = 'tenant_scope_id', scopeClaim = 'scope', jwks }) {
  if (!issuerUrl) {
    throw new Error('OAUTH_ISSUER_URL doit être configuré pour activer la vérification OAuth.');
  }
  const resolvedJwks = jwks || (jwksUrl ? createRemoteJWKSet(new URL(jwksUrl)) : undefined);
  if (!resolvedJwks) {
    throw new Error('OAUTH_JWKS_URL doit être configuré (ou un jeu de clés injecté explicitement).');
  }

  return async function verifyToken(bearerToken) {
    const { payload } = await jwtVerify(bearerToken, resolvedJwks, {
      issuer: issuerUrl,
      audience,
    });

    return {
      subject: payload.sub,
      scope: payload[scopeClaim],
      tenantScopeId: payload[tenantClaim],
      expiresAt: typeof payload.exp === 'number' ? payload.exp * 1000 : undefined,
    };
  };
}

export { createLocalJWKSet };
