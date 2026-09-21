// Registre déclaratif des routes API Perfex utilisées par ce service.
//
// RÈGLE ANTI-INVENTION : chaque entrée commence à `verified: false`. Le champ `path` est
// une PROPOSITION basée sur la structure générale documentée publiquement pour les
// modules REST de type Perfex CRM (ressources par module, lecture par GET). Ce n'est
// PAS une confirmation que cette route existe, sous ce nom, sur l'instance
// GESTION.BTOB-TELECOM.COM. Un opérateur ayant accès à la documentation embarquée réelle
// du module API installé doit vérifier method+path+shape de réponse, puis seulement
// passer `verified: true`.
//
// `resolveVerifiedRoute()` lève une erreur explicite tant qu'une route n'est pas
// vérifiée, plutôt que de l'appeler quand même — sauf en mode test explicite avec des
// fixtures locales (voir server/tests).

export const CAPABILITY_MAP = {
  customers: {
    method: 'GET',
    path: '/customers',
    module: 'Clients',
    verified: false,
    notes: 'À confirmer: nom de ressource réel, pagination (page/limit vs offset/limit).',
  },
  leads: {
    method: 'GET',
    path: '/leads',
    module: 'Prospects',
    verified: false,
    notes: 'À confirmer selon config des statuts de pipeline utilisés.',
  },
  estimates: {
    method: 'GET',
    path: '/estimates',
    module: 'Commercial',
    verified: false,
    notes: 'Devis. À confirmer si distinct des factures dans cette instance.',
  },
  suppliers: {
    method: 'GET',
    path: '/vendors',
    module: 'Fournisseurs',
    verified: false,
    notes: 'Nom de ressource fournisseur non standard dans Perfex core; à confirmer si add-on présent.',
  },
  inventory_items: {
    method: 'GET',
    path: '/items',
    module: 'Inventaire',
    verified: false,
    notes: 'Perfex core gère des "items" de facturation, pas un inventaire ERP; à confirmer si un module Inventaire distinct existe (doc 00, point 5).',
  },
  expenses: {
    method: 'GET',
    path: '/expenses',
    module: 'Dépenses',
    verified: false,
    notes: '',
  },
  invoices: {
    method: 'GET',
    path: '/invoices',
    module: 'Comptabilité',
    verified: false,
    notes: 'Doit exposer amount HT/TTC, statut, avoirs liés.',
  },
  payments: {
    method: 'GET',
    path: '/payments',
    module: 'Comptabilité',
    verified: false,
    notes: '',
  },
  credit_notes: {
    method: 'GET',
    path: '/credit-notes',
    module: 'Comptabilité',
    verified: false,
    notes: '',
  },
  projects: {
    method: 'GET',
    path: '/projects',
    module: 'Projets',
    verified: false,
    notes: '',
  },
  contracts: {
    method: 'GET',
    path: '/contracts',
    module: 'Contrat',
    verified: false,
    notes: '',
  },
  staff: {
    method: 'GET',
    path: '/staff',
    module: 'Gestion RH',
    verified: false,
    notes: 'Périmètre agrégé uniquement, cf. docs/02-MATRICE-DROITS.md — pas de détail nominatif RH.',
  },
};

export function resolveVerifiedRoute(resourceKey, { allowUnverified = false } = {}) {
  const entry = CAPABILITY_MAP[resourceKey];
  if (!entry) {
    throw new Error(`Ressource inconnue dans capabilityMap: ${resourceKey}`);
  }
  if (entry.method !== 'GET') {
    // Défense en profondeur : même une future erreur de config ne peut pas activer une écriture.
    throw new Error(`Méthode non lecture refusée pour ${resourceKey}: ${entry.method}`);
  }
  if (!entry.verified && !allowUnverified) {
    throw new Error(
      `Route non vérifiée pour "${resourceKey}" (${entry.path}). ` +
      `Confirmez la route réelle contre la documentation de l'API installée avant activation ` +
      `(voir docs/00-HYPOTHESES-ET-MANQUANTS.md et docs/06-DEPLOIEMENT-ROLLBACK.md).`
    );
  }
  return entry;
}
