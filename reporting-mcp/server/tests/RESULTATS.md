# Résultats de la vérification locale (données fictives)

Exécuté dans cette session, en local, sans aucun appel réseau vers `GESTION.BTOB-TELECOM.COM`
ni vers aucune API réelle. Aucune donnée réelle de production n'a été utilisée.

- Commande : `npm test` (= `node --test`, environnement Node.js v22.22.2)
- Horodatage d'exécution (UTC) : 2026-09-21T11:24:xxZ puis re-exécuté après ajout de la
  vérification OAuth réelle
- Résultat : **20/20 tests passés, 0 échec**
- Sortie brute complète : voir `RESULTATS.raw.txt` (générée par la commande ci-dessus,
  non éditée)

## Ce que ces tests prouvent

| Fichier de test | Ce qui est vérifié |
|---|---|
| `dateRange.test.js` | Une plage de dates hors limite (`MAX_RANGE_DAYS`) est **refusée**, pas tronquée silencieusement ; `from > to` et un format invalide sont rejetés. |
| `pagination-gating.test.js` | Une page qui échoue, ou un plafond de pages atteint alors qu'il reste des données, marquent `coverage.complete = false`. Une pagination entièrement réussie et vide marque `complete = true` avec 0 enregistrement (distinction "zéro" vs "incomplet"). |
| `totals.test.js` | Sur le jeu de factures fictives (`fixtures/invoices.fixture.json`) : les factures `cancelled`/`draft` sont exclues du CA, une devise différente de XOF est exclue et journalisée en avertissement (jamais convertie silencieusement), une ligne sans `amount_ht` est comptée en `incomplete_line_count` plutôt qu'ignorée sans trace, un avoir (`credit_note_amount`) est soustrait explicitement dans `net_ttc`, les impayés (`unpaid`/`partially_paid`/`overdue`) alimentent `outstanding_total` sur la base du solde réellement dû. `buildIndicatorResponse` ne renvoie jamais de valeur numérique quand `coverage.complete = false` (values: null, status: "incomplete"). |
| `oauth.test.js` | Vérification JWT réelle (`oauthVerifier.js`, via `jose`) avec une paire de clés ES256 générée localement (aucun réseau) : jeton valide accepté et claims extraits, jeton signé par une autre clé rejeté, jeton expiré rejeté, mauvaise audience rejetée. Intégration bout en bout avec `auth.js` : jeton falsifié → `AuthError` (jamais une exception générique), scope manquant → `insufficient_scope`, périmètre société absent → `missing_tenant_scope`. |

## Ce que ces tests ne prouvent pas

- Que les noms de champs utilisés (`amount_ht`, `status`, etc.) correspondent exactement
  à la forme réelle des réponses de l'API Perfex installée sur BtoB Telecom : c'est le
  rôle de `src/normalizers.js`, marqué comme mapping à confirmer (voir docs/00).
- Que le connecteur fonctionne de bout en bout contre la production réelle : voir
  docs/08-VERIFICATION-ET-PREUVES.md pour ce qui reste à faire par un opérateur habilité.
