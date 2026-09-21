# Reporting gESTION BtoB — connecteur MCP en lecture seule

Intégration de reporting pour gESTION BtoB (Perfex CRM, `GESTION.BTOB-TELECOM.COM`) :
analyses à la demande dans Claude + rapport journalier automatique, sans environnement de
test permanent, sans aucune capacité d'écriture.

## À lire en premier

**`docs/00-HYPOTHESES-ET-MANQUANTS.md`** — ce dépôt ne contient que les fichiers de
langue de Perfex CRM, pas le code applicatif réel de l'instance de production. Toute
route API, tout nom de champ ci-dessous est une hypothèse de configuration à confirmer,
jamais un fait vérifié contre l'instance réelle. Ce document liste précisément ce qui
manque avant toute activation.

**`docs/09-ETAT-PREPARE-VERIFIE-ACTIVE.md`** — état exact, ligne par ligne, de ce qui est
préparé, vérifié avec des preuves, ou réellement activé. Rien n'a été activé en
production depuis cette session.

## Structure du livrable

```
reporting-mcp/
├── docs/
│   ├── 00-HYPOTHESES-ET-MANQUANTS.md       constats + informations manquantes
│   ├── 01-ARCHITECTURE.md                  architecture, option A (API) / option B (DB)
│   ├── 02-MATRICE-DROITS.md                droits par module, jamais d'écriture
│   ├── 03-DICTIONNAIRE-INDICATEURS.md      définition de chaque indicateur, HT/TTC, statuts
│   ├── 04-LIMITES-DE-CHARGE.md             pagination, débit, timeouts
│   ├── 05-SECURITE.md                      HTTPS, OAuth, secrets, minimisation, révocation
│   ├── 06-DEPLOIEMENT-ROLLBACK.md          procédure de déploiement et de retour arrière
│   ├── 07-PROMPT-ANALYSE-ET-PLANIFICATION.md  prompts Claude + config de planification
│   ├── 08-VERIFICATION-ET-PREUVES.md       ce qui a été vérifié localement, et pas plus
│   └── 09-ETAT-PREPARE-VERIFIE-ACTIVE.md   tableau récapitulatif préparé/vérifié/activé
├── server/                                 connecteur MCP (Node.js, ESM, lecture seule)
│   ├── src/                                config, auth OAuth réelle (jose/JWKS), rate limiting, client API, calcul
│   ├── tests/                              tests automatisés sur données fictives (20/20 OK)
│   ├── Dockerfile / docker-compose.yml     déploiement conteneurisé (build non testé, pas de Docker ici)
│   └── .env.example                        variables attendues, aucun secret réel
└── fallback-n8n/                           repli si la planification native Claude
                                             ne convient pas au connecteur MCP

.github/workflows/reporting-mcp-tests.yml   CI : relance npm test à chaque push/PR
```

## Ce que ce connecteur fait

- Expose 6 outils MCP, tous en lecture : `get_status`, `get_daily_kpis`,
  `get_outstanding_invoices`, `list_operations`, `list_vouchers`,
  `get_indicator_definitions`.
- N'implémente strictement aucune route de création, modification, suppression, relance
  client, paiement ou écriture comptable — ces capacités n'existent nulle part dans le
  code, pas seulement désactivées par annotation.
- Calcule les totaux de façon déterministe : distingue explicitement zéro / indisponible
  / incomplet, ne calcule jamais un total sur une pagination incomplète, sépare HT/TTC,
  avoirs, paiements partiels, factures annulées/brouillon.
- N'accepte aucune route non vérifiée en production (`capabilityMap.js` refuse d'appeler
  une route tant qu'elle n'est pas explicitement confirmée par un opérateur).

- La vérification de signature OAuth (`oauthVerifier.js`, via `jose`/JWKS) est une
  implémentation réelle, testée hors ligne avec une paire de clés locale — mais elle n'a
  jamais parlé à un vrai serveur d'autorisation.

## Ce que ce connecteur ne fait pas (encore)

- Il ne tourne pas en production : aucun hébergement, aucun compte API Perfex, aucune
  autorisation OAuth réelle n'a été créé.
- Il n'est pas déclaré comme connecteur dans le compte Claude `ani.herman@gmail.com`.
- Aucun rapport n'a été envoyé à qui que ce soit.
- L'image Docker n'a jamais été construite ni lancée (aucun démon Docker disponible dans
  le bac à sable de cette session) — le Dockerfile est prêt mais pas encore validé.

## Démarrage rapide (vérification locale uniquement, sans réseau)

```bash
cd reporting-mcp/server
npm install
npm test        # 20/20 tests attendus, données fictives uniquement
```

Pour aller plus loin (déploiement réel), suivre `docs/06-DEPLOIEMENT-ROLLBACK.md` et la
checklist de `docs/09-ETAT-PREPARE-VERIFIE-ACTIVE.md` ("Ce qu'il faut concrètement pour
que je puisse activer un déploiement réel") — cette procédure nécessite des accès (admin
Perfex, hébergement, réglages du compte Claude) que je n'ai pas depuis ce dépôt.
