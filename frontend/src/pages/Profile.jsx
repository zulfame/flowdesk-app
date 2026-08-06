import React, { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Info, Loader2, Save } from "lucide-react";

import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardFooter,
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
import { notify } from "@/lib/notify";
import { useAuth } from "@/context/AuthContext";
import { ACTION } from "@/constants/labels";
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

/**
 * FormSection — reusable configuration section (R51.1) whose submit action lives
 * in the Card **footer** (`CardFooter justify-end gap-2`, FD5) instead of a
 * hand-rolled save bar inside the body.
 */
const FormSection = ({
  title,
  form,
  onSubmit,
  submitting,
  submitTestId,
  testid,
  children,
}) => (
  <Card data-testid={testid}>
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} noValidate>
        <CardHeader>
          <CardTitle className="text-base">{title}</CardTitle>
        </CardHeader>
        <CardContent className="form-dense space-y-4">{children}</CardContent>
        <CardFooter className="justify-end gap-2">
          <Button type="submit" size="sm" disabled={submitting} data-testid={submitTestId}>
            {submitting ? (
              <Loader2 className="size-4 animate-spin" aria-hidden="true" />
            ) : (
              <Save className="size-4" aria-hidden="true" />
            )}
            {submitting ? ACTION.saving : ACTION.save}
          </Button>
        </CardFooter>
      </form>
    </Form>
  </Card>
);

/**
 * Profile — self-service account page (configuration pattern R51 + FD5):
 * stacked section cards, each submitting from its own Card footer.
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

  const submitProfile = async (values) => {
    try {
      const { data } = await api.put("/profile", { ...values, avatar });
      setUser(data);
      notify.success(
        "Profil diperbarui. Data terkait ikut disesuaikan agar tetap konsisten."
      );
    } catch (err) {
      notify.error(apiError(err));
    }
  };

  const submitPassword = async (values) => {
    try {
      await api.put("/profile/password", {
        current_password: values.current_password,
        new_password: values.new_password,
      });
      passwordForm.reset(passwordDefaultValues);
      notify.success("Kata sandi berhasil diperbarui.");
    } catch (err) {
      notify.error(apiError(err));
    }
  };

  return (
    <div className="space-y-6" data-testid="profile-page">
      <FormSection
        title="Informasi Diri"
        form={profileForm}
        onSubmit={submitProfile}
        submitting={savingProfile}
        submitTestId="btn-save-profile"
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
            <Badge variant="secondary" className="font-normal" data-testid="profile-role-badge">
              {ROLE_LABELS[user?.role] || user?.role || "Anggota"}
            </Badge>
          </div>
        </div>

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
      </FormSection>

      <FormSection
        title="Ubah Kata Sandi"
        form={passwordForm}
        onSubmit={submitPassword}
        submitting={savingPassword}
        submitTestId="btn-save-password"
        testid="profile-password-card"
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
              /* Forces a new row: current password sits alone above (UX request). */
              <FormItem className="sm:col-start-1">
                <FormLabel>Kata Sandi Baru</FormLabel>
                <FormControl>
                  <PasswordInput
                    autoComplete="new-password"
                    placeholder="Minimal 6 karakter"
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
      </FormSection>
    </div>
  );
}
