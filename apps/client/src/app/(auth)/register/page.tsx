"use client";

import { RegisterForm } from "@/features/auth/components/RegisterForm";

export default function RegisterPage() {
  return (
    <div className="container" style={{ display: "flex", justifyContent: "center", alignItems: "center", minHeight: "calc(100vh - 150px)" }}>
      <RegisterForm />
    </div>
  );
}
