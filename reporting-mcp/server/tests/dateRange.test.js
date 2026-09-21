import test from 'node:test';
import assert from 'node:assert/strict';

import { validateDateRange, InvalidRangeError } from '../src/dateRange.js';

test('validateDateRange accepte une plage valide dans la limite', () => {
  const range = validateDateRange({ from: '2026-09-01', to: '2026-09-07' }, { maxRangeDays: 31 });
  assert.equal(range.rangeDays, 7);
});

test('validateDateRange refuse une plage dépassant le maximum (pas de troncature silencieuse)', () => {
  assert.throws(
    () => validateDateRange({ from: '2026-01-01', to: '2026-12-31' }, { maxRangeDays: 31 }),
    InvalidRangeError
  );
});

test('validateDateRange refuse from > to', () => {
  assert.throws(
    () => validateDateRange({ from: '2026-09-10', to: '2026-09-01' }, { maxRangeDays: 31 }),
    InvalidRangeError
  );
});

test('validateDateRange refuse un format de date invalide', () => {
  assert.throws(
    () => validateDateRange({ from: '01/09/2026', to: '2026-09-07' }, { maxRangeDays: 31 }),
    InvalidRangeError
  );
});
