import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

import { aggregateInvoices, buildIndicatorResponse } from '../src/totals.js';

const fixturesDir = path.join(path.dirname(fileURLToPath(import.meta.url)), 'fixtures');
const invoices = JSON.parse(readFileSync(path.join(fixturesDir, 'invoices.fixture.json'), 'utf8'));

test('aggregateInvoices calcule HT/TTC/paiements/impayés de façon déterministe', () => {
  const result = aggregateInvoices(invoices, { currency: 'XOF' });

  assert.equal(result.invoiced_ht, 430000, 'HT: cancelled/draft/EUR/incomplète doivent être exclues');
  assert.equal(result.invoiced_ttc, 507400);
  assert.equal(result.paid_total, 312400);
  assert.equal(result.outstanding_total, 195000, 'impayés = unpaid + solde restant des partially_paid/overdue');
  assert.equal(result.credit_notes_total, 20000);
  assert.equal(result.net_ttc, 487400, 'net_ttc = invoiced_ttc - credit_notes_total');
  assert.equal(result.cancelled_count, 1);
  assert.equal(result.draft_count, 1);
  assert.equal(result.incomplete_line_count, 1, 'INV-008 sans amount_ht doit être comptée incomplète, pas ignorée silencieusement');
});

test('aggregateInvoices exclut une devise différente et le signale en avertissement, jamais en conversion silencieuse', () => {
  const result = aggregateInvoices(invoices, { currency: 'XOF' });
  const eurWarning = result.warnings.find((w) => w.code === 'currency_mismatch' && w.invoice_id === 'INV-007');
  assert.ok(eurWarning, 'la facture EUR doit apparaître dans warnings, pas dans les totaux XOF');
});

test('aggregateInvoices sur une liste vide renvoie des zéros réels, pas "indisponible"', () => {
  const result = aggregateInvoices([], { currency: 'XOF' });
  assert.equal(result.invoiced_ht, 0);
  assert.equal(result.invoiced_ttc, 0);
  assert.deepEqual(result.warnings, []);
});

test('buildIndicatorResponse: couverture complète => status ok avec les valeurs', () => {
  const aggregate = aggregateInvoices(invoices, { currency: 'XOF' });
  const response = buildIndicatorResponse({
    coverage: { pagesFetched: 1, complete: true },
    aggregate,
    period: { from: '2026-09-01', to: '2026-09-01' },
    timezone: 'Africa/Abidjan',
    currency: 'XOF',
    generatedAt: '2026-09-21T07:00:00.000Z',
    dataAsOf: '2026-09-21T06:55:00.000Z',
  });
  assert.equal(response.status, 'ok');
  assert.equal(response.values.invoiced_ht, 430000);
  assert.equal(response.currency, 'XOF');
});

test('buildIndicatorResponse: couverture incomplète => status incomplete, values=null, jamais un total partiel', () => {
  const response = buildIndicatorResponse({
    coverage: { pagesFetched: 3, complete: false },
    aggregate: null,
    period: { from: '2026-09-01', to: '2026-09-30' },
    timezone: 'Africa/Abidjan',
    currency: 'XOF',
    generatedAt: '2026-09-21T07:00:00.000Z',
    dataAsOf: null,
  });
  assert.equal(response.status, 'incomplete');
  assert.equal(response.values, null, 'un total ne doit jamais être calculé sur une pagination incomplète');
  assert.ok(response.reason);
});
