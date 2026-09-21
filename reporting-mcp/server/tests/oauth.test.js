import test from 'node:test';
import assert from 'node:assert/strict';
import { generateKeyPair, exportJWK, SignJWT } from 'jose';

import { createOAuthVerifier, createLocalJWKSet } from '../src/oauthVerifier.js';
import { createAuthMiddleware, AuthError } from '../src/auth.js';

const ISSUER = 'https://auth.example.test/';
const AUDIENCE = 'reporting-btob';

async function setup() {
  const { publicKey, privateKey } = await generateKeyPair('ES256');
  const publicJwk = await exportJWK(publicKey);
  publicJwk.kid = 'test-key-1';
  publicJwk.alg = 'ES256';
  const jwks = createLocalJWKSet({ keys: [publicJwk] });

  const verifyToken = createOAuthVerifier({
    issuerUrl: ISSUER,
    audience: AUDIENCE,
    tenantClaim: 'tenant_scope_id',
    scopeClaim: 'scope',
    jwks,
  });

  async function signToken(claims, { expiresInSeconds = 3600 } = {}) {
    return new SignJWT(claims)
      .setProtectedHeader({ alg: 'ES256', kid: 'test-key-1' })
      .setIssuer(ISSUER)
      .setAudience(AUDIENCE)
      .setIssuedAt()
      .setExpirationTime(Math.floor(Date.now() / 1000) + expiresInSeconds)
      .sign(privateKey);
  }

  return { verifyToken, signToken };
}

test('createOAuthVerifier accepte un jeton correctement signé et en extrait les claims attendus', async () => {
  const { verifyToken, signToken } = await setup();
  const token = await signToken({ sub: 'claude-connector', scope: 'reporting:read', tenant_scope_id: 'btob-telecom' });

  const claims = await verifyToken(token);

  assert.equal(claims.subject, 'claude-connector');
  assert.equal(claims.scope, 'reporting:read');
  assert.equal(claims.tenantScopeId, 'btob-telecom');
  assert.ok(claims.expiresAt > Date.now());
});

test('createOAuthVerifier rejette un jeton signé par une autre clé', async () => {
  const { verifyToken } = await setup();
  const { privateKey: otherKey } = await generateKeyPair('ES256');
  const forged = await new SignJWT({ sub: 'attacker', scope: 'reporting:read', tenant_scope_id: 'btob-telecom' })
    .setProtectedHeader({ alg: 'ES256', kid: 'test-key-1' })
    .setIssuer(ISSUER)
    .setAudience(AUDIENCE)
    .setIssuedAt()
    .setExpirationTime('1h')
    .sign(otherKey);

  await assert.rejects(() => verifyToken(forged));
});

test('createOAuthVerifier rejette un jeton expiré', async () => {
  const { verifyToken, signToken } = await setup();
  const token = await signToken(
    { sub: 'claude-connector', scope: 'reporting:read', tenant_scope_id: 'btob-telecom' },
    { expiresInSeconds: -10 }
  );

  await assert.rejects(() => verifyToken(token));
});

test('createOAuthVerifier rejette une audience incorrecte', async () => {
  const { publicKey, privateKey } = await generateKeyPair('ES256');
  const publicJwk = await exportJWK(publicKey);
  publicJwk.kid = 'test-key-1';
  const jwks = createLocalJWKSet({ keys: [publicJwk] });
  const verifyToken = createOAuthVerifier({ issuerUrl: ISSUER, audience: AUDIENCE, jwks });

  const wrongAudienceToken = await new SignJWT({ sub: 'x', scope: 'reporting:read', tenant_scope_id: 't' })
    .setProtectedHeader({ alg: 'ES256', kid: 'test-key-1' })
    .setIssuer(ISSUER)
    .setAudience('un-autre-service')
    .setIssuedAt()
    .setExpirationTime('1h')
    .sign(privateKey);

  await assert.rejects(() => verifyToken(wrongAudienceToken));
});

test('createAuthMiddleware bout en bout : jeton valide => contexte résolu ; jeton falsifié => AuthError (jamais une exception générique)', async () => {
  const { verifyToken, signToken } = await setup();
  const authenticate = createAuthMiddleware({ verifyToken });

  const validToken = await signToken({ sub: 'claude-connector', scope: 'reporting:read', tenant_scope_id: 'btob-telecom' });
  const context = await authenticate(validToken);
  assert.equal(context.tenantScopeId, 'btob-telecom');
  assert.equal(context.subject, 'claude-connector');

  await assert.rejects(() => authenticate('ceci-nest-pas-un-jwt'), AuthError);
});

test('createAuthMiddleware refuse un jeton valide mais sans le scope reporting:read requis', async () => {
  const { verifyToken, signToken } = await setup();
  const authenticate = createAuthMiddleware({ verifyToken });
  const token = await signToken({ sub: 'claude-connector', scope: 'autre:scope', tenant_scope_id: 'btob-telecom' });

  await assert.rejects(() => authenticate(token), (error) => {
    assert.ok(error instanceof AuthError);
    assert.equal(error.code, 'insufficient_scope');
    return true;
  });
});

test('createAuthMiddleware refuse un jeton valide mais sans périmètre société résolu', async () => {
  const { verifyToken, signToken } = await setup();
  const authenticate = createAuthMiddleware({ verifyToken });
  const token = await signToken({ sub: 'claude-connector', scope: 'reporting:read' });

  await assert.rejects(() => authenticate(token), (error) => {
    assert.ok(error instanceof AuthError);
    assert.equal(error.code, 'missing_tenant_scope');
    return true;
  });
});
