import { AuroraDSQLPool } from "@aws/aurora-dsql-node-postgres-connector";
import { neon } from "@neondatabase/serverless";
import { attachDatabasePool } from "@vercel/functions";
import { awsCredentialsProvider } from "@vercel/oidc-aws-credentials-provider";

type SqlClient = (strings: TemplateStringsArray, ...values: unknown[]) => Promise<unknown[]>;

let cachedDatabaseKey = "";
let cachedPool: AuroraDSQLPool | null = null;
let cachedSql: SqlClient | null = null;

export function getDatabaseUrl() {
  const databaseUrl = (process.env.DATABASE_URL || process.env.POSTGRES_URL || process.env.db_url_DATABASE_URL || "").trim();
  return databaseUrl;
}

export function getDsqlConfig() {
  const host = (process.env.STORAGE_PGHOST || process.env.db_url_PGHOST || "").trim();
  const region = (process.env.STORAGE_AWS_REGION || process.env.db_url_AWS_REGION || "").trim();
  const user = (process.env.STORAGE_PGUSER || process.env.db_url_PGUSER || "admin").trim();
  const database = (process.env.STORAGE_PGDATABASE || process.env.db_url_PGDATABASE || "postgres").trim();
  const port = Number(process.env.STORAGE_PGPORT || process.env.db_url_PGPORT || 5432);
  const roleArn = (process.env.STORAGE_AWS_ROLE_ARN || process.env.db_url_AWS_ROLE_ARN || "").trim();

  return { host, region, user, database, port, roleArn };
}

export function hasDsqlDatabase() {
  const config = getDsqlConfig();
  return Boolean(config.host && config.region);
}

export function hasDatabase() {
  return Boolean(getDatabaseUrl() || hasDsqlDatabase());
}

export function getSql() {
  const databaseUrl = getDatabaseUrl();
  if (databaseUrl) {
    const databaseKey = `url:${databaseUrl}`;
    if (!cachedSql || cachedDatabaseKey !== databaseKey) {
      cachedDatabaseKey = databaseKey;
      cachedPool = null;
      cachedSql = neon(databaseUrl) as SqlClient;
    }

    return cachedSql;
  }

  const config = getDsqlConfig();
  if (!config.host || !config.region) {
    throw new Error("DATABASE_URL, POSTGRES_URL, db_url_DATABASE_URL or STORAGE_PGHOST/db_url_PGHOST + STORAGE_AWS_REGION/db_url_AWS_REGION is required.");
  }

  const databaseKey = `dsql:${config.host}:${config.region}:${config.user}:${config.database}:${config.port}`;
  if (!cachedSql || cachedDatabaseKey !== databaseKey) {
    cachedDatabaseKey = databaseKey;
    const usesVercelOidc = Boolean(config.roleArn && (process.env.VERCEL || process.env.VERCEL_OIDC_TOKEN));
    cachedPool = new AuroraDSQLPool({
      host: config.host,
      region: config.region,
      user: config.user,
      database: config.database,
      port: config.port,
      ssl: (process.env.STORAGE_PGSSLMODE || process.env.db_url_PGSSLMODE) === "disable" ? false : { rejectUnauthorized: true },
      ...(usesVercelOidc
        ? {
            customCredentialsProvider: awsCredentialsProvider({
              roleArn: config.roleArn,
              clientConfig: { region: config.region },
            }),
          }
        : {}),
    });
    attachDatabasePool(cachedPool);
    cachedSql = async (strings, ...values) => {
      const text = strings.reduce((query, part, index) => {
        const placeholder = index < values.length ? `$${index + 1}` : "";
        return `${query}${part}${placeholder}`;
      }, "");
      const result = await cachedPool?.query(text, values);
      return result?.rows || [];
    };
  }

  return cachedSql;
}
