import { PrismaPg } from "@prisma/adapter-pg";

import { env } from "../env/index.js";
import { PrismaClient } from "../generated/prisma/client.js";

const connectionString = `${env.DATABASE_URL}`;

const adapter = new PrismaPg({ connectionString });

const globalForPrisma = globalThis as unknown as { prisma: PrismaClient };

export const prisma = globalForPrisma.prisma || new PrismaClient({ adapter });

if (env.NODE_ENV !== "prod") globalForPrisma.prisma = prisma;