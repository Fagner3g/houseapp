-- Data migration: ajusta start_date de transações recorrentes existentes
-- para alinhar com a nova lógica: start_date = data do contrato/compra,
-- primeira parcela = start_date + 1 período.
--
-- Antes: start_date era a data da 1ª parcela (lógica antiga)
-- Depois: start_date recua 1 período para ser a data do contrato
--
-- As ocorrências existentes NÃO são alteradas — apenas o start_date muda.
-- O número de parcelas e os índices continuam os mesmos.
--
-- Seguro rodar múltiplas vezes (WHERE impede re-aplicação).

UPDATE transactions_series s
SET 
  start_date = CASE s.recurrence_type
    WHEN 'monthly' THEN s.start_date - INTERVAL '1 month'
    WHEN 'weekly'  THEN s.start_date - INTERVAL '7 days'
    WHEN 'yearly'  THEN s.start_date - INTERVAL '1 year'
    ELSE s.start_date
  END,
  updated_at = now()
FROM transactions_occurrences o
WHERE o.series_id = s.id
  AND o.installment_index = 1
  AND s.start_date::date = o.due_date::date
  AND (s.installments_total > 1 OR s.installments_total IS NULL)
  AND s.recurrence_type IN ('monthly', 'weekly', 'yearly');
