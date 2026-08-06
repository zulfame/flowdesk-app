import React from "react";

import { AuthLayout } from "@/components/layout/AuthLayout";
import { LoginForm } from "@/components/auth/LoginForm";
import { Card, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

/** Login page — AuthLayout + Card (header/body) + LoginForm. */
export default function Login() {
  return (
    <AuthLayout>
      <Card className="border-border/60" data-testid="login-page">
        <CardHeader>
          <CardTitle className="text-2xl">Masuk</CardTitle>
          <CardDescription>
            Masukkan kredensial Anda untuk melanjutkan.
          </CardDescription>
        </CardHeader>
        <LoginForm />
      </Card>
    </AuthLayout>
  );
}
