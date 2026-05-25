-- Passo 1: Remover duplicatas de SupportTicket por protocolo
-- Para cada (companyId, protocolo) com mais de 1 registro, mantém apenas o
-- que tem maior externalId (importação mais recente do Analytics).
DELETE FROM "SupportTicket"
WHERE id IN (
  SELECT id FROM (
    SELECT
      id,
      ROW_NUMBER() OVER (
        PARTITION BY "companyId", protocolo
        ORDER BY "externalId" DESC
      ) AS rn
    FROM "SupportTicket"
    WHERE protocolo IS NOT NULL AND protocolo <> ''
  ) ranked
  WHERE rn > 1
);

-- Passo 2: Índice único parcial em (companyId, protocolo) — apenas onde protocolo não é nulo/vazio.
-- Isso impede futuras duplicatas no banco sem afetar tickets sem protocolo.
CREATE UNIQUE INDEX "SupportTicket_companyId_protocolo_key"
  ON "SupportTicket" ("companyId", protocolo)
  WHERE protocolo IS NOT NULL AND protocolo <> '';
