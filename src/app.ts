import "dotenv/config";

import fastifyCors from "@fastify/cors";
import fastifySwagger from "@fastify/swagger";
import fastifyApiReference from "@scalar/fastify-api-reference";
import Fastify from "fastify";
import {
  jsonSchemaTransform,
  serializerCompiler,
  validatorCompiler,
} from "fastify-type-provider-zod";

import { authRoutes } from "./routes/auth.js";
import { swaggerRoutes } from "./routes/swagger.js";
import { workoutPlanRoutes } from "./routes/workout-plan.js";

export const app = Fastify({
  logger: true,
});

app.setValidatorCompiler(validatorCompiler);
app.setSerializerCompiler(serializerCompiler);

await app.register(fastifySwagger, {
  openapi: {
    info: {
      title: "Treinos API",
      description: "API para o app Treinos",
      version: "1.0.0",
    },
    servers: [
      {
        description: "Localhost",
        url: "http://localhost:3001",
      },
    ],
  },
  transform: jsonSchemaTransform,
});

await app.register(fastifyCors, {
  origin: [process.env.TRUSTED_ORIGIN ?? "http://localhost:3000"],
  credentials: true,
})

await app.register(fastifyApiReference, {
  routePrefix: "/docs",
  configuration: {
    sources: [
      {
        title: "Treinos API Reference",
        slug: "treinos-api",
        url: "/swagger.json",
      },
      {
        title: "Auth API Reference",
        slug: "auth-api",
        url: "/api/auth/open-api/generate-schema",
      }
    ],
    theme: "kepler",
  }
})

app.register(swaggerRoutes)

app.register(workoutPlanRoutes, {
  prefix: "/workout-plans"
})

app.register(authRoutes)
