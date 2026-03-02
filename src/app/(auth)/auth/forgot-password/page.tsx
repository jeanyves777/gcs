"use client";

import { useState } from "react";
import Link from "next/link";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { ArrowLeft, Loader2, Mail } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

const schema = z.object({
  email: z.string().email("Please enter a valid email address"),
});
type FormData = z.infer<typeof schema>;

export default function ForgotPasswordPage() {
  const [submitted, setSubmitted] = useState(false);

  const {
    register,
    handleSubmit,
    getValues,
    formState: { errors, isSubmitting },
  } = useForm<FormData>({ resolver: zodResolver(schema) });

  const onSubmit = async (_data: FormData) => {
    // TODO: implement email sending when email service is configured
    await new Promise((r) => setTimeout(r, 800));
    setSubmitted(true);
  };

  if (submitted) {
    return (
      <Card
        className="shadow-lg border"
        style={{ background: "var(--bg-elevated)", borderColor: "var(--border)" }}
      >
        <CardContent className="pt-8 pb-8 text-center space-y-4">
          <div
            className="w-14 h-14 rounded-full flex items-center justify-center mx-auto"
            style={{ background: "var(--success-bg)" }}
          >
            <Mail className="h-7 w-7" style={{ color: "var(--success)" }} />
          </div>
          <div>
            <h2 className="text-xl font-bold" style={{ color: "var(--text-primary)" }}>
              Check your inbox
            </h2>
            <p className="mt-2 text-sm" style={{ color: "var(--text-secondary)" }}>
              If an account exists for{" "}
              <strong style={{ color: "var(--text-primary)" }}>{getValues("email")}</strong>, we
              sent a password reset link.
            </p>
          </div>
          <Link
            href="/auth/login"
            className="text-sm font-medium hover:underline flex items-center justify-center gap-1.5 mt-2"
            style={{ color: "var(--brand-primary)" }}
          >
            <ArrowLeft className="h-3.5 w-3.5" />
            Back to sign in
          </Link>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card
      className="shadow-lg border"
      style={{ background: "var(--bg-elevated)", borderColor: "var(--border)" }}
    >
      <CardHeader className="space-y-1 pb-4">
        <CardTitle className="text-2xl" style={{ color: "var(--text-primary)" }}>
          Reset your password
        </CardTitle>
        <CardDescription style={{ color: "var(--text-secondary)" }}>
          Enter your email and we&apos;ll send you a reset link.
        </CardDescription>
      </CardHeader>

      <CardContent>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="email" style={{ color: "var(--text-primary)" }}>
              Email address
            </Label>
            <Input
              id="email"
              type="email"
              placeholder="you@company.com"
              autoComplete="email"
              {...register("email")}
              style={{ background: "var(--bg-secondary)", borderColor: "var(--border)", color: "var(--text-primary)" }}
            />
            {errors.email && (
              <p className="text-xs" style={{ color: "var(--error)" }}>
                {errors.email.message}
              </p>
            )}
          </div>

          <Button
            type="submit"
            className="w-full text-white font-medium"
            disabled={isSubmitting}
            style={{ background: "var(--brand-primary)" }}
          >
            {isSubmitting ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Sending link…
              </>
            ) : (
              "Send reset link"
            )}
          </Button>
        </form>

        <div className="mt-4 text-center">
          <Link
            href="/auth/login"
            className="text-sm font-medium hover:underline flex items-center justify-center gap-1.5"
            style={{ color: "var(--brand-primary)" }}
          >
            <ArrowLeft className="h-3.5 w-3.5" />
            Back to sign in
          </Link>
        </div>
      </CardContent>
    </Card>
  );
}
