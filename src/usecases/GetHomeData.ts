import dayjs from "dayjs";
import isSameOrAfter from "dayjs/plugin/isSameOrAfter.js";
import utc from "dayjs/plugin/utc.js";

import { WeekDay } from "../generated/prisma/enums.js";
import { prisma } from "../lib/db.js";

dayjs.extend(utc);
dayjs.extend(isSameOrAfter);

interface InputDto {
  userId: string;
  date: string;
}

interface OutputDto {
  activeWorkoutPlanId: string | null;
  todayWorkoutDay: {
    workoutPlanId: string;
    id: string;
    name: string;
    isRest: boolean;
    weekDay: WeekDay;
    estimatedDurationInSeconds: number;
    coverImageUrl?: string | null;
    exercisesCount: number;
  } | null;
  workoutStreak: number;
  consistencyByDay: Record<
    string,
    {
      workoutDayCompleted: boolean;
      workoutDayStarted: boolean;
    }
  >;
}

function getWeekDayEnum(day: number): WeekDay {
  const map: Record<number, WeekDay> = {
    0: "SUNDAY",
    1: "MONDAY",
    2: "TUESDAY",
    3: "WEDNESDAY",
    4: "THURSDAY",
    5: "FRIDAY",
    6: "SATURDAY",
  };
  return map[day];
}

export class GetHomeData {
  async execute(dto: InputDto): Promise<OutputDto> {
    const targetDate = dayjs.utc(dto.date);
    const startOfWeek = targetDate.startOf("week");
    const endOfWeek = targetDate.endOf("week");

    const consistencyByDay: Record<
      string,
      { workoutDayCompleted: boolean; workoutDayStarted: boolean }
    > = {};
    for (let i = 0; i < 7; i++) {
        const d = startOfWeek.add(i, "day").format("YYYY-MM-DD");
        consistencyByDay[d] = {
            workoutDayCompleted: false,
            workoutDayStarted: false,
        };
    }

    const activePlan = await prisma.workoutPlan.findFirst({
      where: {
        userId: dto.userId,
        isActive: true,
      },
      include: {
        workoutDays: {
          include: {
            exercises: true,
            sessions: true,
          },
        },
      },
    });

    if (!activePlan) {
      throw new Error("No active workout plan found");
    }

    const sessionsThisWeek = await prisma.workoutSession.findMany({
      where: {
        workoutDay: {
          workoutPlanId: activePlan.id,
        },
        startedAt: {
          gte: startOfWeek.toDate(),
          lte: endOfWeek.toDate(),
        },
      },
      select: {
        startedAt: true,
        completedAt: true,
      },
    });

    for (const session of sessionsThisWeek) {
      const sessionDate = dayjs(session.startedAt).utc().format("YYYY-MM-DD");
      if (consistencyByDay[sessionDate]) {
        consistencyByDay[sessionDate].workoutDayStarted = true;
        if (session.completedAt) {
          consistencyByDay[sessionDate].workoutDayCompleted = true;
        }
      }
    }

    const currentWeekDay = getWeekDayEnum(targetDate.day());
    const todayWorkoutDayRecord = activePlan.workoutDays.find(
      (day) => day.weekDay === currentWeekDay
    );

    let todayWorkoutDay = null;
    if (todayWorkoutDayRecord) {
      todayWorkoutDay = {
        workoutPlanId: todayWorkoutDayRecord.workoutPlanId,
        id: todayWorkoutDayRecord.id,
        name: todayWorkoutDayRecord.name,
        isRest: todayWorkoutDayRecord.isRest,
        weekDay: todayWorkoutDayRecord.weekDay,
        estimatedDurationInSeconds: todayWorkoutDayRecord.estimatedDurationInSeconds,
        coverImageUrl: todayWorkoutDayRecord.coverImageUrl,
        exercisesCount: todayWorkoutDayRecord.exercises.length,
      };
    }

    const completedSessions = await prisma.workoutSession.findMany({
      where: {
        workoutDay: {
          workoutPlanId: activePlan.id,
        },
        completedAt: { not: null },
      },
      select: {
        startedAt: true,
      },
      orderBy: {
        startedAt: "desc",
      },
    });

    const completedDatesSet = new Set(
      completedSessions.map((s) => dayjs(s.startedAt).utc().format("YYYY-MM-DD"))
    );

    let streak = 0;
    const planCreationDate = dayjs(activePlan.createdAt).utc().startOf("day");
    let dateToCheck = targetDate.clone();

    while (dateToCheck.isSameOrAfter(planCreationDate, "day")) {
      const dateStr = dateToCheck.format("YYYY-MM-DD");
      const wdEnum = getWeekDayEnum(dateToCheck.day());
      const wDay = activePlan.workoutDays.find((d) => d.weekDay === wdEnum);

      const hasCompleted = completedDatesSet.has(dateStr);

      if (hasCompleted) {
        streak++;
      } else if (!wDay || wDay.isRest) {
        streak++;
      } else {
        if (!dateToCheck.isSame(targetDate, "day")) {
          break;
        }
      }

      dateToCheck = dateToCheck.subtract(1, "day");
    }

    return {
      activeWorkoutPlanId: activePlan.id,
      todayWorkoutDay,
      workoutStreak: streak,
      consistencyByDay,
    };
  }
}
