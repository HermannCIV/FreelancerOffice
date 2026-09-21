# 1. Architecture

## Vue d'ensemble

```
                         HTTPS + OAuth 2.1 (PKCE)                 HTTPS (API key / OAuth du module, à confirmer)
Claude (analyse à la  ───────────────────────────►  Service de   ───────────────────────────►  API existante Perfex
demande + rapport                                    reporting                                  (perfexapi.com ou
journalier planifié)  ◄───────────────────────────  MCP (lecture  ◄───────────────────────────   équivalent) sur
                          JSON borné, paginé            seule)         JSON (lecture seule)       GESTION.BTOB-TELECOM.COM
                                                          │
                                                          ├── capabilityMap.js (routes déclarées,
                                                          │   chacune verified:true/false)
                                                          ├── totals.js (calcul déterministe,
                                                          │   HT/TTC, statuts, gating pagination)
                                                          ├── auth.js (validation token Claude,
                                                          │   scope reporting:read)
                                                          ├── rateLimiter.js
                                                          └── logger.js (sans secret ni PII)
```

## Principe directeur : réutiliser l'API existante (option A)

L'énoncé demande explicitement de réutiliser l'API de lecture existante si elle convient.
Le module `perfexapi.com` expose (dans sa documentation publique générale) des ressources
REST organisées par module CRM : clients, factures (`invoices`), devis (`estimates`),
dépenses (`expenses`), paiements (`payments`), avoirs (`credit notes`), prospects
(`leads`), projets (`projects`), contrats (`contracts`), personnel (`staff`), fournisseurs
selon la configuration installée.

**Le service de reporting ne réimplémente pas ces lectures depuis la base.** Il :

1. s'authentifie auprès de l'API Perfex avec un **compte/jeton dédié en lecture seule**,
   limité aux modules autorisés (Fournisseurs, Clients, Prospects, Commercial, Inventaire,
   Dépenses, Comptabilité, Projets, Contrat, RH — à mapper un par un sur les ressources
   réellement exposées, cf. `capabilityMap.js`) ;
2. n'appelle que des routes `GET` déclarées et vérifiées dans `capabilityMap.js` ;
3. agrège et normalise les réponses (devise XOF, HT/TTC, statuts) via `totals.js` ;
4. expose le résultat à Claude via des outils MCP bornés (pagination, plage de dates
   obligatoire, taille de page plafonnée).

## Repli (option B) : accès lecture direct base, si l'API ne suffit pas

Si certains indicateurs ne sont pas exposés par l'API (ex. agrégats multi-tables trop
coûteux à recomposer côté client), on peut, **uniquement en dernier recours et avec
validation explicite de l'admin infra** :

- créer un utilisateur MySQL/MariaDB **`reporting_ro`** avec uniquement `SELECT` sur les
  tables des modules autorisés (pas de `INSERT/UPDATE/DELETE/EXECUTE`, pas d'accès aux
  tables de sessions/mots de passe/tokens) ;
- interroger cette base via des **requêtes paramétrées** prédéfinies (jamais de SQL libre
  transmis par l'appelant — voir `docs/05-SECURITE.md`) ;
- idéalement pointer vers une **réplique en lecture** plutôt que la base primaire, pour
  ne jamais peser sur la production.

Ce chemin n'est pas implémenté dans le code fourni tant que le point 1 du fichier
`00-HYPOTHESES-ET-MANQUANTS.md` n'est pas tranché (API suffisante ou non).

## Isolation multi-société

Le service de reporting ne doit jamais laisser l'appelant (Claude, ou un prompt utilisateur)
choisir librement un identifiant de société/tenant. Le contexte d'entreprise est résolu
côté serveur à partir du jeton OAuth (un jeton = un périmètre société figé à l'émission),
jamais à partir d'un paramètre d'outil MCP. Voir `docs/02-MATRICE-DROITS.md`.

## Composants du service de reporting

- `perfexClient.js` : client HTTP vers l'API Perfex — timeouts, retries bornés,
  content-type strict, jamais de log du corps de réponse (peut contenir des données
  personnelles de clients).
- `capabilityMap.js` : registre déclaratif des routes utilisées, avec pour chacune
  `{ resource, method: 'GET', path, verified, notes }`. Le serveur refuse d'appeler une
  route `verified: false` en dehors du mode `--allow-unverified-dry-run` (réservé aux
  tests locaux avec des fixtures, jamais utilisable contre la production réelle car ce
  mode force aussi `PERFEX_BASE_URL` sur un hôte de test).
- `totals.js` : moteur de calcul pur (sans I/O), testé unitairement avec des fixtures.
- `indicators.js` : dictionnaire des indicateurs (source de vérité, voir doc 03),
  exposé aussi comme outil MCP en lecture pour que Claude cite ses définitions.
- `auth.js` : vérifie le jeton porteur émis par le serveur d'autorisation OAuth,
  vérifie le `scope=reporting:read`, et résout le périmètre société associé au client.
- `rateLimiter.js` : limite par jeton et par IP (voir doc 04).
- `mcpServer.js` : déclare les outils MCP et leurs schémas d'entrée/sortie stricts.

## Pourquoi un service isolé plutôt qu'un module Perfex interne

- Le PHP applicatif de Perfex n'est pas dans ce dépôt et ne doit pas être modifié pour ce
  besoin : on évite tout risque de régression sur l'ERP de production.
- Un service séparé, avec son propre compte API restreint, respecte le principe de
  moindre privilège et peut être coupé (révocation de jeton, arrêt du service) sans
  toucher à l'application métier.
- Cela correspond exactement à la consigne « prépare un service de reporting isolé avec
  un compte de base limité aux lectures nécessaires » si l'option A (API existante)
  s'avère insuffisante, et reste compatible si l'option A suffit (le service isolé
  devient alors un simple proxy MCP au-dessus de l'API existante).
