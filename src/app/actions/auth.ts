"use server";

import { redirect } from "next/navigation";
import { z } from "zod";
import { queryOne } from "@/lib/db";
import { assertAuthConfigured, createSession, destroySession, hashPassword, homeFor, verifyPassword, type Role } from "@/lib/auth";

/** Turn an unexpected server failure into a message the visitor can act on, and log the details. */
function configError(e: unknown): FormState {
  const msg = e instanceof Error ? e.message : String(e);
  console.error("[auth]", e);
  if (/DATABASE_URL/.test(msg)) return { error: "The site isn't connected to its database yet (DATABASE_URL is missing). Please contact the administrator." };
  if (/AUTH_SECRET/.test(msg)) return { error: "The site's AUTH_SECRET setting is missing or too short. Please contact the administrator." };
  if (/relation .* does not exist/.test(msg)) return { error: "The database tables haven't been created yet. Please contact the administrator." };
  return { error: "Something went wrong on our side. Please try again in a moment." };
}

export interface FormState {
  error?: string;
  ok?: string;
}

const registerSchema = z.object({
  fullName: z.string().trim().min(2, "Enter your full name").max(120),
  email: z.string().trim().toLowerCase().email("Enter a valid email address"),
  phone: z.string().trim().max(40).optional(),
  company: z.string().trim().max(120).optional(),
  password: z.string().min(8, "Password must be at least 8 characters").max(200),
});

export async function registerAction(_: FormState, formData: FormData): Promise<FormState> {
  const parsed = registerSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { error: parsed.error.issues[0].message };
  const { fullName, email, phone, company, password } = parsed.data;

  try {
    assertAuthConfigured();
    const existing = await queryOne("SELECT 1 FROM users WHERE email = $1", [email]);
    if (existing) return { error: "An account with that email already exists. Please sign in." };

    const row = await queryOne<{ id: string }>(
      "INSERT INTO users (email, password_hash, full_name, phone, company) VALUES ($1, $2, $3, $4, $5) RETURNING id",
      [email, await hashPassword(password), fullName, phone || null, company || null],
    );
    await createSession(row!.id);
  } catch (e) {
    return configError(e);
  }
  redirect("/dashboard");
}

export async function loginAction(_: FormState, formData: FormData): Promise<FormState> {
  const email = String(formData.get("email") ?? "").trim().toLowerCase();
  const password = String(formData.get("password") ?? "");
  const next = String(formData.get("next") ?? "");
  let role: Role;
  try {
    const user = await queryOne<{ id: string; password_hash: string; role: Role }>(
      "SELECT id, password_hash, role FROM users WHERE email = $1",
      [email],
    );
    if (!user || !(await verifyPassword(password, user.password_hash))) return { error: "Invalid email or password." };
    await createSession(user.id);
    role = user.role;
  } catch (e) {
    return configError(e);
  }
  redirect(next.startsWith("/") && !next.startsWith("//") ? next : homeFor(role));
}

export async function logoutAction() {
  await destroySession();
  redirect("/");
}

