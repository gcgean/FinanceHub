import { afterAll, beforeAll, describe, expect, it } from "vitest";

process.env.DATABASE_URL = process.env.DATABASE_URL ?? "postgresql://financehub:financehub@127.0.0.1:5432/financehub?schema=public";
process.env.JWT_SECRET = process.env.JWT_SECRET ?? "test_secret_1234567890";
process.env.FRONTEND_ORIGIN = process.env.FRONTEND_ORIGIN ?? "http://127.0.0.1:5173";

let app: any;

async function login(email: string, password: string) {
  const res = await app.inject({
    method: "POST",
    url: "/auth/login",
    payload: { email, password },
  });
  expect(res.statusCode).toBe(200);
  const json = res.json();
  expect(json.token).toBeTruthy();
  return json as { token: string; user: { id: string; role: string; companyId: string | null } };
}

function authHeaders(token: string, companyId: string | null) {
  return {
    authorization: `Bearer ${token}`,
    ...(companyId ? { "x-company-id": companyId } : {}),
  };
}

beforeAll(async () => {
  const mod = await import("./index");
  app = mod.buildApp();
  await app.ready();
});

afterAll(async () => {
  await app.close();
});

describe("Backend routes (integration)", () => {
  it("health", async () => {
    const res = await app.inject({ method: "GET", url: "/health" });
    expect(res.statusCode).toBe(200);
    expect(res.json()).toEqual({ ok: true });
  });

  it("auth + companies", async () => {
    const { token, user } = await login("admin@financehub.local", "admin123");
    const headers = authHeaders(token, user.companyId);

    const me = await app.inject({ method: "GET", url: "/auth/me", headers });
    expect(me.statusCode).toBe(200);
    expect(me.json().id).toBeTruthy();

    const companyMe = await app.inject({ method: "GET", url: "/companies/me", headers });
    expect(companyMe.statusCode).toBe(200);
    expect(companyMe.json()).toHaveProperty("company");

    const companies = await app.inject({ method: "GET", url: "/companies", headers });
    expect(companies.statusCode).toBe(200);
    expect(Array.isArray(companies.json().items)).toBe(true);
  });

  it("accounts + cost centers + chart accounts", async () => {
    const { token, user } = await login("admin@financehub.local", "admin123");
    const headers = authHeaders(token, user.companyId);

    const uniq = String(Date.now());

    const types = await app.inject({ method: "GET", url: "/accounts/types", headers });
    expect(types.statusCode).toBe(200);
    expect(Array.isArray(types.json())).toBe(true);

    const createdAcc = await app.inject({
      method: "POST",
      url: "/accounts",
      headers,
      payload: { code: `A${uniq}`, description: "Conta Teste", accountTypeId: null, active: true },
    });
    expect(createdAcc.statusCode).toBe(200);
    const accJson = createdAcc.json();
    expect(accJson.typeDescription).not.toBeUndefined();
    expect(accJson.balance).not.toBeUndefined();

    const updatedAcc = await app.inject({
      method: "PATCH",
      url: `/accounts/${accJson.id}`,
      headers,
      payload: { description: "Conta Teste 2" },
    });
    expect(updatedAcc.statusCode).toBe(200);
    expect(updatedAcc.json().description).toBe("Conta Teste 2");
    expect(updatedAcc.json().balance).not.toBeUndefined();

    const cc = await app.inject({
      method: "POST",
      url: "/cost-centers",
      headers,
      payload: { code: `CC${uniq.slice(-6)}`, description: "Centro Teste", active: true },
    });
    expect(cc.statusCode).toBe(200);

    const caRoot = await app.inject({
      method: "POST",
      url: "/chart-accounts",
      headers,
      payload: {
        code: "9",
        description: "Grupo Teste",
        planType: "SINTETICA",
        revenueExpense: "RECEITA",
        debitCredit: "CREDITO",
        fixedVariable: "VARIAVEL",
        costExpense: "DESPESA",
        active: true,
      },
    });
    expect(caRoot.statusCode).toBe(200);
    const caRootJson = caRoot.json();

    const caChild = await app.inject({
      method: "POST",
      url: "/chart-accounts",
      headers,
      payload: {
        code: "9.01",
        description: "Conta Analítica Teste",
        planType: "ANALITICA",
        parentId: caRootJson.id,
        revenueExpense: "RECEITA",
        debitCredit: "CREDITO",
        fixedVariable: "VARIAVEL",
        costExpense: "DESPESA",
        active: true,
      },
    });
    expect(caChild.statusCode).toBe(200);
  });

  it("ledger + reports", async () => {
    const { token, user } = await login("admin@financehub.local", "admin123");
    const headers = authHeaders(token, user.companyId);

    const accountsRes = await app.inject({ method: "GET", url: "/accounts", headers });
    expect(accountsRes.statusCode).toBe(200);
    const firstAccount = accountsRes.json()[0];
    expect(firstAccount?.id).toBeTruthy();

    const chartAccountsRes = await app.inject({ method: "GET", url: "/chart-accounts?includeGlobal=true", headers });
    expect(chartAccountsRes.statusCode).toBe(200);
    const firstChart = chartAccountsRes.json().find((x: any) => x.planType === "ANALITICA") ?? chartAccountsRes.json()[0];
    expect(firstChart?.id).toBeTruthy();

    const ledgerCreate = await app.inject({
      method: "POST",
      url: "/ledger",
      headers,
      payload: {
        issueDate: "2026-02-01",
        accountId: firstAccount.id,
        amount: 10.5,
        operation: "CREDITO",
        history: "Teste",
        confirmed: false,
        splits: [{ chartAccountId: firstChart.id, splitAmount: 10.5 }],
      },
    });
    expect(ledgerCreate.statusCode).toBe(201);
    const entry = ledgerCreate.json();

    const ledgerList = await app.inject({ method: "GET", url: "/ledger?withSplits=true", headers });
    expect(ledgerList.statusCode).toBe(200);
    expect(Array.isArray(ledgerList.json())).toBe(true);

    const confirm = await app.inject({
      method: "POST",
      url: `/ledger/${entry.id}/confirm`,
      headers,
      payload: { confirmed: true },
    });
    expect(confirm.statusCode).toBe(200);
    expect(confirm.json().confirmed).toBe(true);

    const statement = await app.inject({ method: "GET", url: "/reports/statement?dateFrom=2026-01-01&dateTo=2026-12-31", headers });
    expect(statement.statusCode).toBe(200);
    expect(Array.isArray(statement.json().items)).toBe(true);

    const dre = await app.inject({
      method: "POST",
      url: "/reports/dre/run",
      headers,
      payload: { dateFrom: "2026-01-01", dateTo: "2026-12-31" },
    });
    expect(dre.statusCode).toBe(200);
    expect(Array.isArray(dre.json().listagem)).toBe(true);
    const firstLine = dre.json().listagem[0];
    expect(firstLine.id).toBeTruthy();
    expect(firstLine.revenueExpense).toBeTruthy();

    const del = await app.inject({ method: "DELETE", url: `/ledger/${entry.id}`, headers });
    expect(del.statusCode).toBe(200);
  });

  it("transactions + pendencies + imports + ai", async () => {
    const { token, user } = await login("admin@financehub.local", "admin123");
    const headers = authHeaders(token, user.companyId);

    const txCreated = await app.inject({
      method: "POST",
      url: "/transactions",
      headers,
      payload: {
        date: "2026-02-01",
        description: "Venda teste",
        value: 123.45,
        type: "REVENUE",
        category: "Vendas",
        categoryConfidence: 80,
        account: "Banco",
        status: "NEW",
        costCenter: null,
        attachmentUrl: null,
        notes: null,
      },
    });
    expect(txCreated.statusCode).toBe(200);
    const tx = txCreated.json();

    const txList = await app.inject({ method: "GET", url: "/transactions?take=10", headers });
    expect(txList.statusCode).toBe(200);
    expect(Array.isArray(txList.json().items)).toBe(true);

    const pendCreated = await app.inject({
      method: "POST",
      url: "/pendencies",
      headers,
      payload: {
        transactionId: tx.id,
        type: "APPROVAL",
        question: "Aprovar lançamento?",
        priority: "LOW",
        status: "PENDING",
        assignedTo: "Operação",
        dueAt: "2026-02-10",
      },
    });
    expect(pendCreated.statusCode).toBe(200);
    const pend = pendCreated.json();

    const pendList = await app.inject({ method: "GET", url: "/pendencies", headers });
    expect(pendList.statusCode).toBe(200);
    expect(Array.isArray(pendList.json().items)).toBe(true);

    const pendResolve = await app.inject({
      method: "POST",
      url: `/pendencies/${pend.id}/resolve`,
      headers,
      payload: { response: "OK", resolvedBy: user.id },
    });
    expect(pendResolve.statusCode).toBe(200);

    const importApi = await app.inject({
      method: "POST",
      url: "/imports/api",
      headers,
      payload: { provider: "test", credentialsRef: "ref" },
    });
    expect(importApi.statusCode).toBe(200);

    const imports = await app.inject({ method: "GET", url: "/imports", headers });
    expect(imports.statusCode).toBe(200);
    expect(Array.isArray(imports.json().items)).toBe(true);

    const ai1 = await app.inject({ method: "GET", url: "/ai/predictive-metrics", headers });
    expect(ai1.statusCode).toBe(200);
    const ai2 = await app.inject({ method: "GET", url: "/ai/insights", headers });
    expect(ai2.statusCode).toBe(200);
  });
});
