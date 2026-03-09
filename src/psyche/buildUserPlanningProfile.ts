import dayjs from 'dayjs';
import {
  CalendarEventLike,
  HabitsStateLike,
  PsycheGoal,
  TodoStateLike,
  UserPlanningProfile,
} from './types';

type Params = {
  goals: PsycheGoal[];
  todo: TodoStateLike | null;
  habits: HabitsStateLike | null;
  calendarEvents: CalendarEventLike[] | null;
};

function average(nums: number[]) {
  if (!nums.length) return 0;
  return nums.reduce((a, b) => a + b, 0) / nums.length;
}

export function buildUserPlanningProfile(params: Params): UserPlanningProfile {
  const { todo, habits, calendarEvents } = params;

  const tasks = todo?.tasks ?? [];
  const habitList = habits?.habits ?? [];
  const events = calendarEvents ?? [];

  const completedTasks = tasks.filter((t) => t.done);
  const recentCompleted = completedTasks.filter((t) =>
    dayjs(t.createdAt).isAfter(dayjs().subtract(21, 'day'))
  );

  const eventHours = events.map((e) => dayjs(e.start).hour());
  const avgHour = average(eventHours);

  let energyWindow: UserPlanningProfile['energyWindow'] = 'mixed';
  if (avgHour > 0) {
    if (avgHour < 12) energyWindow = 'morning';
    else if (avgHour < 17) energyWindow = 'afternoon';
    else energyWindow = 'evening';
  }

  const avgTaskChunk =
    recentCompleted.length >= 8 ? 'small_steps' : recentCompleted.length >= 4 ? 'varied' : 'small_steps';

  const habitDayCounts = habitList.map((h) => {
    const activeDays = Object.values(h.checkins ?? {}).filter((v) => (v ?? 0) > 0).length;
    return activeDays;
  });

  const consistencyScore = Math.max(
    0,
    Math.min(100, Math.round(average(habitDayCounts) * 12))
  );

  const preferredSessionMinutes =
    energyWindow === 'evening' ? 20 : energyWindow === 'morning' ? 30 : 25;

  const frictionPoints: string[] = [];
  if (tasks.filter((t) => !t.done).length > completedTasks.length) frictionPoints.push('overwhelm');
  if (consistencyScore < 45) frictionPoints.push('consistency');
  if (!events.length) frictionPoints.push('calendar_missing');
  if (avgHour >= 19) frictionPoints.push('late_day_fatigue');

  const successfulPatterns: string[] = [];
  if (consistencyScore >= 55) successfulPatterns.push('repetition_works');
  if (energyWindow === 'evening') successfulPatterns.push('evening_execution');
  if (energyWindow === 'morning') successfulPatterns.push('morning_focus');

  const failedPatterns: string[] = [];
  if (tasks.filter((t) => !t.done).length > 8) failedPatterns.push('too_many_open_loops');
  if (!events.length) failedPatterns.push('no_calendar_commitment');

  return {
    energyWindow,
    planningStyle: events.length >= 4 ? 'structured' : 'flexible',
    startStyle:
      frictionPoints.includes('overwhelm') ? 'gentle' : consistencyScore > 65 ? 'balanced' : 'gentle',
    frictionPoints,
    motivationDrivers:
      energyWindow === 'evening' ? ['calm_progress', 'clear_finish_line'] : ['clarity', 'momentum'],
    preferredSessionMinutes,
    consistencyScore,
    completionStyle: avgTaskChunk,
    successfulPatterns,
    failedPatterns,
  };
}