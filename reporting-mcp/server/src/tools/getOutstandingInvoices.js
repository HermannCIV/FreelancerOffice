import { normalizeInvoiceRecord } from '../normalizers.js';

export const getOutstandingInvoicesToolDefinition = {
  name: 'get_outstanding_invoices',
  description:
    'Liste paginée des factures impayées (unpaid/partially_paid/overdue) triées par ancienneté décroissante. ' +
    'Page bornée (voir docs/04-LIMITES-DE-CHARGE.md).',
  inputSchema: {
    type: 'object',
    properties: {
      page: { type: 'integer', minimum: 1, default: 1 },
    },
    additionalProperties: false,
  },
};

export function makeGetOutstandingInvoices({ config, perfexClient, logger }) {
  return async function getOutstandingInvoices(input, { tenantScopeId }) {
    const page = Number.isInteger(input?.page) && input.page > 0 ? input.page : 1;

    const raw = await perfexClient.get('invoices', {
      status: 'unpaid,partially_paid,overdue',
      sort: 'due_date_asc',
      page,
      limit: config.limits.pageSizeMax,
      tenant: tenantScopeId,
    });

    const records = (raw.data || []).map(normalizeInvoiceRecord).map((invoice) => ({
      invoice_id: invoice.id,
      issue_date: invoice.issue_date,
      due_date: invoice.due_date,
      amount_ht: invoice.amount_ht ?? null,
      amount_ttc: invoice.amount_ttc ?? null,
      paid_to_date: invoice.paid_to_date ?? 0,
      balance_due:
        invoice.amount_ttc !== undefined
          ? Math.max(invoice.amount_ttc - (invoice.paid_to_date ?? 0), 0)
          : null,
      status: invoice.status,
    }));

    logger.info({ tool: 'get_outstanding_invoices', recordCount: records.length, pagesFetched: page });

    return {
      currency: config.reportCurrency,
      generated_at: new Date().toISOString(),
      page,
      page_size: config.limits.pageSizeMax,
      has_more: Boolean(raw.has_more),
      invoices: records,
    };
  };
}
