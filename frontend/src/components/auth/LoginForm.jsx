import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { AlertCircle, Loader2, LogIn } from "lucide-react";

import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { CardContent, CardFooter } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { PasswordInput } from "@/components/composite/PasswordInput";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { loginSchema, loginDefaultValues } from "@/lib/validation/authSchema";
import { useAuth } from "@/context/AuthContext";
import { apiError } from "@/lib/api";
import { notify } from "@/lib/notify";
import { LOGIN } from "@/constants/testIds/auth";

const REMEMBER_KEY = "flowdesk.rememberedEmail";

/**
 * LoginForm
 * Email + password sign-in against the existing JWT endpoint. Composed from
 * shadcn/ui primitives + react-hook-form/zod (R15/R22). Auth flow itself is
 * unchanged in this redesign phase — only the UI was rebuilt.
 */
export const LoginForm = () => {
  const navigate = useNavigate();
  const { login } = useAuth();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formError, setFormError] = useState("");

  const form = useForm({
    resolver: zodResolver(loginSchema),
    defaultValues: loginDefaultValues,
    mode: "onSubmit",
  });

  useEffect(() => {
    const remembered = window.localStorage.getItem(REMEMBER_KEY);
    if (remembered) {
      form.setValue("email", remembered);
      form.setValue("remember", true);
    }
  }, [form]);

  const onSubmit = async (values) => {
    setFormError("");
    setIsSubmitting(true);
    try {
      const email = values.email.trim();
      const user = await login(email, values.password);
      if (values.remember) {
        window.localStorage.setItem(REMEMBER_KEY, email);
      } else {
        window.localStorage.removeItem(REMEMBER_KEY);
      }
      notify.success(`Selamat datang kembali, ${user?.name || email}.`);
      navigate("/");
    } catch (err) {
      setFormError(apiError(err) || "Tidak dapat masuk. Silakan coba lagi.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Form {...form}>
      <form
        onSubmit={form.handleSubmit(onSubmit)}
        className="form-dense"
        noValidate
      >
        <CardContent className="space-y-[var(--field-gap)]">
        {formError ? (
          <Alert variant="destructive" data-testid="login-error-alert">
            <AlertCircle className="h-4 w-4" aria-hidden="true" />
            <AlertTitle>Gagal masuk</AlertTitle>
            <AlertDescription>{formError}</AlertDescription>
          </Alert>
        ) : null}

        <FormField
          control={form.control}
          name="email"
          render={({ field }) => (
            <FormItem>
              <FormLabel className="text-sm">Kredensial</FormLabel>
              <FormControl>
                <Input
                  type="text"
                  autoComplete="username"
                  placeholder="Email, Username atau Nomor HP"
                  data-testid={LOGIN.emailInput}
                  {...field}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="password"
          render={({ field }) => (
            <FormItem>
              <FormLabel className="text-sm">Kata Sandi</FormLabel>
              <FormControl>
                <PasswordInput
                  autoComplete="current-password"
                  placeholder="*****************************"
                  data-testid={LOGIN.passwordInput}
                  {...field}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="remember"
          render={({ field }) => (
            <FormItem className="flex flex-row items-center space-x-2 space-y-0">
              <FormControl>
                <Checkbox
                  checked={field.value}
                  onCheckedChange={field.onChange}
                  data-testid="login-remember-checkbox"
                />
              </FormControl>
              <FormLabel className="text-sm font-normal text-muted-foreground">
                Ingat email saya
              </FormLabel>
            </FormItem>
          )}
        />

        </CardContent>
        <CardFooter>
        <Button
          type="submit"
          className="w-full"
          disabled={isSubmitting}
          data-testid={LOGIN.submitButton}
        >
          {isSubmitting ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
              Memproses...
            </>
          ) : (
            <>
              <LogIn className="h-4 w-4" aria-hidden="true" /> Masuk
            </>
          )}
        </Button>
        </CardFooter>
      </form>
    </Form>
  );
};
