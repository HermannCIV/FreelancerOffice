// Limiteur de débit en mémoire (fenêtre glissante simple) par jeton et par IP.
// Suffisant pour une instance unique du service ; à remplacer par un magasin partagé
// (Redis) si le service est un jour répliqué horizontalement.

export function createRateLimiter({ perTokenPerMinute, perIpPerMinute }) {
  const tokenHits = new Map();
  const ipHits = new Map();

  function prune(hits, windowStart) {
    while (hits.length && hits[0] < windowStart) hits.shift();
  }

  function checkAndRecord(map, key, limit, now) {
    const windowStart = now - 60_000;
    const hits = map.get(key) || [];
    prune(hits, windowStart);
    if (hits.length >= limit) {
      return false;
    }
    hits.push(now);
    map.set(key, hits);
    return true;
  }

  return {
    allow({ tokenRef, ip }) {
      const now = Date.now();
      const tokenOk = checkAndRecord(tokenHits, tokenRef, perTokenPerMinute, now);
      const ipOk = checkAndRecord(ipHits, ip, perIpPerMinute, now);
      return tokenOk && ipOk;
    },
  };
}
