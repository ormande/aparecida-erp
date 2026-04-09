/**
 * Garante que operações destrutivas (reset / seed / limpeza) não rodem contra
 * DATABASE_URL de produção por engano. Usado por reset-test-db e seed-test-db.
 *
 * Requer flag explícita no ambiente E uma URL que indique ambiente de teste/homologação.
 * Nunca defina as flags ALLOW_* no .env de produção.
 */

const ALLOW_SUBSTRINGS = [
  "localhost",
  "127.0.0.1",
  "::1",
  "test",
  "staging",
  "sandbox",
  "rlwy",
  "interchange",
  "homolog",
];

/**
 * @param {"ALLOW_DB_RESET" | "ALLOW_DB_SEED"} allowEnvVar
 * @param {string} [operationLabel]
 */
export function assertTestDatabaseDestructive(allowEnvVar, operationLabel = "Operacao") {
  const databaseUrl = process.env.DATABASE_URL ?? "";
  const allow = process.env[allowEnvVar] === "true";

  if (!databaseUrl.trim()) {
    throw new Error(`${operationLabel}: DATABASE_URL nao definido ou vazio.`);
  }

  const lower = databaseUrl.toLowerCase();

  if (
    lower.includes("env=production") ||
    lower.includes("schema=production")
  ) {
    throw new Error(
      `${operationLabel}: a DATABASE_URL contem indicadores de ambiente de producao. Abortado por seguranca.`,
    );
  }

  const looksSafe = ALLOW_SUBSTRINGS.some((frag) => lower.includes(frag));

  if (!allow || !looksSafe) {
    throw new Error(
      `${operationLabel} bloqueada. Use apenas banco de teste/homologacao: defina ${allowEnvVar}=true ` +
        `e uma DATABASE_URL que evidencie ambiente de teste (ex.: localhost, nome com "test", Railway de homolog, etc.). ` +
        `Nunca carregue o .env de producao. Os scripts npm db:*:test usam somente .env.test.`,
    );
  }
}
