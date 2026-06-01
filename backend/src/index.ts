import Fastify from "fastify";
import cors from "@fastify/cors";
import jwt from "@fastify/jwt";
import multipart from "@fastify/multipart";
import statik from "@fastify/static";
import path from "path";
import { fileURLToPath } from "url";
import fs from "fs";
import { env } from "./lib/env.js";
import { authRoutes } from "./routes/auth.js";
import { accessGroupsRoutes } from "./routes/access-groups.js";
import { companiesRoutes } from "./routes/companies.js";
import { usersRoutes } from "./routes/users.js";
import { transactionsRoutes } from "./routes/transactions.js";
import { pendenciesRoutes } from "./routes/pendencies.js";
import { importsRoutes } from "./routes/imports.js";
import { integrationsRoutes } from "./routes/integrations.js";
import { integrationsSettingsRoutes } from "./routes/settings/integrations.js";
import { aiModuleRoutes } from "./modules/ai/routes/ai.routes.js";
import { accountsRoutes } from "./routes/accounts.js";
import { costCentersRoutes } from "./routes/cost-centers.js";
import { chartAccountsRoutes } from "./routes/chart-accounts.js";
import { ledgerRoutes } from "./routes/ledger.js";
import { supportTicketsRoutes } from "./routes/support-tickets.js";
import { departmentsRoutes } from "./routes/departments.js";
import { reportsRoutes } from "./routes/reports.js";
import { reportsExportRoutes } from "./routes/reports-export.js";
import { financialReportsRoutes } from "./routes/financial-reports.js";
import { customersRoutes } from "./routes/canonical/customers.js";
import { suppliersRoutes } from "./routes/canonical/suppliers.js";
import { productsRoutes } from "./routes/canonical/products.js";
import { inventoryRoutes } from "./routes/canonical/inventory.js";
import { apTitlesRoutes } from "./routes/canonical/ap-titles.js";
import { arTitlesRoutes } from "./routes/canonical/ar-titles.js";
import { salesRoutes } from "./routes/canonical/sales.js";
import { saleItemsRoutes } from "./routes/canonical/sale-items.js";
import { paymentMethodsRoutes } from "./routes/canonical/payment-methods.js";
import { sellersRoutes } from "./routes/canonical/sellers.js";
import { cashiersRoutes } from "./routes/canonical/cashiers.js";
import { geoRoutes } from "./routes/geo.js";
import { startSyncService } from "./services/sync.js";
import { insightsService } from "./modules/ai/services/insights.service.js";
import { queueService } from "./modules/ai/services/queue.service.js";
import { telegramRoutes } from "./routes/telegram.js";
import { telegramBotsRoutes } from "./routes/telegram-bots.js";
import { startPolling } from "./services/telegram.service.js";
import { routinesRoutes } from "./routes/routines.js";
import { routineRecipientsRoutes } from "./routes/routine-recipients.js";
import { publicReportsRoutes } from "./routes/public-reports.js";
import { supportShareRoutes, publicSupportRoutes } from "./routes/support-share.js";
import { startRoutineScheduler } from "./services/routine-scheduler.js";
import { categoriesRoutes } from "./routes/categories.js";
import { financeHubRoutes } from "./routes/financehub.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export function buildApp() {
  const app = Fastify({
    logger: true,
  });

  // Security headers on every response
  app.addHook("onSend", async (_request, reply) => {
    reply.header("X-Content-Type-Options", "nosniff");
    reply.header("X-Frame-Options", "DENY");
    reply.header("X-XSS-Protection", "1; mode=block");
    reply.header("Referrer-Policy", "strict-origin-when-cross-origin");
    reply.header("Permissions-Policy", "camera=(), microphone=(), geolocation=()");
  });

  app.setErrorHandler((error, request, reply) => {
    const maybeStatus = (error as { statusCode?: unknown }).statusCode;
    const isZod = typeof (error as { name?: unknown }).name === "string" && (error as { name: string }).name === "ZodError";
    const statusCode = typeof maybeStatus === "number" ? maybeStatus : (isZod ? 400 : 500);
    const message = error instanceof Error ? error.message : "ERROR";
    const payload: Record<string, unknown> = { error: message };
    if (env.NODE_ENV !== "production" && error instanceof Error) {
      payload.stack = error.stack ?? null;
      payload.name = error.name ?? null;
    }
    request.log.error({ err: error, msg: message });
    reply.status(statusCode).send(payload);
  });

  app.register(cors, {
    origin:
      env.NODE_ENV !== "production"
        ? true
        : (origin, cb) => {
            if (!origin) return cb(null, true);
            const allowed = new Set([
              env.FRONTEND_ORIGIN,
              "http://localhost:3000",
              "http://127.0.0.1:3000",
            ]);
            cb(null, allowed.has(origin));
          },
    credentials: true,
  });

  app.register(jwt, {
    secret: env.JWT_SECRET,
  });

  app.register(multipart, {
    limits: {
      fileSize: 25 * 1024 * 1024,
    },
  });

  const uploadsDir = path.resolve(__dirname, "..", "uploads");
  fs.mkdirSync(uploadsDir, { recursive: true });
  app.register(statik, {
    root: uploadsDir,
    prefix: "/uploads/",
    decorateReply: false,
  });

  app.get("/health", async () => ({ ok: true }));

  app.register(authRoutes, { prefix: "/auth" });
  app.register(companiesRoutes, { prefix: "/companies" });
  app.register(usersRoutes, { prefix: "/users" });
  app.register(transactionsRoutes, { prefix: "/transactions" });
  app.register(pendenciesRoutes, { prefix: "/pendencies" });
  app.register(importsRoutes, { prefix: "/imports" });
  app.register(integrationsRoutes, { prefix: "/integrations" });
  app.register(customersRoutes, { prefix: "/customers" });
  app.register(suppliersRoutes, { prefix: "/suppliers" });
  app.register(productsRoutes, { prefix: "/products" });
  app.register(inventoryRoutes, { prefix: "/inventory" });
  app.register(geoRoutes, { prefix: "/geo" });
  app.register(apTitlesRoutes, { prefix: "/ap-titles" });
  app.register(arTitlesRoutes, { prefix: "/ar-titles" });
  app.register(salesRoutes, { prefix: "/sales" });
  app.register(saleItemsRoutes, { prefix: "/sale-items" });
  app.register(paymentMethodsRoutes, { prefix: "/payment-methods" });
  app.register(sellersRoutes, { prefix: "/sellers" });
  app.register(cashiersRoutes, { prefix: "/cashiers" });
  app.register(aiModuleRoutes, { prefix: "/ai" });

  app.register(accountsRoutes, { prefix: "/accounts" });
  app.register(costCentersRoutes, { prefix: "/cost-centers" });
  app.register(chartAccountsRoutes, { prefix: "/chart-accounts" });
  app.register(ledgerRoutes, { prefix: "/ledger" });
  app.register(categoriesRoutes, { prefix: "/categories" });
  app.register(financeHubRoutes, { prefix: "/financehub" });
  app.register(supportTicketsRoutes, { prefix: "/support-tickets" });
  app.register(departmentsRoutes, { prefix: "/departments" });
  app.register(reportsRoutes, { prefix: "/reports" });
  app.register(reportsExportRoutes, { prefix: "/reports/export" });
  app.register(financialReportsRoutes, { prefix: "/financial-reports" });

  app.register(integrationsSettingsRoutes, { prefix: "/settings/integrations" });
  app.register(accessGroupsRoutes, { prefix: "/access-groups" });
  app.register(telegramRoutes, { prefix: "/telegram" });
  app.register(telegramBotsRoutes, { prefix: "/telegram-bots" });
  app.register(routinesRoutes, { prefix: "/routines" });
  app.register(routineRecipientsRoutes, { prefix: "/routine-recipients" });
  app.register(publicReportsRoutes, { prefix: "/public-reports" });
  app.register(supportShareRoutes,  { prefix: "/support-share" });
  app.register(publicSupportRoutes, { prefix: "/public-support" });

  startSyncService();
  startPolling();
  startRoutineScheduler();

  // Register Queue Handlers
  queueService.registerHandler("INSIGHTS_GENERATION", async (job) => {
    const payload = JSON.parse(job.payload);
    console.log(`[Worker] Generating insights for company ${payload.companyId}`);
    await insightsService.runInsightEngine(payload.companyId);
  });

  return app;
}
