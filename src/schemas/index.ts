import z from "zod";

import { WeekDay } from "../generated/prisma/enums.js";

export const workoutPlanSchema = z.object({
  id: z.uuid(),
  name: z.string().trim().min(1, { error: "Name is required" }),
  workoutDays: z.array(
    z.object({
      name: z.string().trim().min(1, { error: "Workout day name is required" }),
      weekDay: z.enum(WeekDay),
      isRest: z.boolean().default(false),
      estimatedDurationInSeconds: z.number().int().min(1),
      coverImageUrl: z.url().optional().nullable(),
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
})

export const errorSchema = z.object({
  error: z.string(),
  code: z.string(),
  message: z.string().optional(),
})

export const workoutSessionSchema = z.object({
  userWorkoutSessionId: z.uuid(),
})

export const updateWorkoutSessionBodySchema = z.object({
  completedAt: z.string().datetime(),
})

export const updateWorkoutSessionResponseSchema = z.object({
  id: z.string().uuid(),
  completedAt: z.string().datetime(),
  startedAt: z.string().datetime(),
})

export const getHomeParamsSchema = z.object({
  date: z.string().date(),
})

export const getHomeResponseSchema = z.object({
  activeWorkoutPlanId: z.string().uuid().nullable(),
  todayWorkoutDay: z.object({
    workoutPlanId: z.string().uuid(),
    id: z.string().uuid(),
    name: z.string(),
    isRest: z.boolean(),
    weekDay: z.enum(WeekDay),
    estimatedDurationInSeconds: z.number(),
    coverImageUrl: z.string().url().optional().nullable(),
    exercisesCount: z.number(),
  }).nullable(),
  workoutStreak: z.number(),
  consistencyByDay: z.record(
    z.string(),
    z.object({
      workoutDayCompleted: z.boolean(),
      workoutDayStarted: z.boolean(),
    })
  ),
})