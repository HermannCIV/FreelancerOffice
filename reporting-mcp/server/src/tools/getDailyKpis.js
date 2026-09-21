import { fetchAllPages, aggregateInvoices, buildIndicatorResponse } from '../totals.js';
import { normalizeInvoiceRecord } from '../normalizers.js';
import { validateDateRange } from '../dateRange.js';

export const getDailyKpisToolDefinition = {
  name: 'get_daily_kpis',
  description:
    'Indicateurs agrégés (CA HT/TTC, paiements, impayés) sur une période bornée (≤ 31 jours par défaut). ' +
    'Ne calcule jamais un total sur une pagination incomplète : renvoie status="incomplete" le cas échéant.',
  inputSchema: {
    type: 'object',
    properties: {
      from: { type: 'string', description: 'AAAA-MM-JJ' },
      to: { type: 'string', description: 'AAAA-MM-JJ' },
    },
    required: ['from', 'to'],
    additionalProperties: false,
  },
};

export function makeGetDailyKpis({ config, perfexClient, logger }) {
  return async function getDailyKpis(input, { tenantScopeId }) {
    const range = validateDateRange(input, { maxRangeDays: config.limits.maxRangeDays });

    const invoicesFetch = await fetchAllPages({
      maxPages: config.limits.maxPagesPerQuery,
      fetchPage: async (pageIndex) => {
        const raw = await perfexClient.get('invoices', {
          date_from: range.from,
          date_to: range.to,
          page: pageIndex + 1,
          limit: config.limits.pageSizeMax,
          tenant: tenantScopeId,
        });
        return { records: (raw.data || []).map(normalizeInvoiceRecord), hasMore: Boolean(raw.has_more) };
      },
    });

    const aggregate = invoicesFetch.coverage.complete
      ? aggregateInvoices(invoicesFetch.records, { currency: config.reportCurrency })
      : null;

    logger.info({ tool: 'get_daily_kpis', recordCount: invoicesFetch.records.length, pagesFetched: invoicesFetch.coverage.pagesFetched });

    return buildIndicatorResponse({
      coverage: invoicesFetch.coverage,
      aggregate,
      period: { from: range.from, to: range.to },
      timezone: config.reportTimezone,
      currency: config.reportCurrency,
      generatedAt: new Date().toISOString(),
      dataAsOf: 'unavailable', // à renseigner une fois l'API confirmée exposer un horodatage de fraîcheur.
    });
  };
}
