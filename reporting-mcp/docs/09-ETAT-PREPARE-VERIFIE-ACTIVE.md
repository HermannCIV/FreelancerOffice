# 9. État précis : préparé / vérifié / activé

Cette table est la référence unique de ce qui a réellement eu lieu depuis cette session,
par opposition à ce qui reste à faire par un opérateur disposant des accès nécessaires.

| Élément | Préparé (conçu/codé/documenté) | Vérifié (testé avec des preuves) | Activé (en fonctionnement réel) |
|---|---|---|---|
| Architecture (réutilisation API existante + repli DB) | ✅ `docs/01` | — (dépend du point 1 de doc 00) | ❌ |
| Matrice de droits | ✅ `docs/02` | — (droits Perfex réels non attribuables sans admin) | ❌ |
| Dictionnaire des indicateurs | ✅ `docs/03` + `server/src/indicators.js` | ✅ formules testées sur données fictives (`server/tests`) | ❌ (pas branché sur données réelles) |
| Limites de charge | ✅ `docs/04` + `server/src/config.js` | ✅ valeurs par défaut cohérentes, logique de gating testée | ❌ (pas de mesure en production) |
| Sécurité (transport, auth, minimisation, révocation) | ✅ `docs/05` + `auth.js`/`rateLimiter.js`/`logger.js` | ✅ démarrage du serveur vérifié localement ; rejet HTTP 401 sans jeton vérifié par un appel réel en local (voir ci-dessous) | ❌ (vérification de signature OAuth non branchée : `stubVerifyToken` lève volontairement) |
| Connecteur MCP (outils bornés, lecture seule) | ✅ `server/src/mcpServer.js` + `server/src/tools/*` | ✅ démarrage OK, syntaxe OK, appel HTTP sans jeton refusé (401) — testé localement dans cette session | ❌ (aucun déploiement, aucune route API confirmée `verified:true`) |
| Moteur de calcul déterministe (HT/TTC, avoirs, paiements partiels, gating pagination) | ✅ `server/src/totals.js` | ✅ **13/13 tests automatisés passés** sur données fictives, voir `server/tests/RESULTATS.md` | ❌ (jamais exécuté sur des données réelles) |
| Procédure de déploiement/retour arrière | ✅ `docs/06` | — (aucune étape exécutée contre la production) | ❌ |
| Prompt d'analyse à la demande | ✅ `docs/07` | ❌ (pas de connecteur réel à interroger) | ❌ |
| Prompt de rapport journalier + choix planification | ✅ `docs/07` | ❌ | ❌ |
| Repli n8n + OpenAI | ✅ `fallback-n8n/` (squelette de workflow, sans secret) | ❌ (aucune instance n8n disponible depuis cette session) | ❌ |
| Lecture de production limitée + comparaison à un rapport de référence | ❌ non tenté (aucun accès/identifiant fourni) | ❌ | ❌ |
| Connecteur MCP déclaré dans le compte Claude `ani.herman@gmail.com` | ❌ | ❌ | ❌ |
| Vérification de la compatibilité "tâches planifiées" du compte Claude avec un connecteur MCP personnalisé | ❌ (aucun accès à l'interface du compte depuis ce dépôt) | ❌ | ❌ |
| Envoi réel d'un rapport à une destination | ❌ (destination à confirmer sans ambiguïté, voir doc 00 point 9) | ❌ | ❌ |

## Preuve concrète des vérifications locales effectuées dans cette session

- `cd reporting-mcp/server && npm install && npm test` → 13/13 tests passés
  (voir `server/tests/RESULTATS.md` et `server/tests/RESULTATS.raw.txt`).
- `NODE_ENV=test PORT=8798 node src/mcpServer.js` puis requête HTTP sans jeton → réponse
  `401 {"error":"missing_token"}`, confirmant que l'accès sans authentification est
  refusé au niveau transport, avant tout accès aux outils.

## Prochaine action qui débloque le plus de choses

Confirmer les points 1, 2, 3 et 7 de `docs/00-HYPOTHESES-ET-MANQUANTS.md` (routes API
réelles + méthode d'authentification Perfex + capacité de planification du compte
Claude). Ce sont les seules informations qui, une fois obtenues, permettent de faire
passer la majorité des lignes ci-dessus de "préparé" à "vérifié en production", puis
"activé".
