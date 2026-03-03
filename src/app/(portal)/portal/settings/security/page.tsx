"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Loader2, Shield, Smartphone, Key, Eye, EyeOff } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { toast } from "sonner";

const schema = z
  .object({
    currentPassword: z.string().min(1, "Current password is required"),
    newPassword: z.string().min(8, "Password must be at least 8 characters"),
    confirmPassword: z.string(),
  })
  .refine((d) => d.newPassword === d.confirmPassword, {
    message: "Passwords do not match",
    path: ["confirmPassword"],
  });
type FormData = z.infer<typeof schema>;

function PasswordChangeDialog({ open, onClose }: { open: boolean; onClose: () => void }) {
  const [showCurrent, setShowCurrent] = useState(false);
  const [showNew, setShowNew] = useState(false);

  const { register, handleSubmit, reset, formState: { errors, isSubmitting } } = useForm<FormData>({
    resolver: zodResolver(schema),
  });

  const onSubmit = async (data: FormData) => {
    const res = await fetch("/api/portal/password", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ currentPassword: data.currentPassword, newPassword: data.newPassword }),
    });
    const json = await res.json();
    if (!res.ok) {
      toast.error(json.error ?? "Failed to change password");
      return;
    }
    toast.success("Password changed successfully");
    reset();
    onClose();
  };

  const handleClose = () => {
    reset();
    onClose();
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent style={{ background: "var(--bg-elevated)", borderColor: "var(--border)" }}>
        <DialogHeader>
          <DialogTitle style={{ color: "var(--text-primary)" }}>Change Password</DialogTitle>
          <DialogDescription style={{ color: "var(--text-secondary)" }}>
            Enter your current password, then choose a new one.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4 mt-2">
          <div className="space-y-1.5">
            <Label style={{ color: "var(--text-primary)" }}>Current password</Label>
            <div className="relative">
              <Input
                type={showCurrent ? "text" : "password"}
                {...register("currentPassword")}
                style={{ background: "var(--bg-secondary)", borderColor: "var(--border)", color: "var(--text-primary)" }}
              />
              <button
                type="button"
                onClick={() => setShowCurrent((s) => !s)}
                className="absolute right-3 top-1/2 -translate-y-1/2"
                style={{ color: "var(--text-muted)" }}
              >
                {showCurrent ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
            {errors.currentPassword && <p className="text-xs" style={{ color: "var(--error)" }}>{errors.currentPassword.message}</p>}
          </div>

          <div className="space-y-1.5">
            <Label style={{ color: "var(--text-primary)" }}>New password</Label>
            <div className="relative">
              <Input
                type={showNew ? "text" : "password"}
                {...register("newPassword")}
                style={{ background: "var(--bg-secondary)", borderColor: "var(--border)", color: "var(--text-primary)" }}
              />
              <button
                type="button"
                onClick={() => setShowNew((s) => !s)}
                className="absolute right-3 top-1/2 -translate-y-1/2"
                style={{ color: "var(--text-muted)" }}
              >
                {showNew ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
            {errors.newPassword && <p className="text-xs" style={{ color: "var(--error)" }}>{errors.newPassword.message}</p>}
          </div>

          <div className="space-y-1.5">
            <Label style={{ color: "var(--text-primary)" }}>Confirm new password</Label>
            <Input
              type="password"
              {...register("confirmPassword")}
              style={{ background: "var(--bg-secondary)", borderColor: "var(--border)", color: "var(--text-primary)" }}
            />
            {errors.confirmPassword && <p className="text-xs" style={{ color: "var(--error)" }}>{errors.confirmPassword.message}</p>}
          </div>

          <div className="flex gap-2 pt-2">
            <Button type="button" variant="outline" className="flex-1" onClick={handleClose} style={{ borderColor: "var(--border)", color: "var(--text-secondary)" }}>
              Cancel
            </Button>
            <Button type="submit" className="flex-1 text-white" disabled={isSubmitting} style={{ background: "var(--brand-primary)" }}>
              {isSubmitting ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Saving…</> : "Change password"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}

export default function SecuritySettingsPage() {
  const [passwordDialogOpen, setPasswordDialogOpen] = useState(false);

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold" style={{ color: "var(--text-primary)", fontFamily: "var(--font-display)" }}>Security</h1>
      <div className="space-y-4">
        <Card className="card-base">
          <CardContent className="p-5 flex items-center gap-4">
            <div className="w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0" style={{ background: "var(--bg-tertiary)" }}>
              <Key className="h-5 w-5" style={{ color: "var(--brand-primary)" }} />
            </div>
            <div className="flex-1">
              <p className="font-medium text-sm" style={{ color: "var(--text-primary)" }}>Password</p>
              <p className="text-xs" style={{ color: "var(--text-muted)" }}>Update your account password.</p>
            </div>
            <Button
              variant="outline"
              size="sm"
              className="text-xs h-7"
              onClick={() => setPasswordDialogOpen(true)}
              style={{ borderColor: "var(--border)", color: "var(--text-secondary)" }}
            >
              Change password
            </Button>
          </CardContent>
        </Card>

        {[
          { icon: Smartphone, title: "Two-Factor Authentication", desc: "Add an extra layer of security with TOTP.", action: "Enable 2FA" },
          { icon: Shield, title: "Active Sessions", desc: "Manage where you're signed in.", action: "View sessions" },
        ].map(({ icon: Icon, title, desc, action }) => (
          <Card key={title} className="card-base">
            <CardContent className="p-5 flex items-center gap-4">
              <div className="w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0" style={{ background: "var(--bg-tertiary)" }}>
                <Icon className="h-5 w-5" style={{ color: "var(--brand-primary)" }} />
              </div>
              <div className="flex-1">
                <p className="font-medium text-sm" style={{ color: "var(--text-primary)" }}>{title}</p>
                <p className="text-xs" style={{ color: "var(--text-muted)" }}>{desc}</p>
              </div>
              <Button variant="outline" size="sm" disabled className="text-xs h-7" style={{ borderColor: "var(--border)", color: "var(--text-secondary)" }}>
                {action}
                <Badge className="ml-2 text-[9px] h-4 px-1.5" style={{ background: "var(--bg-tertiary)", color: "var(--text-muted)" }}>Phase 2</Badge>
              </Button>
            </CardContent>
          </Card>
        ))}
      </div>

      <PasswordChangeDialog open={passwordDialogOpen} onClose={() => setPasswordDialogOpen(false)} />
    </div>
  );
}
