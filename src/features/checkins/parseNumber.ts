/** Reads an optional positive number typed by the user. Accepts a comma as the decimal mark. */
export function parsePositiveNumber(text: string): number | null {
  const value = Number(text.trim().replace(',', '.'));
  return text.trim() !== '' && Number.isFinite(value) && value > 0 ? value : null;
}
