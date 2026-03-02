"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Eye, EyeOff, Loader2, UserPlus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { toast } from "sonner";

const registerSchema = z.object({
  name: z.string().min(2, "Name must be at least 2 characters"),
  email: z.string().email("Please enter a valid email address"),
  company: z.string().min(1, "Company name is required"),
  password: z
    .string()
    .min(8, "Password must be at least 8 characters")
    .regex(/[A-Z]/, "Must include an uppercase letter")
    .regex(/[a-z]/, "Must include a lowercase letter")
    .regex(/[0-9]/, "Must include a number"),
  confirmPassword: z.string(),
}).refine((data) => data.password === data.confirmPassword, {
  message: "Passwords do not match",
  path: ["confirmPassword"],
});

type RegisterForm = z.infer<typeof registerSchema>;

export default function RegisterPage() {
  const router = useRouter();
  const [showPassword, setShowPassword] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<RegisterForm>({ resolver: zodResolver(registerSchema) });

  const onSubmit = async (data: RegisterForm) => {
    try {
      const res = await fetch("/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: data.name,
          email: data.email,
          company: data.company,
          password: data.password,
        }),
      });

      const json = await res.json();

      if (!res.ok) {
        toast.error(json.error ?? "Registration failed. Please try again.");
        return;
      }

      toast.success("Account created! Please sign in.");
      router.push("/auth/login");
    } catch {
      toast.error("Something went wrong. Please try again.");
    }
  };

  const fields = [
    { id: "name", label: "Full name", type: "text", placeholder: "Jane Smith", autoComplete: "name" },
    { id: "email", label: "Work email", type: "email", placeholder: "jane@company.com", autoComplete: "email" },
    { id: "company", label: "Company name", type: "text", placeholder: "Acme Corporation", autoComplete: "organization" },
  ] as const;

  return (
    <Card
      className="shadow-lg border"
      style={{ background: "var(--bg-elevated)", borderColor: "var(--border)" }}
    >
      <CardHeader className="space-y-1 pb-4">
        <CardTitle className="text-2xl" style={{ color: "var(--text-primary)" }}>
          Request portal access
        </CardTitle>
        <CardDescription style={{ color: "var(--text-secondary)" }}>
          Create your GCS client account to access your projects and support tickets.
        </CardDescription>
      </CardHeader>

      <CardContent>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          {fields.map(({ id, label, type, placeholder, autoComplete }) => (
            <div key={id} className="space-y-2">
              <Label htmlFor={id} style={{ color: "var(--text-primary)" }}>
                {label}
              </Label>
              <Input
                id={id}
                type={type}
                placeholder={placeholder}
                autoComplete={autoComplete}
                {...register(id)}
                style={{ background: "var(--bg-secondary)", borderColor: "var(--border)", color: "var(--text-primary)" }}
              />
              {errors[id] && (
                <p className="text-xs" style={{ color: "var(--error)" }}>
                  {errors[id]?.message}
                </p>
              )}
            </div>
          ))}

          {/* Password */}
          <div className="space-y-2">
            <Label htmlFor="password" style={{ color: "var(--text-primary)" }}>
              Password
            </Label>
            <div className="relative">
              <Input
                id="password"
                type={showPassword ? "text" : "password"}
                placeholder="Min. 8 characters"
                autoComplete="new-password"
                {...register("password")}
                className="pr-10"
                style={{ background: "var(--bg-secondary)", borderColor: "var(--border)", color: "var(--text-primary)" }}
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2"
                style={{ color: "var(--text-muted)" }}
              >
                {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
            {errors.password && (
              <p className="text-xs" style={{ color: "var(--error)" }}>
                {errors.password.message}
              </p>
            )}
          </div>

          {/* Confirm password */}
          <div className="space-y-2">
            <Label htmlFor="confirmPassword" style={{ color: "var(--text-primary)" }}>
              Confirm password
            </Label>
            <Input
              id="confirmPassword"
              type="password"
              placeholder="Repeat password"
              autoComplete="new-password"
              {...register("confirmPassword")}
              style={{ background: "var(--bg-secondary)", borderColor: "var(--border)", color: "var(--text-primary)" }}
            />
            {errors.confirmPassword && (
              <p className="text-xs" style={{ color: "var(--error)" }}>
                {errors.confirmPassword.message}
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
                Creating account…
              </>
            ) : (
              <>
                <UserPlus className="mr-2 h-4 w-4" />
                Create account
              </>
            )}
          </Button>
        </form>
      </CardContent>

      <CardFooter className="pt-0">
        <p className="text-sm text-center w-full" style={{ color: "var(--text-secondary)" }}>
          Already have an account?{" "}
          <Link
            href="/auth/login"
            className="font-medium hover:underline"
            style={{ color: "var(--brand-primary)" }}
          >
            Sign in
          </Link>
        </p>
      </CardFooter>
    </Card>
  );
}
