import React, { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Info, KeyRound, Loader2, Save } from "lucide-react";
import { toast } from "sonner";

import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { AvatarUpload } from "@/components/composite/AvatarUpload";
import { PasswordInput } from "@/components/composite/PasswordInput";
import { api, apiError } from "@/lib/api";
import { useAuth } from "@/context/AuthContext";
import {
  passwordDefaultValues,
  passwordSchema,
  profileSchema,
} from "@/lib/validation/profileSchema";

const ROLE_LABELS = {
  admin: "Administrator",
  manager: "Manajer",
  member: "Anggota",
};

/** Reusable configuration section card (R51.1). */
const Section = ({ title, description, children, testid }) => (
  <Card data-testid={testid}>
    <CardHeader>
      <CardTitle className="text-base">{title}</CardTitle>
      {description ? <CardDescription>{description}</CardDescription> : null}
    </CardHeader>
    <CardContent className="space-y-4">{children}</CardContent>
  </Card>
);

/** Save bar at the end of a section flow (R51.2) — never sticky/floating. */
const SaveBar = ({ children }) => (
  <div className="flex justify-end border-t pt-4">{children}</div>
);

/**
 * Profile — self-service account page (configuration pattern R51):
 * stacked section cards, each with its own end-of-flow save bar.
 */
export default function Profile() {
  const { user, setUser } = useAuth();
  const [avatar, setAvatar] = useState(user?.avatar || "");

  const profileForm = useForm({
    resolver: zodResolver(profileSchema),
    defaultValues: {
      name: user?.name || "",
      email: user?.email || "",
      phone: user?.phone || "",
      department: user?.department || "",
    },
    mode: "onSubmit",
  });

  const passwordForm = useForm({
    resolver: zodResolver(passwordSchema),
    defaultValues: passwordDefaultValues,
    mode: "onSubmit",
  });

  const savingProfile = profileForm.formState.isSubmitting;
  const savingPassword = passwordForm.formState.isSubmitting;

  const watchedName = profileForm.watch("name");
  const watchedEmail = profileForm.watch("email");

  const submitProfile = async (values) => {
    try {
      const { data } = await api.put("/profile", { ...values, avatar });
      setUser(data);
      toast.success("Profil diperbarui", {
        description: "Data terkait ikut disesuaikan agar tetap konsisten.",
      });
    } catch (err) {
      toast.error(apiError(err));
    }
  };

  const submitPassword = async (values) => {
    try {
      await api.put("/profile/password", {
        current_password: values.current_password,
        new_password: values.new_password,
      });
      passwordForm.reset(passwordDefaultValues);
      toast.success("Kata sandi berhasil diperbarui");
    } catch (err) {
      toast.error(apiError(err));
    }
  };

  return (
    <div className="space-y-6" data-testid="profile-page">
      <Section
        title="Informasi Diri"
        description="Kelola foto, nama, dan data kontak Anda."
        testid="profile-info-card"
      >
        <div className="flex flex-col gap-4 border-b pb-4 sm:flex-row sm:items-center sm:justify-between">
          <AvatarUpload
            value={avatar}
            onChange={setAvatar}
            name={watchedName || user?.name}
            disabled={savingProfile}
            testid="avatar"
          />
          <div className="space-y-1 sm:text-right">
            <p className="text-sm font-medium" data-testid="profile-summary-name">
              {watchedName || user?.name || "\u2014"}
            </p>
            <p className="text-xs text-muted-foreground">
              {watchedEmail || user?.email || "\u2014"}
            </p>
            <Badge variant="secondary" className="font-normal" data-testid="profile-role-badge">
              {ROLE_LABELS[user?.role] || user?.role || "Anggota"}
            </Badge>
          </div>
        </div>

        <Form {...profileForm}>
          <form
            onSubmit={profileForm.handleSubmit(submitProfile)}
            className="form-dense space-y-4"
            noValidate
          >
            <div className="grid grid-cols-1 items-start gap-x-4 gap-y-2 sm:grid-cols-2">
              <FormField
                control={profileForm.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Nama</FormLabel>
                    <FormControl>
                      <Input data-testid="profile-name" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={profileForm.control}
                name="email"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Email</FormLabel>
                    <FormControl>
                      <Input type="email" data-testid="profile-email" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={profileForm.control}
                name="phone"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Telepon</FormLabel>
                    <FormControl>
                      <Input placeholder="08xxxxxxxxxx" data-testid="profile-phone" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={profileForm.control}
                name="department"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Departemen</FormLabel>
                    <FormControl>
                      <Input placeholder="mis. Operasional" data-testid="profile-department" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <Alert data-testid="profile-sync-note">
              <Info className="h-4 w-4" aria-hidden="true" />
              <AlertDescription>
                Perubahan email atau nomor telepon otomatis disinkronkan ke tugas,
                rapat, dan data terkait lainnya agar tetap konsisten.
              </AlertDescription>
            </Alert>

            <SaveBar>
              <Button
                type="submit"
                size="sm"
                disabled={savingProfile}
                data-testid="btn-save-profile"
              >
                {savingProfile ? (
                  <Loader2 className="size-4 animate-spin" aria-hidden="true" />
                ) : (
                  <Save className="size-4" aria-hidden="true" />
                )}
                Simpan Perubahan
              </Button>
            </SaveBar>
          </form>
        </Form>
      </Section>

      <Section
        title="Ubah Kata Sandi"
        description="Gunakan kata sandi minimal 6 karakter."
        testid="profile-password-card"
      >
        <Form {...passwordForm}>
          <form
            onSubmit={passwordForm.handleSubmit(submitPassword)}
            className="form-dense space-y-4"
            noValidate
          >
            <div className="grid grid-cols-1 items-start gap-x-4 gap-y-2 sm:grid-cols-2">
              <FormField
                control={passwordForm.control}
                name="current_password"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Kata Sandi Saat Ini</FormLabel>
                    <FormControl>
                      <PasswordInput
                        autoComplete="current-password"
                        data-testid="pwd-current"
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={passwordForm.control}
                name="new_password"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Kata Sandi Baru</FormLabel>
                    <FormControl>
                      <PasswordInput
                        autoComplete="new-password"
                        data-testid="pwd-new"
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={passwordForm.control}
                name="confirm"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Konfirmasi Kata Sandi</FormLabel>
                    <FormControl>
                      <PasswordInput
                        autoComplete="new-password"
                        data-testid="pwd-confirm"
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <SaveBar>
              <Button
                type="submit"
                size="sm"
                disabled={savingPassword}
                data-testid="btn-save-password"
              >
                {savingPassword ? (
                  <Loader2 className="size-4 animate-spin" aria-hidden="true" />
                ) : (
                  <KeyRound className="size-4" aria-hidden="true" />
                )}
                Perbarui Kata Sandi
              </Button>
            </SaveBar>
          </form>
        </Form>
      </Section>
    </div>
  );
}
