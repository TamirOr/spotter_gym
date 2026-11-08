import { useMutation, useQuery } from '@tanstack/react-query';

import type { Rpc, Tables } from '@/lib/database.types';
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

export type PlanItemEdit = NewPlanItem & { id: string };

/** Time and reminder change in place; a new activity or repeat rule replaces the item from this week on. */
export function useEditPlanItem() {
  return useMutation({
    mutationFn: async (item: PlanItemEdit) =>
      unwrap(
        await supabase.rpc('edit_plan_item', {
          p_plan_item_id: item.id,
          p_activity_id: item.activity_id,
          p_time: item.time,
          p_rrule: item.rrule,
          p_starts_on: item.starts_on,
          p_reminder_lead_min: item.reminder_lead_min,
        }),
      ),
    onSuccess: invalidatePlan,
  });
}

/**
 * Skip one occurrence, or move it to another day, without changing the series. An occurrence is named by
 * the day it was planned on, so moving a moved workout again replaces the first move.
 */
export function useChangeOccurrence() {
  return useMutation({
    mutationFn: async ({
      planItemId,
      plannedOn,
      moveTo,
    }: {
      planItemId: string;
      plannedOn: string;
      /** Null skips it. */
      moveTo: string | null;
    }) =>
      unwrap(
        await supabase.from('plan_exceptions').upsert({
          plan_item_id: planItemId,
          occurs_on: plannedOn,
          action: moveTo ? 'move' : 'skip',
          new_date: moveTo,
        }),
      ),
    onSuccess: invalidatePlan,
  });
}
