ALTER TABLE "public"."Company"
  ADD COLUMN "nextOsSequence" INTEGER NOT NULL DEFAULT 1;

-- Repadding das OSs existentes de 4 para 5 dígitos
UPDATE "public"."ServiceOrder"
  SET number = regexp_replace(
    number,
    '^(OS-\d{4}-)(\d{4})$',
    '\1' || lpad(substring(number from 9 for 4), 5, '0')
  )
  WHERE number ~ '^OS-\d{4}-\d{4}$';

-- Repadding dos recebíveis que usam número de OS como descrição
UPDATE "public"."AccountReceivable"
  SET description = regexp_replace(
    description,
    '^(OS-\d{4}-)(\d{4})$',
    '\1' || lpad(substring(description from 9 for 4), 5, '0')
  )
  WHERE description ~ '^OS-\d{4}-\d{4}$';

-- Repadding das descrições de itens de fechamento que referenciam OS
UPDATE "public"."ServiceOrderItem"
  SET description = regexp_replace(
    description,
    'OS-(\d{4})-(\d{4})',
    'OS-\1-0\2',
    'g'
  )
  WHERE description ~ 'OS-\d{4}-\d{4}';
