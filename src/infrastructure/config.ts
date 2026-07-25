// Konfigurasi terpusat — satu-satunya tempat membaca process.env.

function env(key: string, fallback = ""): string {
  return process.env[key] ?? fallback;
}

export const config = {
  isDev: process.env.NODE_ENV === "development",
  isProd: process.env.NODE_ENV === "production",

  baseUrl: env("BASE_URL", "http://localhost:3000").replace(/\/$/, ""),
  cronSecret: env("CRON_SECRET"),
  databaseUrl: env("DATABASE_URL"),

  ai: {
    apiKey: env("AI_API_KEY"),
    baseUrl: env("AI_BASE_URL", "https://api.openai.com/v1").replace(/\/$/, ""),
    model: env("AI_MODEL", "gpt-4o-mini"),
    get configured(): boolean {
      return Boolean(this.apiKey);
    },
  },

  mail: {
    resendApiKey: env("RESEND_API_KEY"),
    from: env("MAIL_FROM", "Lensa <onboarding@resend.dev>"),
    get configured(): boolean {
      return Boolean(this.resendApiKey);
    },
  },

  retention: {
    articleDays: Number(env("RETENTION_ARTICLE_DAYS", "30")),
    authTokenHours: 24,
    sessionDays: 31,
  },
} as const;
