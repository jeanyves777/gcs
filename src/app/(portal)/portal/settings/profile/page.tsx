"use client";

import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Loader2, User } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";

const schema = z.object({
  name: z.string().min(2, "Name must be at least 2 characters"),
  phone: z.string().max(30).optional().or(z.literal("")),
  jobTitle: z.string().max(100).optional().or(z.literal("")),
});
type FormData = z.infer<typeof schema>;

export default function ProfileSettingsPage() {
  const [email, setEmail] = useState("");
  const [avatar, setAvatar] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const { register, handleSubmit, reset, watch, formState: { errors, isSubmitting } } = useForm<FormData>({
    resolver: zodResolver(schema),
  });

  const name = watch("name") ?? "";
  const initials = name.split(" ").map((n) => n[0]).filter(Boolean).join("").slice(0, 2).toUpperCase() || "?";

  useEffect(() => {
    fetch("/api/portal/profile")
      .then((r) => r.json())
      .then((data) => {
        reset({ name: data.name ?? "", phone: data.phone ?? "", jobTitle: data.jobTitle ?? "" });
        setEmail(data.email ?? "");
        setAvatar(data.avatar ?? null);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, [reset]);

  const onSubmit = async (data: FormData) => {
    const res = await fetch("/api/portal/profile", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    });
    const json = await res.json();
    if (!res.ok) {
      toast.error(json.error ?? "Failed to save profile");
      return;
    }
    toast.success("Profile updated successfully");
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <h1 className="text-2xl font-bold flex items-center gap-2.5" style={{ color: "var(--text-primary)", fontFamily: "var(--font-display)" }}>
          <div className="p-1.5 rounded-lg" style={{ background: "var(--brand-primary)", color: "white" }}>
            <User className="h-5 w-5" />
          </div>
          Profile
        </h1>
        <div className="flex items-center justify-center py-16">
          <Loader2 className="h-6 w-6 animate-spin" style={{ color: "var(--text-muted)" }} />
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <h1
        className="text-2xl font-bold flex items-center gap-2.5"
        style={{ color: "var(--text-primary)", fontFamily: "var(--font-display)" }}
      >
        <div
          className="p-1.5 rounded-lg"
          style={{ background: "var(--brand-primary)", color: "white" }}
        >
          <User className="h-5 w-5" />
        </div>
        Profile
      </h1>
      <Card className="card-base">
        <CardContent className="p-6 space-y-5">
          {/* Avatar */}
          <div className="flex items-center gap-4">
            <Avatar className="h-16 w-16">
              <AvatarImage src={avatar ?? undefined} />
              <AvatarFallback className="text-xl font-bold text-white" style={{ background: "var(--brand-primary)" }}>
                {initials}
              </AvatarFallback>
            </Avatar>
            <div>
              <p className="font-medium text-sm" style={{ color: "var(--text-primary)" }}>{name}</p>
              <p className="text-xs" style={{ color: "var(--text-muted)" }}>{email}</p>
              <Button variant="outline" size="sm" className="mt-2 text-xs h-7" style={{ borderColor: "var(--border)", color: "var(--text-secondary)" }} disabled>
                Change photo
              </Button>
            </div>
          </div>

          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="name" style={{ color: "var(--text-primary)" }}>Full name</Label>
              <Input
                id="name"
                {...register("name")}
                style={{ background: "var(--bg-secondary)", borderColor: "var(--border)", color: "var(--text-primary)" }}
              />
              {errors.name && <p className="text-xs" style={{ color: "var(--error)" }}>{errors.name.message}</p>}
            </div>

            <div className="space-y-1.5">
              <Label style={{ color: "var(--text-primary)" }}>Email</Label>
              <Input
                value={email}
                readOnly
                style={{ background: "var(--bg-tertiary)", borderColor: "var(--border)", color: "var(--text-muted)" }}
              />
              <p className="text-xs" style={{ color: "var(--text-muted)" }}>Email cannot be changed here. Contact support.</p>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="phone" style={{ color: "var(--text-primary)" }}>Phone</Label>
              <Input
                id="phone"
                {...register("phone")}
                placeholder="+1 (555) 000-0000"
                style={{ background: "var(--bg-secondary)", borderColor: "var(--border)", color: "var(--text-primary)" }}
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="jobTitle" style={{ color: "var(--text-primary)" }}>Job title</Label>
              <Input
                id="jobTitle"
                {...register("jobTitle")}
                placeholder="e.g. IT Manager"
                style={{ background: "var(--bg-secondary)", borderColor: "var(--border)", color: "var(--text-primary)" }}
              />
            </div>

            <Button
              type="submit"
              className="text-white font-medium"
              disabled={isSubmitting}
              style={{ background: "var(--brand-primary)" }}
            >
              {isSubmitting ? (
                <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Saving…</>
              ) : (
                "Save changes"
              )}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
