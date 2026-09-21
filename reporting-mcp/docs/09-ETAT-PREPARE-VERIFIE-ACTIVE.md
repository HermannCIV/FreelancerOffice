# 9. État précis : préparé / vérifié / activé

Cette table est la référence unique de ce qui a réellement eu lieu depuis cette session,
par opposition à ce qui reste à faire par un opérateur disposant des accès nécessaires.

| Élément | Préparé (conçu/codé/documenté) | Vérifié (testé avec des preuves) | Activé (en fonctionnement réel) |
|---|---|---|---|
| Architecture (réutilisation API existante + repli DB) | ✅ `docs/01` | — (dépend du point 1 de doc 00) | ❌ |
| Matrice de droits | ✅ `docs/02` | — (droits Perfex réels non attribuables sans admin) | ❌ |
| Dictionnaire des indicateurs | ✅ `docs/03` + `server/src/indicators.js` | ✅ formules testées sur données fictives (`server/tests`) | ❌ (pas branché sur données réelles) |
| Limites de charge | ✅ `docs/04` + `server/src/config.js` | ✅ valeurs par défaut cohérentes, logique de gating testée | ❌ (pas de mesure en production) |
| Sécurité (transport, auth, minimisation, révocation) | ✅ `docs/05` + `auth.js`/`oauthVerifier.js`/`rateLimiter.js`/`logger.js` | ✅ vérification JWT réelle (signature/expiration/audience) testée hors ligne avec une paire de clés locale (`tests/oauth.test.js`) ; rejet HTTP 401 sans jeton vérifié par un appel réel en local (voir ci-dessous) | ❌ (aucun fournisseur d'autorisation réel connecté ; JWKS distant jamais interrogé) |
| Connecteur MCP (outils bornés, lecture seule) | ✅ `server/src/mcpServer.js` + `server/src/tools/*` | ✅ démarrage OK, syntaxe OK, appel HTTP sans jeton refusé (401) — testé localement dans cette session | ❌ (aucun déploiement, aucune route API confirmée `verified:true`) |
| Moteur de calcul déterministe (HT/TTC, avoirs, paiements partiels, gating pagination) | ✅ `server/src/totals.js` | ✅ **20/20 tests automatisés passés** sur données fictives, voir `server/tests/RESULTATS.md`, rejoués en CI (`.github/workflows/reporting-mcp-tests.yml`) | ❌ (jamais exécuté sur des données réelles) |
| Conteneurisation (Dockerfile, docker-compose) | ✅ `server/Dockerfile` + `docker-compose.yml` (non-root, lecture seule, écoute locale derrière reverse proxy TLS) | ❌ **build non exécuté** : aucun démon Docker disponible dans ce bac à sable | ❌ |
| Intégration continue | ✅ `.github/workflows/reporting-mcp-tests.yml` | ❌ pas encore observée en exécution réelle sur GitHub Actions (se déclenchera au prochain push sur la PR) | ✅ dès le prochain push, s'exécutera automatiquement |
| Procédure de déploiement/retour arrière | ✅ `docs/06` (mise à jour avec l'option conteneur) | — (aucune étape exécutée contre la production) | ❌ |
| Prompt d'analyse à la demande | ✅ `docs/07` | ❌ (pas de connecteur réel à interroger) | ❌ |
| Prompt de rapport journalier + choix planification | ✅ `docs/07` | ❌ | ❌ |
| Repli n8n + OpenAI | ✅ `fallback-n8n/` (squelette de workflow, sans secret) | ❌ (aucune instance n8n disponible depuis cette session) | ❌ |
| Lecture de production limitée + comparaison à un rapport de référence | ❌ non tenté (aucun accès/identifiant fourni) | ❌ | ❌ |
| Connecteur MCP déclaré dans le compte Claude `ani.herman@gmail.com` | ❌ | ❌ | ❌ |
| Vérification de la compatibilité "tâches planifiées" du compte Claude avec un connecteur MCP personnalisé | ❌ (aucun accès à l'interface du compte depuis ce dépôt) | ❌ | ❌ |
| Envoi réel d'un rapport à une destination | ❌ (destination à confirmer sans ambiguïté, voir doc 00 point 9) | ❌ | ❌ |

## Preuve concrète des vérifications locales effectuées dans cette session

- `cd reporting-mcp/server && npm install && npm test` → 20/20 tests passés
  (voir `server/tests/RESULTATS.md` et `server/tests/RESULTATS.raw.txt`).
- `NODE_ENV=test PORT=8798 node src/mcpServer.js` puis requête HTTP sans jeton → réponse
  `401 {"error":"missing_token"}`, confirmant que l'accès sans authentification est
  refusé au niveau transport, avant tout accès aux outils.
- Avec `OAUTH_ISSUER_URL`/`OAUTH_JWKS_URL` factices renseignées, le serveur démarre et
  refuse toujours une requête sans jeton (même comportement, cette fois avec la
  vérification OAuth réellement activée plutôt qu'un stub).
- `docker build`/`docker compose up` **n'ont pas pu être exécutés** : aucun démon Docker
  disponible dans ce bac à sable. Le Dockerfile a été relu attentivement mais son
  exécution reste à valider par un opérateur disposant de Docker.

## Prochaine action qui débloque le plus de choses

Confirmer les points 1, 2, 3 et 7 de `docs/00-HYPOTHESES-ET-MANQUANTS.md` (routes API
réelles + méthode d'authentification Perfex + capacité de planification du compte
Claude). Ce sont les seules informations qui, une fois obtenues, permettent de faire
passer la majorité des lignes ci-dessus de "préparé" à "vérifié en production", puis
"activé".

## Ce qu'il faut concrètement pour que je puisse activer un déploiement réel

Un déploiement réel implique d'agir sur des systèmes que je n'ai pas les moyens
d'atteindre depuis cette session (pas d'accès réseau vers `GESTION.BTOB-TELECOM.COM`,
pas d'accès à l'interface d'administration Perfex, pas d'accès aux réglages du compte
Claude `ani.herman@gmail.com`, pas d'hébergeur provisionné). Pour que ça avance, il faut
concrètement, dans cet ordre :

1. **Un accès en lecture à la documentation réelle du module API installé** (ou, à
   défaut, un accès admin Perfex temporaire pour que je la consulte moi-même si cette
   session y a accès réseau) → me permet de remplacer les routes `verified: false` de
   `capabilityMap.js` par les vraies, et de corriger `normalizers.js` sur les vrais noms
   de champs.
2. **Une clé API Perfex dédiée en lecture seule** (créée par un admin, scope limité aux
   modules autorisés) → me permet de faire un premier appel réel et de comparer au
   rapport de référence (doc 08).
3. **Un hébergement HTTPS joignable** (VM, conteneur chez un hébergeur, ou service
   existant du client) où déployer `server/` → sans ça, rien ne peut tourner en continu
   ni être appelé par Claude.
4. **Un fournisseur d'autorisation OAuth** (existant chez le client, ou à provisionner) —
   `oauthVerifier.js` est prêt à s'y connecter dès que `OAUTH_ISSUER_URL`/`OAUTH_JWKS_URL`
   pointent vers un vrai émetteur.
5. **Un accès aux réglages du compte Claude** `ani.herman@gmail.com` pour déclarer le
   connecteur et vérifier si une tâche planifiée peut l'appeler à 07 h 00
   Africa/Abidjan — c'est une action dans l'interface Claude, que seul le titulaire du
   compte peut faire (je ne peux ni la faire à sa place, ni la vérifier à distance).
6. **Confirmation explicite et sans ambiguïté de l'adresse destinataire** du rapport
   (doc 00, point 9) avant toute activation d'envoi.

Sans au moins les points 1 à 3, je ne peux pas transformer un seul indicateur de
"préparé" en "vérifié en production" : c'est une limite d'accès, pas de volonté.
