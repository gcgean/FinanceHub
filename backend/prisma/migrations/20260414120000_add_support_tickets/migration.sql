-- CreateTable
CREATE TABLE "SupportTicket" (
    "id" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "externalId" INTEGER NOT NULL,
    "codCli" INTEGER,
    "obsAtendimento" TEXT,
    "cidRes" TEXT,
    "dataCadastroCliente" TIMESTAMP(3),
    "solucao" TEXT,
    "dataHoraAtendimento" TIMESTAMP(3),
    "dataHoraFinalizacao" TIMESTAMP(3),
    "nota" DOUBLE PRECISION,
    "departamento" TEXT,
    "protocolo" TEXT,
    "nomeClienteAtendimento" TEXT,
    "tempoAtendimento" TEXT,
    "numeroCliente" TEXT,
    "nomeCli" TEXT,
    "usuLanc" TEXT,
    "usuConfEnc" TEXT,
    "usuAtend" TEXT,
    "nomeDesenvolvedor" TEXT,
    "horaAtendimento" TEXT,
    "pontoRevenda" TEXT,
    "codigosProcedimento" TEXT,
    "nomesProcedimento" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SupportTicket_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "SupportTicket_companyId_idx" ON "SupportTicket"("companyId");

-- CreateIndex
CREATE INDEX "SupportTicket_dataHoraAtendimento_idx" ON "SupportTicket"("dataHoraAtendimento");

-- CreateIndex
CREATE UNIQUE INDEX "SupportTicket_companyId_externalId_key" ON "SupportTicket"("companyId", "externalId");

-- AddForeignKey
ALTER TABLE "SupportTicket" ADD CONSTRAINT "SupportTicket_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
