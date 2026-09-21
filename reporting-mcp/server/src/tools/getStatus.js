import { CAPABILITY_MAP } from '../capabilityMap.js';

export const getStatusToolDefinition = {
  name: 'get_status',
  description:
    "État du connecteur : modules disponibles (route vérifiée ou non), fraîcheur non garantie tant que non vérifié, périmètre société actif pour le jeton courant. Aucun paramètre.",
  inputSchema: { type: 'object', properties: {}, additionalProperties: false },
};

export function makeGetStatus({ config }) {
  return async function getStatus(_input, { tenantScopeId }) {
    const modules = Object.entries(CAPABILITY_MAP).map(([key, entry]) => ({
      resource: key,
      module: entry.module,
      verified: entry.verified,
    }));

    return {
      tenant_scope_id: tenantScopeId,
      currency: config.reportCurrency,
      timezone: config.reportTimezone,
      modules,
      note:
        modules.some((m) => !m.verified)
          ? 'Au moins un module a une route non vérifiée : les outils qui en dépendent renverront status="unavailable" tant qu\'elle ne sera pas confirmée et activée (voir docs/00 et docs/06).'
          : 'Toutes les routes déclarées sont marquées vérifiées.',
    };
  };
}
