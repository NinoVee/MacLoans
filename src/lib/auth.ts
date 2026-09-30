import "server-only";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { SignJWT, jwtVerify } from "jose";
import bcrypt from "bcryptjs";
import { queryOne } from "./db";

export type Role = "applicant" | "underwriter" | "admin";
export interface SessionUser {
  id: string;
  email: string;
  fullName: string;
  role: Role;
}

const COOKIE = "macloans_session";
const MAX_AGE = 60 * 60 * 8; // 8 hours

function secret() {
  const s = process.env.AUTH_SECRET;
  if (!s || s.length < 16) throw new Error("AUTH_SECRET must be set to a random string of at least 16 characters.");
  return new TextEncoder().encode(s);
}

export const hashPassword = (pw: string) => bcrypt.hash(pw, 12);
export const verifyPassword = (pw: string, hash: string) => bcrypt.compare(pw, hash);

export async function createSession(userId: string) {
  const token = await new SignJWT({})
    .setProtectedHeader({ alg: "HS256" })
    .setSubject(userId)
    .setIssuedAt()
    .setExpirationTime(`${MAX_AGE}s`)
    .sign(secret());
  (await cookies()).set(COOKIE, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: MAX_AGE,
  });
}

export async function destroySession() {
  (await cookies()).delete(COOKIE);
}

/** Current user, re-read from the database so role changes and deletions take effect immediately. */
export async function getSessionUser(): Promise<SessionUser | null> {
  const token = (await cookies()).get(COOKIE)?.value;
  if (!token) return null;
  try {
    const { payload } = await jwtVerify(token, secret());
    if (!payload.sub) return null;
    const row = await queryOne<{ id: string; email: string; full_name: string; role: Role }>(
      "SELECT id, email, full_name, role FROM users WHERE id = $1",
      [payload.sub],
    );
    return row ? { id: row.id, email: row.email, fullName: row.full_name, role: row.role } : null;
  } catch {
    return null;
  }
}

export async function requireUser(roles?: Role[]): Promise<SessionUser> {
  const user = await getSessionUser();
  if (!user) redirect("/login");
  if (roles && !roles.includes(user.role)) redirect(homeFor(user.role));
  return user;
}

export const isStaff = (u: SessionUser) => u.role === "underwriter" || u.role === "admin";

export function homeFor(role: Role) {
  return role === "applicant" ? "/dashboard" : "/underwriter";
}
