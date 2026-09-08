export function parseAllowedGoogleEmails(configured: string | undefined) {
  if (!configured) return new Set<string>();
  return new Set(configured.split(",").map((email) => email.trim().toLowerCase()).filter(Boolean));
}

export function isAllowedGoogleEmail(email: string, configured: string | undefined) {
  return parseAllowedGoogleEmails(configured).has(email.trim().toLowerCase());
}
