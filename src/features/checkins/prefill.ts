/**
 * What a remembered field shows: the value last used, until the user types in it.
 * Once touched, the user's own text stays, whatever activity they pick next.
 */
export function prefillField(current: string, touched: boolean, remembered: number | null | undefined): string {
  if (touched) return current;
  return remembered == null ? '' : String(remembered);
}

/** A stored number as text for a field: empty when not given. */
export function numberText(value: number | null | undefined): string {
  return value == null ? '' : String(value);
}
