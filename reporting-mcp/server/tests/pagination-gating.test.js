import test from 'node:test';
import assert from 'node:assert/strict';

import { fetchAllPages } from '../src/totals.js';

test('fetchAllPages: toutes les pages OK => complete=true et tous les enregistrements présents', async () => {
  const pages = [
    { records: [{ id: 1 }, { id: 2 }], hasMore: true },
    { records: [{ id: 3 }], hasMore: false },
  ];
  const result = await fetchAllPages({
    maxPages: 10,
    fetchPage: async (pageIndex) => pages[pageIndex],
  });
  assert.equal(result.coverage.complete, true);
  assert.equal(result.coverage.pagesFetched, 2);
  assert.equal(result.records.length, 3);
});

test('fetchAllPages: une page échoue => complete=false, jamais une exception qui remonte au total', async () => {
  const result = await fetchAllPages({
    maxPages: 10,
    fetchPage: async (pageIndex) => {
      if (pageIndex === 0) return { records: [{ id: 1 }], hasMore: true };
      throw new Error('panne réseau simulée');
    },
  });
  assert.equal(result.coverage.complete, false, 'une page en échec doit marquer la couverture incomplète');
  assert.equal(result.records.length, 1, 'les enregistrements déjà récupérés restent disponibles pour diagnostic, mais ne doivent pas être utilisés pour un total (voir buildIndicatorResponse)');
});

test('fetchAllPages: plafond de pages atteint alors qu\'il reste des données => complete=false', async () => {
  const result = await fetchAllPages({
    maxPages: 2,
    fetchPage: async () => ({ records: [{ id: 'x' }], hasMore: true }),
  });
  assert.equal(result.coverage.pagesFetched, 2);
  assert.equal(result.coverage.complete, false, 'le plafond MAX_PAGES_PER_QUERY doit empêcher un calcul faussement complet');
});

test('fetchAllPages: aucune donnée mais hasMore=false dès la première page => complete=true, 0 enregistrement', async () => {
  const result = await fetchAllPages({
    maxPages: 10,
    fetchPage: async () => ({ records: [], hasMore: false }),
  });
  assert.equal(result.coverage.complete, true);
  assert.equal(result.records.length, 0);
});
