import { betterAuth } from "better-auth";
import { prismaAdapter } from "better-auth/adapters/prisma";
import { openAPI } from "better-auth/plugins";

import { env } from "../env/index.js";
import { prisma } from "./db.js";


export const auth = betterAuth({
  trustedOrigins: env.TRUSTED_ORIGINS ?? ["http://localhost:3000"],
  emailAndPassword: {
    enabled: true,
  },
  database: prismaAdapter(prisma, {
    provider: "postgresql",
  }),
  plugins: [
    openAPI()
  ]
})