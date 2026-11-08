const CODE_LENGTH = 6;

/** Keeps only digits, as typed or pasted from the email. */
export function cleanCode(input: string): string {
  return input.replace(/\D/g, '').slice(0, CODE_LENGTH);
}

export function isCompleteCode(code: string): boolean {
  return code.length === CODE_LENGTH;
}

/** A light check before sending; the server decides whether the address works. */
export function looksLikeEmail(input: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(input.trim());
}
