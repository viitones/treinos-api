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
      coverImageUrl: z.url().optional(),
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
})