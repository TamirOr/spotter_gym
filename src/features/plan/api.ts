import { useMutation, useQuery } from '@tanstack/react-query';

import type { Rpc, Tables } from '@/lib/database.types';
import { addDays } from '@/lib/dates';
import { queryClient } from '@/lib/queryClient';
import { queryKeys } from '@/lib/queryKeys';
import { supabase, unwrap } from '@/lib/supabase';

export type PlanItem = Pick<
  Tables<'plan_items'>,
  'id' | 'activity_id' | 'time' | 'rrule' | 'starts_on' | 'reminder_lead_min'
>;
export type WeekEntry = Rpc<'my_week'>[number];
export type NewPlanItem = Omit<PlanItem, 'id'>;

function invalidatePlan() {
  return Promise.all(
    [queryKeys.planItems, ['week'], queryKeys.myToday, ['clique-today']].map((queryKey) =>
      queryClient.invalidateQueries({ queryKey }),
    ),
  );
}

export function usePlanItems() {
  return useQuery({
    queryKey: queryKeys.planItems,
    queryFn: async (): Promise<PlanItem[]> =>
      unwrap(
        await supabase
          .from('plan_items')
          .select('id, activity_id, time, rrule, starts_on, reminder_lead_min')
          .is('deleted_at', null)
          .order('created_at'),
      ),
  });
}

export function useWeek(weekStart: string) {
  return useQuery({
    queryKey: queryKeys.week(weekStart),
    queryFn: async (): Promise<WeekEntry[]> => unwrap(await supabase.rpc('my_week', { p_week_start: weekStart })),
  });
}

export function useAddPlanItem() {
  return useMutation({
    mutationFn: async (item: NewPlanItem) => unwrap(await supabase.from('plan_items').insert(item)),
    onSuccess: invalidatePlan,
  });
}

/** Removal keeps the item for the current week, which locked when it started. */
export function useRemovePlanItem() {
  return useMutation({
    mutationFn: async (planItemId: string) =>
      unwrap(await supabase.rpc('remove_plan_item', { p_plan_item_id: planItemId })),
    onSuccess: invalidatePlan,
  });
}

/** Skip or move one occurrence without changing the series. */
export function useChangeOccurrence() {
  return useMutation({
    mutationFn: async ({
      planItemId,
      day,
      moveToNextDay,
    }: {
      planItemId: string;
      day: string;
      moveToNextDay: boolean;
    }) =>
      unwrap(
        await supabase.from('plan_exceptions').upsert({
          plan_item_id: planItemId,
          occurs_on: day,
          action: moveToNextDay ? 'move' : 'skip',
          new_date: moveToNextDay ? addDays(day, 1) : null,
        }),
      ),
    onSuccess: invalidatePlan,
  });
}
