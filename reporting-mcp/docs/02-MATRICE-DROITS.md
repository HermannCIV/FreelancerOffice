# 2. Matrice de droits

Principe : le compte/jeton utilisé par le service de reporting n'a **jamais** de droit
d'écriture, quel que soit le niveau (API applicative, base de données, transport MCP).
Cette matrice liste, module par module, les opérations demandées et le droit minimal
correspondant. Les noms d'endpoint/tables exacts sont à confirmer (cf. doc 00) — cette
matrice fixe le *droit*, pas la route.

| Module métier demandé | Lecture nécessaire pour | Écriture jamais accordée | Rôle Perfex suggéré (staff role à créer) |
|---|---|---|---|
| Clients | Liste clients, statut, encours, factures liées | Création/édition client, relance | `reporting_readonly` : voir, pas éditer, pas supprimer |
| Prospects (leads) | Nombre de nouveaux prospects/jour, statut pipeline | Conversion lead→client, édition | idem |
| Commercial | Devis émis, taux de conversion, CA par commercial | Édition de devis, envoi client | idem |
| Fournisseurs | Liste fournisseurs, dépenses associées | Création/paiement fournisseur | idem |
| Inventaire | Niveaux de stock si module présent (à confirmer, cf. doc 00 point 5) | Mouvement de stock, ajustement | idem, ou exclu si le module n'existe pas réellement |
| Dépenses | Dépenses par période, catégorie, statut | Création/validation/paiement de dépense | idem |
| Comptabilité | Factures, paiements, avoirs, impayés, TVA/HT-TTC | Écriture comptable, lettrage, export FEC en écriture, paiement | idem |
| Projets | Projets en cours, avancement, budget consommé | Édition tâche/projet | idem |
| Contrat | Contrats actifs, échéances, montants | Édition/renouvellement/résiliation | idem |
| Gestion RH | Effectif, absences agrégées si module présent (à confirmer) | Toute donnée RH nominative sensible (paie, contrat de travail détaillé) reste **hors périmètre** par défaut, sauf validation RGPD/droit local explicite | Accès RH agrégé uniquement, jamais le détail individuel sans decision explicite |

## Droits au niveau transport/API

| Composant | Droit accordé | Droit explicitement refusé |
|---|---|---|
| Jeton OAuth Claude → service reporting | `scope=reporting:read` uniquement | Aucun scope d'écriture n'existe côté serveur d'autorisation ; même un jeton mal scope ne peut pas appeler de route de mutation car ces routes n'existent pas dans `mcpServer.js` |
| Service reporting → API Perfex | Clé/jeton API rattaché à un rôle Perfex sans permission "add/edit/delete" sur aucun module | Aucun accès aux routes `POST/PUT/DELETE` de l'API Perfex : le client HTTP (`perfexClient.js`) n'implémente que `GET` |
| Service reporting → base (option B, repli) | `GRANT SELECT` sur les tables des modules listés ci-dessus | `INSERT/UPDATE/DELETE/ALTER/DROP/EXECUTE/CREATE ROUTINE` refusés au niveau SGBD, pas seulement au niveau applicatif |
| Exécution SQL | Aucune | Aucune requête SQL libre n'est acceptée en entrée d'un outil MCP ; toutes les requêtes du repli option B sont pré-écrites et paramétrées, jamais construites par concaténation |

## Isolation entreprise

- Un jeton OAuth = un périmètre entreprise fixé à l'émission (jamais transmis en
  paramètre par l'appelant).
- Si l'instance Perfex est multi-société (point 4 de doc 00), le filtre société est
  injecté côté serveur avant l'appel à l'API Perfex, pas négocié par l'outil MCP.

## Ce que les annotations MCP ne remplacent pas

Les annotations de capacité MCP (`readOnlyHint`, etc.) sont documentaires pour l'UI de
Claude ; elles n'ont aucune valeur de contrôle d'accès côté serveur. Le contrôle réel se
fait par :

1. l'absence de tout code de mutation dans le service (rien à activer, rien à bypasser) ;
2. les droits du compte technique côté Perfex/BDD (moindre privilège appliqué au niveau
   plateforme, indépendant du code applicatif) ;
3. la validation de schéma stricte des entrées de chaque outil (types, bornes, enums)
   avant tout appel sortant.
