import { fromNodeHeaders } from "better-auth/node";
import { FastifyInstance } from "fastify";
import { ZodTypeProvider } from "fastify-type-provider-zod";
import z from "zod";

import { ConflictError, InternalServerError, NotFoundError, UnauthorizedError, WorkoutPlanNotActiveError } from "../errors/index.js";
import { auth } from "../lib/auth.js";
import { errorSchema, workoutPlanSchema, workoutSessionSchema } from "../schemas/index.js";
import { CreateWorkoutPlan } from "../usecases/CreateWorkoutPlan.js";
import { StartWorkoutSession } from "../usecases/StartWorkoutSession.js";

export function workoutPlanRoutes(app: FastifyInstance) {
  app.withTypeProvider<ZodTypeProvider>().route({
    method: "POST",
    url: "/",
    schema: {
      tags: ["Workout Plan"],
      summary: "Create a workout plan",
      body: workoutPlanSchema.omit({ id: true }),
      response: {
        201: workoutPlanSchema,
        // 400: errorSchema,
        401: errorSchema,
        404: errorSchema,
        500: errorSchema,
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
    method: "POST",
    url: "/:workoutPlanId/days/:workoutDayId/sessions",
    schema: {
      tags: ["Workout Plan"],
      summary: "Start a workout session for a specific day",
      params: z.object({
        workoutPlanId: z.uuid(),
        workoutDayId: z.uuid(),
      }),
      response: {
        201: workoutSessionSchema,
        400: errorSchema,
        401: errorSchema,
        404: errorSchema,
        409: errorSchema,
        500: errorSchema,
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

        const startWorkoutSession = new StartWorkoutSession();

        const result = await startWorkoutSession.execute({
          workoutPlanId: request.params.workoutPlanId,
          workoutDayId: request.params.workoutDayId,
          userId: session.user.id,
        });

        return reply.status(201).send(result);
      } catch (error) {
        if (error instanceof NotFoundError) {
          return reply.status(404).send({ error: error.message, code: "NOT_FOUND" });
        }

        if (error instanceof UnauthorizedError) {
          return reply.status(401).send({ error: error.message, code: "UNAUTHORIZED" });
        }

        if (error instanceof WorkoutPlanNotActiveError) {
          return reply.status(400).send({ error: error.message, code: "WORKOUT_PLAN_NOT_ACTIVE" });
        }

        if (error instanceof ConflictError) {
          return reply.status(409).send({ error: error.message, code: "CONFLICT" });
        }

        app.log.error(error);
        return reply.status(500).send({ error: "Internal server error", code: "INTERNAL_SERVER_ERROR" });
      }
    }
  })
}
