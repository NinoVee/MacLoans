import type { Metadata } from "next";
import { AuthLayout } from "@/components/AuthLayout";
import { LoginForm } from "@/components/AuthForms";

export const metadata: Metadata = { title: "Sign in" };

export default async function LoginPage({ searchParams }: { searchParams: Promise<{ next?: string }> }) {
  const { next } = await searchParams;
  return (
    <AuthLayout title="Welcome back" subtitle="Borrowers, lenders and underwriters sign in here.">
      <LoginForm next={next} />
    </AuthLayout>
  );
}
