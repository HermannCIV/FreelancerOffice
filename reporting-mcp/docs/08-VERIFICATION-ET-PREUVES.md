# 8. Vérification locale et preuves

## Vérification locale (données fictives) — effectuée dans cette session

Emplacement : `server/tests/`. Exécution : `npm test` (Node.js `node:test`, aucune
dépendance réseau).

Fixtures fictives (`server/tests/fixtures/*.json`) couvrant volontairement les cas
piégeux mentionnés dans la demande :

- facture entièrement payée, facture `unpaid`, facture `partially_paid`, facture
  `cancelled`, facture `draft` ;
- un avoir (`credit_note`) rattaché à une facture ;
- une ligne avec devise différente de XOF (doit être exclue et remontée en avertissement) ;
- une ligne sans `amount_ht` (donnée incomplète au niveau ligne) ;
- une pagination simulée en 3 pages dont une échoue (doit forcer `status: "incomplete"`
  sur l'indicateur concerné, jamais un total silencieusement partiel) ;
- une période sans aucune donnée (doit produire `0`, pas `unavailable`, car la couverture
  est complète et vide).

Résultat de l'exécution consigné dans `server/tests/RESULTATS.md` après exécution réelle
des tests dans cette session (voir commande et sortie collées telles quelles, sans
édition). Un test supplémentaire (`tests/oauth.test.js`) vérifie la vérification JWT
réelle (signature, expiration, audience) avec une paire de clés générée localement,
sans aucun appel réseau — 20/20 tests passent au total après cet ajout.

Un workflow CI (`.github/workflows/reporting-mcp-tests.yml`) relance automatiquement
cette même suite de tests à chaque push/PR touchant `reporting-mcp/server/`, pour éviter
une régression silencieuse sur la logique de calcul ou l'authentification.

## Ce qui n'a PAS été fait depuis cette session (et pourquoi)

- **Aucun appel réel vers `GESTION.BTOB-TELECOM.COM`** : je n'ai reçu aucune URL d'API, ni
  clé, ni jeton pour cette instance. Sans cela, tenter un appel serait soit impossible,
  soit une invention de route non vérifiée — explicitement exclu par la demande.
- **Aucune comparaison à un rapport de référence réel** : elle suppose un accès à un
  rapport existant (export Perfex, tableau de bord) que je n'ai pas.
- **Aucune mesure de charge en production** : nécessite un accès réseau à l'hébergement
  cible, qui n'a pas été fourni.
- **Aucune création de compte OAuth, de compte API Perfex, ni de connecteur MCP réel dans
  les réglages du compte Claude** : ce sont des actions d'administration qui doivent être
  faites par une personne disposant des accès (voir doc 06), pas depuis un dépôt de code.

## Gabarit à remplir lors de la vérification réelle (production limitée)

À copier dans `server/tests/RESULTATS-PRODUCTION.md` (nouveau fichier, non fourni ici
puisqu'aucune vérification production n'a eu lieu) une fois l'étape 7 de la démarche
réalisée par un opérateur disposant des accès :

```
Date de vérification :
Fenêtre testée (from/to, Africa/Abidjan) :
Nombre d'appels effectués :
Temps de réponse observés (p50 / p95 en ms) :
Écart avec le rapport de référence (préciser la source du rapport de référence) :
Anomalies observées :
Décision : GO / NO-GO pour activation planifiée
```

## Distinction préparé / vérifié / activé

Voir `docs/09-ETAT-PREPARE-VERIFIE-ACTIVE.md` pour l'état précis, item par item, de tout
ce livrable.
