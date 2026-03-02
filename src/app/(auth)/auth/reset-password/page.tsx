"use client";

import { Suspense, useState } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import Link from "next/link";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { ArrowLeft, CheckCircle2, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

const schema = z.object({
  password: z.string().min(8, "Password must be at least 8 characters"),
  confirmPassword: z.string(),
}).refine((d) => d.password === d.confirmPassword, {
  message: "Passwords do not match",
  path: ["confirmPassword"],
});
type FormData = z.infer<typeof schema>;

function ResetPasswordForm() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const token = searchParams.get("token");
  const [done, setDone] = useState(false);
  const [serverError, setServerError] = useState("");

  const { register, handleSubmit, formState: { errors, isSubmitting } } = useForm<FormData>({
    resolver: zodResolver(schema),
  });

  const onSubmit = async (data: FormData) => {
    setServerError("");
    const res = await fetch("/api/auth/reset-password", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ token, password: data.password }),
    });
    const json = await res.json();
    if (!res.ok) {
      setServerError(json.error ?? "Something went wrong");
      return;
    }
    setDone(true);
    setTimeout(() => router.push("/auth/login"), 3000);
  };

  if (!token) {
    return (
      <Card className="shadow-lg border" style={{ background: "var(--bg-elevated)", borderColor: "var(--border)" }}>
        <CardContent className="pt-8 pb-8 text-center space-y-4">
          <p style={{ color: "var(--text-secondary)" }}>Invalid or missing reset token.</p>
          <Link href="/auth/forgot-password" className="text-sm font-medium hover:underline" style={{ color: "var(--brand-primary)" }}>
            Request a new reset link
          </Link>
        </CardContent>
      </Card>
    );
  }

  if (done) {
    return (
      <Card className="shadow-lg border" style={{ background: "var(--bg-elevated)", borderColor: "var(--border)" }}>
        <CardContent className="pt-8 pb-8 text-center space-y-4">
          <div className="w-14 h-14 rounded-full flex items-center justify-center mx-auto" style={{ background: "var(--success-bg)" }}>
            <CheckCircle2 className="h-7 w-7" style={{ color: "var(--success)" }} />
          </div>
          <div>
            <h2 className="text-xl font-bold" style={{ color: "var(--text-primary)" }}>Password updated!</h2>
            <p className="mt-2 text-sm" style={{ color: "var(--text-secondary)" }}>Redirecting you to sign in…</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="shadow-lg border" style={{ background: "var(--bg-elevated)", borderColor: "var(--border)" }}>
      <CardHeader className="space-y-1 pb-4">
        <CardTitle className="text-2xl" style={{ color: "var(--text-primary)" }}>Set new password</CardTitle>
        <CardDescription style={{ color: "var(--text-secondary)" }}>Choose a strong password for your account.</CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          {serverError && (
            <p className="text-sm rounded-lg px-3 py-2" style={{ background: "var(--error-bg)", color: "var(--error)" }}>
              {serverError}
            </p>
          )}
          <div className="space-y-2">
            <Label htmlFor="password" style={{ color: "var(--text-primary)" }}>New password</Label>
            <Input id="password" type="password" autoComplete="new-password" {...register("password")}
              style={{ background: "var(--bg-secondary)", borderColor: "var(--border)", color: "var(--text-primary)" }} />
            {errors.password && <p className="text-xs" style={{ color: "var(--error)" }}>{errors.password.message}</p>}
          </div>
          <div className="space-y-2">
            <Label htmlFor="confirmPassword" style={{ color: "var(--text-primary)" }}>Confirm password</Label>
            <Input id="confirmPassword" type="password" autoComplete="new-password" {...register("confirmPassword")}
              style={{ background: "var(--bg-secondary)", borderColor: "var(--border)", color: "var(--text-primary)" }} />
            {errors.confirmPassword && <p className="text-xs" style={{ color: "var(--error)" }}>{errors.confirmPassword.message}</p>}
          </div>
          <Button type="submit" className="w-full text-white font-medium" disabled={isSubmitting} style={{ background: "var(--brand-primary)" }}>
            {isSubmitting ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Updating…</> : "Set new password"}
          </Button>
        </form>
        <div className="mt-4 text-center">
          <Link href="/auth/login" className="text-sm font-medium hover:underline flex items-center justify-center gap-1.5" style={{ color: "var(--brand-primary)" }}>
            <ArrowLeft className="h-3.5 w-3.5" />
            Back to sign in
          </Link>
        </div>
      </CardContent>
    </Card>
  );
}

export default function ResetPasswordPage() {
  return (
    <Suspense fallback={
      <Card className="shadow-lg border" style={{ background: "var(--bg-elevated)", borderColor: "var(--border)" }}>
        <CardContent className="pt-8 pb-8 text-center">
          <Loader2 className="h-6 w-6 animate-spin mx-auto" style={{ color: "var(--text-muted)" }} />
        </CardContent>
      </Card>
    }>
      <ResetPasswordForm />
    </Suspense>
  );
}
