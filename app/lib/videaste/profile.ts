/* Identity fields of a videographer (own profile page and admin edit form), validated on the server. */

export type ProfileInput = { firstName: string; lastName: string; phone: string; specialties: string[] };

/** Validated identity fields (shared with the admin edit form): names, phone, up to 12 specialties. */
export function parseProfileInput(input: ProfileInput) {
  const clean = (v: unknown, max: number) => {
    const s = String(v ?? "").trim();
    return s.length > max ? undefined : s || null;
  };
  const first = clean(input?.firstName, 80);
  const last = clean(input?.lastName, 80);
  const phone = clean(input?.phone, 40);
  const specialties = Array.isArray(input?.specialties)
    ? [...new Set(input.specialties.map((s) => String(s ?? "").trim()).filter(Boolean))]
    : null;
  if (first === undefined || last === undefined || phone === undefined || !specialties) return null;
  if (phone && !/^[+0-9 ().-]{4,40}$/.test(phone)) return null;
  if (specialties.length > 12 || specialties.some((s) => s.length > 40)) return null;
  return { first_name: first, last_name: last, phone, specialties };
}
