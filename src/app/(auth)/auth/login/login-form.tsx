"use client";

import { useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { signIn } from "next-auth/react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Eye, EyeOff, Loader2, LogIn } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { toast } from "sonner";

const loginSchema = z.object({
  email: z.string().email("Please enter a valid email address"),
  password: z.string().min(1, "Password is required"),
  remember: z.boolean().optional(),
});

type LoginForm = z.infer<typeof loginSchema>;

export function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const callbackUrl = searchParams.get("callbackUrl") ?? "/portal";
  const [showPassword, setShowPassword] = useState(false);

  const {
    register,
    handleSubmit,
    setValue,
    formState: { errors, isSubmitting },
  } = useForm<LoginForm>({ resolver: zodResolver(loginSchema) });

  const onSubmit = async (data: LoginForm) => {
    try {
      const result = await signIn("credentials", {
        email: data.email,
        password: data.password,
        redirect: false,
      });

      if (result?.error) {
        toast.error("Invalid email or password. Please try again.");
        return;
      }

      toast.success("Welcome back!");
      router.push(callbackUrl);
      router.refresh();
    } catch {
      toast.error("Something went wrong. Please try again.");
    }
  };

  return (
    <Card
      className="shadow-lg border"
      style={{ background: "var(--bg-elevated)", borderColor: "var(--border)" }}
    >
      <CardHeader className="space-y-1 pb-4">
        <CardTitle className="text-2xl" style={{ color: "var(--text-primary)" }}>
          Welcome back
        </CardTitle>
        <CardDescription style={{ color: "var(--text-secondary)" }}>
          Sign in to your GCS client portal
        </CardDescription>
      </CardHeader>

      <CardContent>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="email" style={{ color: "var(--text-primary)" }}>Email address</Label>
            <Input id="email" type="email" placeholder="you@company.com" autoComplete="email" {...register("email")}
              style={{ background: "var(--bg-secondary)", borderColor: "var(--border)", color: "var(--text-primary)" }} />
            {errors.email && <p className="text-xs" style={{ color: "var(--error)" }}>{errors.email.message}</p>}
          </div>

          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label htmlFor="password" style={{ color: "var(--text-primary)" }}>Password</Label>
              <Link href="/auth/forgot-password" className="text-xs hover:underline" style={{ color: "var(--brand-primary)" }}>
                Forgot password?
              </Link>
            </div>
            <div className="relative">
              <Input id="password" type={showPassword ? "text" : "password"} placeholder="••••••••" autoComplete="current-password"
                {...register("password")} className="pr-10"
                style={{ background: "var(--bg-secondary)", borderColor: "var(--border)", color: "var(--text-primary)" }} />
              <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-3 top-1/2 -translate-y-1/2" style={{ color: "var(--text-muted)" }}>
                {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
            {errors.password && <p className="text-xs" style={{ color: "var(--error)" }}>{errors.password.message}</p>}
          </div>

          <div className="flex items-center gap-2">
            <Checkbox id="remember" onCheckedChange={(c) => setValue("remember", !!c)} />
            <Label htmlFor="remember" className="text-sm font-normal cursor-pointer" style={{ color: "var(--text-secondary)" }}>
              Remember me for 30 days
            </Label>
          </div>

          <Button type="submit" className="w-full text-white font-medium" disabled={isSubmitting} style={{ background: "var(--brand-primary)" }}>
            {isSubmitting ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Signing in…</> : <><LogIn className="mr-2 h-4 w-4" />Sign in</>}
          </Button>
        </form>
      </CardContent>

      <CardFooter className="pt-0">
        <p className="text-sm text-center w-full" style={{ color: "var(--text-secondary)" }}>
          Don&apos;t have an account?{" "}
          <Link href="/auth/register" className="font-medium hover:underline" style={{ color: "var(--brand-primary)" }}>Request access</Link>
        </p>
      </CardFooter>
    </Card>
  );
}
