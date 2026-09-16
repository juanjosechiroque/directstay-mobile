/**
 * Guest profile (the authenticated user's own data). `email` comes from Supabase Auth;
 * display name and phone live in the owner-scoped `profiles` row. Never exposed to other
 * users or to the public catalog.
 */
export interface GuestProfile {
  id: string;
  displayName: string;
  email: string;
  phone: string | null;
  memberSince: string;
}
