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
import { aiRoutes } from "./routes/ai";
import { accountsRoutes } from "./routes/accounts";
import { costCentersRoutes } from "./routes/cost-centers";
import { chartAccountsRoutes } from "./routes/chart-accounts";
import { ledgerRoutes } from "./routes/ledger";
import { reportsRoutes } from "./routes/reports";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export function buildApp() {
  const app = Fastify({
    logger: true,
  });

  app.setErrorHandler((error, _request, reply) => {
    const statusCode = (error as any).statusCode ?? 500;
    const message = statusCode === 500 ? "INTERNAL_SERVER_ERROR" : (error as any).message;
    reply.status(statusCode).send({ error: message });
  });

  app.register(cors, {
    origin: (origin, cb) => {
      if (!origin) return cb(null, true);
      const allowed = new Set([env.FRONTEND_ORIGIN, "http://localhost:5173", "http://127.0.0.1:5173", "http://localhost:8080", "http://127.0.0.1:8080"]);
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
  app.register(aiRoutes, { prefix: "/ai" });

  app.register(accountsRoutes, { prefix: "/accounts" });
  app.register(costCentersRoutes, { prefix: "/cost-centers" });
  app.register(chartAccountsRoutes, { prefix: "/chart-accounts" });
  app.register(ledgerRoutes, { prefix: "/ledger" });
  app.register(reportsRoutes, { prefix: "/reports" });

  return app;
}
