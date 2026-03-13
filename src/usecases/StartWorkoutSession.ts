import { ConflictError, NotFoundError, UnauthorizedError, WorkoutPlanNotActiveError } from "../errors/index.js";
import { prisma } from "../lib/db.js";

interface InputDto {
  workoutPlanId: string;
  workoutDayId: string;
  userId: string;
}

interface OutputDto {
  userWorkoutSessionId: string;
}

export class StartWorkoutSession {
  async execute(dto: InputDto): Promise<OutputDto> {
    const workoutPlan = await prisma.workoutPlan.findUnique({
      where: { id: dto.workoutPlanId },
    });

    if (!workoutPlan) {
      throw new NotFoundError("Workout plan not found");
    }

    if (!workoutPlan.isActive) {
      throw new WorkoutPlanNotActiveError("Workout plan is not active");
    }

    if (workoutPlan.userId !== dto.userId) {
      throw new UnauthorizedError("You are not the owner of this workout plan");
    }

    const workoutDay = await prisma.workoutDay.findFirst({
      where: {
        id: dto.workoutDayId,
        workoutPlanId: dto.workoutPlanId,
      },
    });

    if (!workoutDay) {
      throw new NotFoundError("Workout day not found");
    }

    const existingSession = await prisma.workoutSession.findFirst({
      where: {
        workoutDayId: dto.workoutDayId,
      },
    });

    if (existingSession) {
      throw new ConflictError("A session for this workout day has already been started");
    }

    const session = await prisma.workoutSession.create({
      data: {
        workoutDayId: dto.workoutDayId,
        startedAt: new Date(),
      },
    });

    return {
      userWorkoutSessionId: session.id,
    };
  }
}
