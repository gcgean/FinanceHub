-- Suporte ao provedor DeepSeek e escolha explicita do modelo de IA.
-- Ambos opcionais: NULL em aiModel mantem o modelo padrao de cada provedor.
ALTER TABLE "Company" ADD COLUMN IF NOT EXISTS "aiModel" TEXT;
ALTER TABLE "Company" ADD COLUMN IF NOT EXISTS "deepseekApiKey" TEXT;
