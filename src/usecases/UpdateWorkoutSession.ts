import dayjs from "dayjs";

import { NotFoundError, UnauthorizedError } from "../errors/index.js";
import { prisma } from "../lib/db.js";

interface InputDto {
  workoutPlanId: string;
  workoutDayId: string;
  sessionId: string;
  userId: string;
  completedAt: string;
}

interface OutputDto {
  id: string;
  startedAt: string;
  completedAt: string;
}

export class UpdateWorkoutSession {
  async execute(dto: InputDto): Promise<OutputDto> {
    const workoutPlan = await prisma.workoutPlan.findUnique({
      where: { id: dto.workoutPlanId },
    });

    if (!workoutPlan) {
      throw new NotFoundError("Workout plan not found");
    }

    if (workoutPlan.userId !== dto.userId) {
      throw new UnauthorizedError("You are not the owner of this workout plan");
    }

    const session = await prisma.workoutSession.findFirst({
      where: {
        id: dto.sessionId,
        workoutDayId: dto.workoutDayId,
        workoutDay: {
          workoutPlanId: dto.workoutPlanId,
        },
      },
    });

    if (!session) {
      throw new NotFoundError("Workout session not found");
    }

    const updatedSession = await prisma.workoutSession.update({
      where: { id: dto.sessionId },
      data: {
        completedAt: dayjs(dto.completedAt).toDate(),
      },
    });

    return {
      id: updatedSession.id,
      startedAt: dayjs(updatedSession.startedAt).toISOString(),
      completedAt: updatedSession.completedAt
        ? dayjs(updatedSession.completedAt).toISOString()
        : "",
    };
  }
}
