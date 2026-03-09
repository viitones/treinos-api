import { fromNodeHeaders } from "better-auth/node";
import { InternalServerError, NotFoundError, UnauthorizedError } from "../errors/index.js";
import { CreateWorkoutPlan } from "../usecases/CreateWorkoutPlan.js";
import { auth } from "../lib/auth.js";
import z from "zod";
import { WeekDay } from "../generated/prisma/enums.js";
import { ZodTypeProvider } from "fastify-type-provider-zod";
import { FastifyInstance } from "fastify";

export function workoutPlanRoutes(app: FastifyInstance) {
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
}