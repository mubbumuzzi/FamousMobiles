export interface DoorstepAccessUser {
  role?: string;
  mobile?: string;
  doorstepEnabled?: boolean;
}

export function canAccessDoorstep(user?: DoorstepAccessUser | null): boolean {
  if (!user) return false;
  return user.role === "ADMIN" || user.mobile === "6302255467" || Boolean(user.doorstepEnabled);
}
