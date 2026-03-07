import "dotenv/config";

import fastifyCors from "@fastify/cors";
import fastifySwagger from "@fastify/swagger";
import fastifyApiReference from "@scalar/fastify-api-reference";
import { fromNodeHeaders } from "better-auth/node";
import Fastify from "fastify";
import type { ZodTypeProvider } from "fastify-type-provider-zod";
import {
  jsonSchemaTransform,
  serializerCompiler,
  validatorCompiler,
} from "fastify-type-provider-zod";
import { z } from "zod/v4";

import { InternalServerError, NotFoundError, UnauthorizedError } from "./errors/index.js";
import { WeekDay } from "./generated/prisma/enums.js";
import { auth } from "./lib/auth.js";
import { CreateWorkoutPlan } from "./usecases/CreateWorkoutPlan.js";

const app = Fastify({
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
    ]
  }
})

app.withTypeProvider<ZodTypeProvider>().route({
  method: "POST",
  url: "/workout-plans",
  schema: {
    body: z.object({
      name: z.string().trim().min(1, { error: "Name is required" }),
      workoutDays: z.array(
        z.object({
          name: z.string().trim().min(1, { error: "Workout day name is required" }),
          weekDay: z.enum(WeekDay),
          isRest: z.boolean().default(false),
          estimatedDurationInSeconds: z.number().int().min(1),
          exercises: z.array(
            z.object({
              order: z.number().int().min(0),
              name: z.string().trim().min(1, { error: "Exercise name is required" }),
              sets: z.number().int().min(1),
              reps: z.number().int().min(1),
              restTimeInSeconds: z.number().int().min(1),
            })
          )
        })
      )
    }),
    response: {
      201: z.object({
        id: z.uuid(),
        name: z.string().trim().min(1, { error: "Name is required" }),
        workoutDays: z.array(
          z.object({
            name: z.string().trim().min(1, { error: "Workout day name is required" }),
            weekDay: z.enum(WeekDay),
            isRest: z.boolean().default(false),
            estimatedDurationInSeconds: z.number().int().min(1),
            exercises: z.array(
              z.object({
                order: z.number().int().min(0),
                name: z.string().trim().min(1, { error: "Exercise name is required" }),
                sets: z.number().int().min(1),
                reps: z.number().int().min(1),
                restTimeInSeconds: z.number().int().min(1),
              })
            )
          })
        )
      }),
      400: z.object({
        error: z.string(),
        code: z.string(),
      }),
      401: z.object({
        error: z.string(),
        code: z.string(),
      }),
      404: z.object({
        error: z.string(),
        code: z.string(),
      }),
      500: z.object({
        error: z.string(),
        code: z.string(),
      }),
    }
  },
  handler: async (request, reply) => {
    try {
      const session = await auth.api.getSession({
        headers: fromNodeHeaders(request.headers)
      })

      if (!session) {
        return reply.status(401).send({ error: "Unauthorized", code: "UNAUTHORIZED" });
      }

      const createWorkoutPlan = new CreateWorkoutPlan();

      const result = await createWorkoutPlan.execute({
        userId: session.user.id,
        name: request.body.name,
        workoutDays: request.body.workoutDays,
      })

      return reply.status(201).send(result);
    } catch (error) {
      if (error instanceof NotFoundError) {
        return reply.status(404).send({ error: error.message, code: "NOT_FOUND" });
      }

      if (error instanceof UnauthorizedError) {
        return reply.status(401).send({ error: error.message, code: "UNAUTHORIZED" });
      }

      if (error instanceof InternalServerError) {
        return reply.status(500).send({ error: error.message, code: "INTERNAL_SERVER_ERROR" });
      }

      app.log.error(error);
      return reply.status(500).send({ error: "Internal server error", code: "INTERNAL_SERVER_ERROR" });
    }
  }
})

app.withTypeProvider<ZodTypeProvider>().route({
  method: "GET",
  url: "/swagger.json",
  schema: {
    hide: true,
  },
  handler: async () => {
    return app.swagger();
  }
});

app.withTypeProvider<ZodTypeProvider>().route({
  method: "GET",
  url: "/",
  schema: {
    description: "Hello world endpoint",
    tags: ["Hello world"],
    response: {
      200: z.object({
        message: z.string(),
      }),
    },
  },
  handler: () => {
    return {
      message: "Hello world!",
    };
  },
});

app.route({
  method: ["GET", "POST"],
  url: "/api/auth/*",
  async handler(request, reply) {
    try {
      // Construct request URL
      const url = new URL(request.url, `http://${request.headers.host}`);

      // Convert Fastify headers to standard Headers object
      const headers = new Headers();
      Object.entries(request.headers).forEach(([key, value]) => {
        if (value) headers.append(key, value.toString());
      });
      // Create Fetch API-compatible request
      const req = new Request(url.toString(), {
        method: request.method,
        headers,
        ...(request.body ? { body: JSON.stringify(request.body) } : {}),
      });
      // Process authentication request
      const response = await auth.handler(req);
      // Forward response to client
      reply.status(response.status);
      response.headers.forEach((value, key) => reply.header(key, value));
      reply.send(response.body ? await response.text() : null);
    } catch (error) {
      app.log.error(error);
      reply.status(500).send({
        error: "Internal authentication error",
        code: "AUTH_FAILURE"
      });
    }
  }
});


try {
  await app.listen({ port: +(process.env.PORT ?? 3001) });

} catch (err) {
  app.log.error(err);
  process.exit(1);
}
