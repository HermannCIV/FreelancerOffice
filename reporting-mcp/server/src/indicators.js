// Dictionnaire des indicateurs, exposé aussi comme donnée statique via l'outil MCP
// get_indicator_definitions, pour que Claude puisse citer une définition exacte plutôt
// que de la paraphraser. Source de vérité éditoriale : docs/03-DICTIONNAIRE-INDICATEURS.md
// — ce fichier doit rester synchronisé avec ce document.

export const INDICATOR_DEFINITIONS = [
  {
    key: 'revenue_ht',
    label: 'Chiffre d\'affaires facturé HT',
    module: 'Comptabilité',
    formula: 'Somme des amount_ht des factures émises sur la période, hors cancelled/draft.',
  },
  {
    key: 'revenue_ttc',
    label: 'Chiffre d\'affaires facturé TTC',
    module: 'Comptabilité',
    formula: 'Somme des amount_ttc des factures émises sur la période, hors cancelled/draft.',
  },
  {
    key: 'net_ttc',
    label: 'CA net TTC',
    module: 'Comptabilité',
    formula: 'revenue_ttc - credit_notes_total',
  },
  {
    key: 'payments_received',
    label: 'Paiements encaissés',
    module: 'Comptabilité',
    formula: 'Somme des paiements enregistrés sur la période, par date de paiement.',
  },
  {
    key: 'outstanding_total',
    label: 'Total des impayés',
    module: 'Comptabilité',
    formula: 'Somme des soldes dus (amount_ttc - paid_to_date) sur factures unpaid/partially_paid/overdue, à la date de calcul.',
  },
  {
    key: 'new_prospects',
    label: 'Nouveaux prospects',
    module: 'Prospects',
    formula: 'Nombre de prospects créés sur la période.',
  },
  {
    key: 'new_clients',
    label: 'Nouveaux clients',
    module: 'Clients',
    formula: 'Nombre de clients créés sur la période.',
  },
  {
    key: 'expenses_total',
    label: 'Dépenses',
    module: 'Dépenses',
    formula: 'Somme des dépenses enregistrées sur la période, ventilée par catégorie si disponible.',
  },
  {
    key: 'active_contracts',
    label: 'Contrats actifs',
    module: 'Contrat',
    formula: 'Nombre et montant total des contrats au statut actif à la date de calcul.',
  },
  {
    key: 'projects_in_progress',
    label: 'Projets en cours',
    module: 'Projets',
    formula: 'Nombre de projets non clôturés ; avancement moyen si fourni par la source, sinon unavailable.',
  },
];
