export function normalizeTags(tags: string[]) {
  return [...new Set(tags.map((tag) => tag.trim().toLowerCase()).filter(Boolean))];
}

export function normalizeInviteCode(code: string) {
  return code.trim().toUpperCase();
}
