"use server";

import { redirect } from "next/navigation";
import { z } from "zod";
import { queryOne } from "@/lib/db";
import { createSession, destroySession, hashPassword, homeFor, verifyPassword, type Role } from "@/lib/auth";

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

  const existing = await queryOne("SELECT 1 FROM users WHERE email = $1", [email]);
  if (existing) return { error: "An account with that email already exists. Please sign in." };

  const row = await queryOne<{ id: string }>(
    "INSERT INTO users (email, password_hash, full_name, phone, company) VALUES ($1, $2, $3, $4, $5) RETURNING id",
    [email, await hashPassword(password), fullName, phone || null, company || null],
  );
  await createSession(row!.id);
  redirect("/dashboard");
}

export async function loginAction(_: FormState, formData: FormData): Promise<FormState> {
  const email = String(formData.get("email") ?? "").trim().toLowerCase();
  const password = String(formData.get("password") ?? "");
  const next = String(formData.get("next") ?? "");
  const user = await queryOne<{ id: string; password_hash: string; role: Role }>(
    "SELECT id, password_hash, role FROM users WHERE email = $1",
    [email],
  );
  if (!user || !(await verifyPassword(password, user.password_hash))) return { error: "Invalid email or password." };
  await createSession(user.id);
  redirect(next.startsWith("/") && !next.startsWith("//") ? next : homeFor(user.role));
}

export async function logoutAction() {
  await destroySession();
  redirect("/");
}

