import dotenv from "dotenv";

dotenv.config();

function required(name: string, fallback?: string): string {
  const v = process.env[name] ?? fallback;
  if (!v) throw new Error(`Missing required env var ${name}`);
  if (process.env.NODE_ENV === "production" && fallback !== undefined && process.env[name] === undefined) {
    throw new Error(`Missing required env var ${name} in production`);
  }
  return v;
}

export const env = {
  DATABASE_URL: required("DATABASE_URL", "postgresql://velozity:velozity_dev_password@localhost:5432/velozity_dashboard"),
  JWT_ACCESS_SECRET: required("JWT_ACCESS_SECRET", "dev-access-secret-change-me-32chars!!"),
  JWT_REFRESH_SECRET: required("JWT_REFRESH_SECRET", "dev-refresh-secret-change-me-32chars!"),
  ACCESS_TOKEN_EXPIRES_IN: process.env.ACCESS_TOKEN_EXPIRES_IN ?? "15m",
  REFRESH_TOKEN_EXPIRES_IN_DAYS: Number(process.env.REFRESH_TOKEN_EXPIRES_IN_DAYS ?? "7"),
  PORT: Number(process.env.PORT ?? "4000"),
  CLIENT_URL: process.env.CLIENT_URL ?? "http://localhost:5173",
  NODE_ENV: process.env.NODE_ENV ?? "development",
  COOKIE_SECURE: (process.env.COOKIE_SECURE ?? "false") === "true" || process.env.NODE_ENV === "production",
  OVERDUE_CRON: process.env.OVERDUE_CRON ?? "*/1 * * * *",
  SEED_PASSWORD: process.env.SEED_PASSWORD ?? "Velozity123!",
};

export const isProd = env.NODE_ENV === "production";
