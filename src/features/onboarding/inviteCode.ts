// Invite codes are six characters without look-alikes. The server checks validity; this only tidies input.
const CODE_PATTERN = /^[A-HJ-NP-Z2-9]{6}$/;

export function normalizeInviteCode(input: string): string {
  return input.replace(/\s+/g, '').toUpperCase();
}

export function isWellFormedInviteCode(input: string): boolean {
  return CODE_PATTERN.test(normalizeInviteCode(input));
}

/** The link friends open in Safari. It shows the install steps and the code. */
export function inviteUrl(origin: string, code: string): string {
  return `${origin}/welcome?code=${encodeURIComponent(code)}`;
}

export function codeFromParam(param: string | string[] | undefined): string {
  const value = Array.isArray(param) ? param[0] : param;
  return value && isWellFormedInviteCode(value) ? normalizeInviteCode(value) : '';
}
