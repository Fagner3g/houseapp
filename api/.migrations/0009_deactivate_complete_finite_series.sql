-- Data migration: desativa séries finitas (installments_total IS NOT NULL)
-- que já estão totalmente pagas mas ainda têm active = true.
--
-- Espelha deactivateSeriesIfComplete: sem pending/partial e
-- count(paid) >= installments_total.
--
-- Seguro rodar múltiplas vezes (WHERE s.active = true impede re-aplicação).

UPDATE transactions_series s
SET active = false, updated_at = now()
WHERE s.active = true
  AND s.installments_total IS NOT NULL
  AND NOT EXISTS (
    SELECT 1
    FROM transactions_occurrences o
    WHERE o.series_id = s.id
      AND o.status IN ('pending', 'partial')
  )
  AND (
    SELECT count(*)::int
    FROM transactions_occurrences o
    WHERE o.series_id = s.id
      AND o.status = 'paid'
  ) >= s.installments_total;
