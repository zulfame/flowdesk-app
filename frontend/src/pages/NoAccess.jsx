import React from "react";
import { ShieldAlert } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { useAuth } from "@/context/AuthContext";

/** Ditampilkan bagi pengguna yang jabatannya belum diberi izin menu apa pun. */
export default function NoAccess() {
  const { user, logout } = useAuth();

  return (
    <div className="flex min-h-svh items-center justify-center p-6" data-testid="no-access-page">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <ShieldAlert className="size-4" aria-hidden="true" />
            Akses belum dikonfigurasi
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          <p className="text-muted-foreground">
            Akun <span className="font-medium text-foreground">{user?.email}</span> sudah dikenali,
            tetapi jabatan Anda belum diberi izin menu apa pun.
          </p>
          <p className="text-muted-foreground">
            Hubungi administrator agar izin jabatan{" "}
            <span className="font-medium text-foreground">{user?.role}</span> diatur di Kelola
            Peranan.
          </p>
        </CardContent>
        <CardFooter className="justify-end">
          <Button variant="outline" size="sm" onClick={logout} data-testid="no-access-logout">
            Keluar
          </Button>
        </CardFooter>
      </Card>
    </div>
  );
}
