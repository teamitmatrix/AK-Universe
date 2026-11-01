/** Password rules shown on the signup form (same as the static site). */
export const PASSWORD_RULES = {
  len: (v: string) => v.length >= 8,
  upper: (v: string) => /[A-Z]/.test(v),
  digit: (v: string) => /\d/.test(v),
  lower: (v: string) => /[a-z]/.test(v),
};

export function isStrongPassword(value: string) {
  return Object.values(PASSWORD_RULES).every((rule) => rule(value));
}
