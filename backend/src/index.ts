import Fastify from "fastify";
import cors from "@fastify/cors";
import jwt from "@fastify/jwt";
import multipart from "@fastify/multipart";
import statik from "@fastify/static";
import path from "path";
import { fileURLToPath } from "url";
import fs from "fs";
import { env } from "./lib/env";
import { authRoutes } from "./routes/auth";
import { companiesRoutes } from "./routes/companies";
import { usersRoutes } from "./routes/users";
import { transactionsRoutes } from "./routes/transactions";
import { pendenciesRoutes } from "./routes/pendencies";
import { importsRoutes } from "./routes/imports";
import { integrationsRoutes } from "./routes/integrations";
import { integrationsSettingsRoutes } from "./routes/settings/integrations";
import { aiRoutes } from "./routes/ai";
import { accountsRoutes } from "./routes/accounts";
import { costCentersRoutes } from "./routes/cost-centers";
import { chartAccountsRoutes } from "./routes/chart-accounts";
import { ledgerRoutes } from "./routes/ledger";
import { reportsRoutes } from "./routes/reports";
import { reportsExportRoutes } from "./routes/reports-export";
import { customersRoutes } from "./routes/canonical/customers";
import { suppliersRoutes } from "./routes/canonical/suppliers";
import { productsRoutes } from "./routes/canonical/products";
import { inventoryRoutes } from "./routes/canonical/inventory";
import { apTitlesRoutes } from "./routes/canonical/ap-titles";
import { arTitlesRoutes } from "./routes/canonical/ar-titles";
import { salesRoutes } from "./routes/canonical/sales";
import { saleItemsRoutes } from "./routes/canonical/sale-items";
import { paymentMethodsRoutes } from "./routes/canonical/payment-methods";
import { geoRoutes } from "./routes/geo";
import { startSyncService } from "./services/sync";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export function buildApp() {
  const app = Fastify({
    logger: true,
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
    origin: (origin, cb) => {
      if (!origin) return cb(null, true);
      const allowed = new Set([
        env.FRONTEND_ORIGIN,
        "http://localhost:5173",
        "http://127.0.0.1:5173",
        "http://localhost:8080",
        "http://127.0.0.1:8080",
        "http://localhost:8081",
        "http://127.0.0.1:8081",
        "http://localhost:8082",
        "http://127.0.0.1:8082",
        "http://localhost:8083",
        "http://127.0.0.1:8083",
        "http://localhost:8084",
        "http://127.0.0.1:8084",
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
  app.register(aiRoutes, { prefix: "/ai" });

  app.register(accountsRoutes, { prefix: "/accounts" });
  app.register(costCentersRoutes, { prefix: "/cost-centers" });
  app.register(chartAccountsRoutes, { prefix: "/chart-accounts" });
  app.register(ledgerRoutes, { prefix: "/ledger" });
  app.register(reportsRoutes, { prefix: "/reports" });
  app.register(reportsExportRoutes, { prefix: "/reports/export" });

  app.register(integrationsSettingsRoutes, { prefix: "/settings/integrations" });

  startSyncService();

  return app;
}
