# 3. Dictionnaire des indicateurs

Convention commune à **tous** les indicateurs ci-dessous :

- **Devise** : XOF uniquement. Un enregistrement source dans une autre devise est exclu du
  total et remonté dans `warnings[]` (jamais converti silencieusement : pas de taux de
  change déterministe garanti sans source de taux validée).
- **HT / TTC** : toujours restitués séparément (`amount_ht`, `amount_ttc`, `vat_amount`).
  Si la source ne fournit qu'un seul des deux montants pour une ligne, cette ligne est
  exclue du total agrégé concerné et comptée dans `incomplete_count`.
- **Trois états distincts** pour toute valeur agrégée :
  - `0` (zéro) : la mesure a été calculée sur une couverture complète et vaut réellement zéro.
  - `null` avec `status: "unavailable"` : la source n'a pas répondu, ou le module n'est
    pas activé/autorisé pour ce jeton.
  - `null` avec `status: "incomplete"` : au moins une page de données n'a pas pu être
    récupérée intégralement (voir gating pagination ci-dessous) — **le total n'est jamais
    calculé sur une pagination incomplète**, conformément à la consigne.
- **Statuts de factures/paiements pris en compte** : `paid`, `partially_paid`, `unpaid`,
  `overdue`, `cancelled`, `draft`. Les factures `cancelled` et `draft` sont exclues du CA
  facturé mais listées séparément (`cancelled_count`, `draft_count`) pour traçabilité.
- **Avoirs (credit notes)** : soustraits du CA net, jamais fusionnés silencieusement avec
  les factures — toujours un champ `credit_notes_total` distinct en plus de
  `invoiced_total`, et `net_total = invoiced_total - credit_notes_total`.
- **Paiements partiels** : une facture `partially_paid` contribue à `invoiced_total` pour
  son montant total facturé, et à `paid_total` pour la somme réellement encaissée ; le
  reste alimente `outstanding_total` (impayés). Ces trois montants ne sont jamais
  confondus.
- **Période et fraîcheur** : chaque réponse d'outil MCP inclut `period.from`,
  `period.to`, `timezone: "Africa/Abidjan"`, `generated_at` (horodatage de calcul) et
  `data_as_of` (horodatage de la donnée source la plus récente utilisée, si l'API la
  fournit ; sinon `unavailable`).
- **Références sources** : chaque ligne agrégée conserve les identifiants sources
  (`invoice_id`, `expense_id`, etc.) permettant de retracer jusqu'à la donnée d'origine
  dans Perfex, sans dupliquer les champs personnels non nécessaires (minimisation).

## Indicateurs journaliers (`get_daily_kpis`)

| Indicateur | Formule | Source (module) | Remarques |
|---|---|---|---|
| `revenue_ht` / `revenue_ttc` | Somme des factures émises sur la période, hors `cancelled`/`draft`, moins avoirs | Comptabilité | Nécessite couverture pagination complète |
| `payments_received` | Somme des paiements enregistrés sur la période (indépendamment de la date de facture) | Comptabilité | Basé sur date de paiement, pas date de facture |
| `outstanding_total` | Somme des soldes dus sur factures `unpaid`/`partially_paid`/`overdue` à la date de calcul | Comptabilité | Photo à `generated_at`, pas cumulée sur la période |
| `new_prospects` | Nombre de prospects créés sur la période | Prospects | Compte brut, pas de déduplication cross-source |
| `new_clients` | Nombre de clients créés sur la période | Clients | |
| `expenses_total` | Somme des dépenses par catégorie sur la période | Dépenses | Ventilé par catégorie si disponible |
| `active_contracts` | Nombre de contrats avec statut actif à la date de calcul, et montant total | Contrat | Photo, pas flux |
| `projects_in_progress` | Nombre de projets non clôturés, avec % avancement moyen si fourni par la source | Projets | `unavailable` si le module n'expose pas l'avancement |

## Impayés (`get_outstanding_invoices`)

Liste paginée des factures avec solde dû > 0 à `generated_at`, triée par ancienneté
décroissante. Champs : `invoice_id`, `client_ref` (identifiant, pas de données
personnelles superflues), `issue_date`, `due_date`, `days_overdue`, `amount_ht`,
`amount_ttc`, `paid_to_date`, `balance_due`, `status`.

## Opérations (`list_operations`)

Journal paginé des mouvements (facture émise, paiement reçu, dépense enregistrée, avoir
émis) sur une période donnée, filtrable par module autorisé. Ce n'est **pas** un export
comptable officiel : il sert à l'analyse, pas à la déclaration.

## Justificatifs (`list_vouchers`)

Liste paginée des références de pièces justificatives (numéro de facture, numéro de
dépense, référence de reçu) avec métadonnées (date, montant, module d'origine) et, si
l'API le permet, un lien de consultation. Le contenu binaire du justificatif n'est pas
rapatrié par cet outil (minimisation) ; seul le lien/identifiant l'est.

## Gating pagination — règle stricte

Un total n'est renvoyé avec une valeur numérique que si **toutes** les pages nécessaires
pour couvrir la période demandée ont été récupérées avec succès. Si une page échoue ou si
la source indique plus de résultats qu'un plafond de sécurité (`MAX_PAGES_PER_QUERY`,
voir doc 04) ne permet d'en lire, l'indicateur bascule à `status: "incomplete"` et
`coverage` détaille `{ pages_fetched, pages_expected_or_unknown }`. C'est implémenté et
testé dans `server/src/totals.js` (voir `server/tests/pagination-gating.test.js`).
