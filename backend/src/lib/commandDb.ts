/**
 * Command System — SQL Server direct connector
 *
 * The Integration record must be configured like this:
 *   erp:    "command"
 *   apiUrl: "Server=HOST,PORT;Database=DBNAME"
 *   apiKey: "USER:PASSWORD"
 *
 * Example:
 *   apiUrl = "Server=192.168.1.10,1433;Database=CommandDB"
 *   apiKey  = "sa:MinhaS3nha"
 */

import sql from "mssql";

// Reuse a single connection pool per process
const pools = new Map<string, sql.ConnectionPool>();

export function buildMssqlConfig(apiUrl: string, apiKey: string): sql.config {
  // apiKey = "user:password"
  const colonIdx = apiKey.indexOf(":");
  const user = colonIdx >= 0 ? apiKey.slice(0, colonIdx) : apiKey;
  const password = colonIdx >= 0 ? apiKey.slice(colonIdx + 1) : "";

  return {
    connectionString: `${apiUrl};User Id=${user};Password=${password};TrustServerCertificate=true;Encrypt=false`,
  } as unknown as sql.config;
}

export async function getCommandPool(apiUrl: string, apiKey: string): Promise<sql.ConnectionPool> {
  const key = `${apiUrl}|${apiKey}`;
  const existing = pools.get(key);
  if (existing?.connected) return existing;

  const config = buildMssqlConfig(apiUrl, apiKey);
  const pool = await new sql.ConnectionPool(config).connect();
  pools.set(key, pool);
  return pool;
}

export interface LancamentoCentroCusto {
  cod_lan: number;
  cod_centro_custo: number;
  valor: number;
}

export async function fetchLancamentosCentroCusto(
  pool: sql.ConnectionPool
): Promise<LancamentoCentroCusto[]> {
  const result = await pool.request().query(`
    SELECT lcc.cod_lan, lcc.cod_centro_custo, lcc.valor
    FROM lancamentos_centro_custo lcc
  `);
  return result.recordset as LancamentoCentroCusto[];
}
