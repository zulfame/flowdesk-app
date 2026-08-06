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
            Silakan masuk menggunakan akun Anda dengan email, username atau nomor hp dan kata sandi yang telah terdaftar.
          </CardDescription>
        </CardHeader>
        <LoginForm />
      </Card>
    </AuthLayout>
  );
}
