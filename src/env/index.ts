import z from "zod";

const envSchema = z.object({
  NODE_ENV: z.enum(["dev", "test", "prod"]).default("dev"),
  PORT: z.coerce.number().default(3001),
  TRUSTED_ORIGINS: z.string().array().default(["http://localhost:3000"]),
  BETTER_AUTH_SECRET: z.string(),
  BETTER_AUTH_URL: z.string().default("http://localhost:3001"),
  DATABASE_URL: z.string(),
})

const _env = envSchema.safeParse(process.env);

if (!_env.success) {
  console.error("❌ Invalid environment variables:", z.treeifyError(_env.error));
  throw new Error("❌ Invalid environment variables");
}

export const env = _env.data;
