import type { Metadata } from "next";
import { AuthLayout } from "@/components/AuthLayout";
import { RegisterForm } from "@/components/AuthForms";

export const metadata: Metadata = { title: "Create an account" };

export default function RegisterPage() {
  return (
    <AuthLayout title="Create your account" subtitle="Apply, upload documents and track your loan from application to closing.">
      <RegisterForm />
    </AuthLayout>
  );
}
