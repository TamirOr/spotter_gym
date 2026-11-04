// Check-in ids are generated on the phone, so a retry after poor gym reception cannot create a duplicate.
export function newId(): string {
  return globalThis.crypto.randomUUID();
}
