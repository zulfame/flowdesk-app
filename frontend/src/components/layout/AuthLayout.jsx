import React from "react";
import { CalendarDays, CheckSquare, Video, Waves } from "lucide-react";

import { Separator } from "@/components/ui/separator";
import { useBranding } from "@/context/BrandingContext";

/**
 * AuthLayout
 * Split-screen shell for authentication pages: left brand panel (desktop only,
 * decorative token-based grid overlay) + right content panel (`max-w-md`).
 * Brand identity is driven by the Branding settings (Kelola Aplikasi).
 */
const highlights = [
  {
    icon: CheckSquare,
    title: "Tugas dengan progres otomatis",
    description: "Checklist menentukan progres dan status tugas secara otomatis.",
  },
  {
    icon: Video,
    title: "Rapat sebagai buku catatan digital",
    description: "Agenda, catatan, keputusan, dan tindak lanjut dalam satu tempat.",
  },
  {
    icon: CalendarDays,
    title: "Kalender terpadu",
    description: "Rapat, tenggat tugas, dan pengingat tampil dalam satu kalender.",
  },
];

export const AuthLayout = ({ children }) => {
  const { branding } = useBranding();

  const appName = branding?.app_name || "FlowDesk";
  const tagline = branding?.company || "Work Management System";
  const description =
    branding?.meta_description ||
    "Sederhana untuk digunakan, kuat di balik layar. Pahami dalam lima menit.";
  const copyright =
    branding?.footer_text || `\u00A9 ${new Date().getFullYear()} ${appName}`;
  const supportEmail = branding?.support_email || "";
  const logoUrl = branding?.logo || "";

  return (
    <div className="grid min-h-screen w-full lg:grid-cols-2">
      {/* Brand panel — desktop only */}
      <aside className="relative hidden flex-col justify-between overflow-hidden bg-primary p-10 text-primary-foreground lg:flex xl:p-14">
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-0 bg-[linear-gradient(to_right,hsl(var(--primary-foreground)/0.06)_1px,transparent_1px),linear-gradient(to_bottom,hsl(var(--primary-foreground)/0.06)_1px,transparent_1px)] bg-[size:44px_44px] [mask-image:radial-gradient(ellipse_at_top_left,black,transparent_75%)]"
        />

        <div
          className="relative z-10 flex items-center gap-2.5"
          data-testid="auth-brand-desktop"
        >
          {logoUrl ? (
            <img
              src={logoUrl}
              alt={appName}
              className="h-9 w-auto max-w-[180px] object-contain"
              data-testid="auth-brand-logo"
            />
          ) : (
            <span className="flex h-9 w-9 items-center justify-center rounded-md bg-primary-foreground/10 ring-1 ring-inset ring-primary-foreground/20">
              <Waves className="h-5 w-5" aria-hidden="true" />
            </span>
          )}
          <span className="flex flex-col">
            <span
              className="text-sm font-semibold tracking-tight"
              data-testid="auth-brand-name"
            >
              {appName}
            </span>
            <span className="text-xs text-primary-foreground/60">{tagline}</span>
          </span>
        </div>

        <div className="relative z-10 max-w-md space-y-8">
          <div className="space-y-3">
            <h1 className="text-3xl font-semibold leading-tight tracking-tight xl:text-4xl">
              Kelola pekerjaan harian dengan tenang.
            </h1>
            <p
              className="text-sm leading-relaxed text-primary-foreground/70"
              data-testid="auth-brand-description"
            >
              {description}
            </p>
          </div>

          <Separator className="bg-primary-foreground/15" />

          <ul className="space-y-6">
            {highlights.map(({ icon: Icon, title, description: desc }) => (
              <li key={title} className="flex items-start gap-3">
                <span className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-md bg-primary-foreground/10">
                  <Icon className="h-4 w-4" aria-hidden="true" />
                </span>
                <div className="space-y-0.5">
                  <p className="text-sm font-medium">{title}</p>
                  <p className="text-sm leading-relaxed text-primary-foreground/60">
                    {desc}
                  </p>
                </div>
              </li>
            ))}
          </ul>
        </div>

        <p
          className="relative z-10 text-xs text-primary-foreground/50"
          data-testid="auth-brand-copyright"
        >
          {copyright}
        </p>
      </aside>

      {/* Content panel */}
      <main className="flex flex-col items-center justify-center bg-background px-4 py-10 sm:px-6 lg:px-8">
        <div className="w-full max-w-md">
          {/* Brand — mobile only */}
          <div
            className="mb-8 flex items-center gap-2.5 lg:hidden"
            data-testid="auth-brand-mobile"
          >
            {logoUrl ? (
              <img
                src={logoUrl}
                alt={appName}
                className="h-9 w-auto max-w-[180px] object-contain"
              />
            ) : (
              <span className="flex h-9 w-9 items-center justify-center rounded-md bg-primary text-primary-foreground">
                <Waves className="h-5 w-5" aria-hidden="true" />
              </span>
            )}
            <span className="flex flex-col">
              <span className="text-sm font-semibold tracking-tight text-foreground">
                {appName}
              </span>
              <span className="text-xs text-muted-foreground">{tagline}</span>
            </span>
          </div>

          {children}

          {/* Kontak & Footer — dari Kelola Aplikasi */}
          <div
            className="mt-8 space-y-1 text-center text-xs text-muted-foreground"
            data-testid="auth-footer"
          >
            {supportEmail ? (
              <p>
                Butuh bantuan?{" "}
                <a
                  href={`mailto:${supportEmail}`}
                  className="font-medium text-foreground underline-offset-4 hover:underline"
                  data-testid="auth-support-email"
                >
                  {supportEmail}
                </a>
              </p>
            ) : null}
            <p data-testid="auth-footer-text">{copyright}</p>
          </div>
        </div>
      </main>
    </div>
  );
};
