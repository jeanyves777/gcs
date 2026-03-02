"use client";
import type { Metadata } from "next";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { toast } from "sonner";

const schema = z.object({
  subject: z.string().min(5, "Subject must be at least 5 characters"),
  description: z.string().min(20, "Please provide more detail"),
  category: z.string().min(1),
  priority: z.string().min(1),
});
type FormData = z.infer<typeof schema>;

export default function NewTicketPage() {
  const router = useRouter();
  const { register, handleSubmit, setValue, formState: { errors, isSubmitting } } = useForm<FormData>({ resolver: zodResolver(schema) });

  const onSubmit = async (data: FormData) => {
    const res = await fetch("/api/portal/support", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    });
    const json = await res.json();
    if (!res.ok) {
      toast.error(json.error ?? "Failed to submit ticket");
      return;
    }
    toast.success("Ticket submitted! We'll respond within 4 hours.");
    router.push("/portal/support");
  };

  return (
    <div className="max-w-2xl space-y-6">
      <h1 className="text-2xl font-bold" style={{ color: "var(--text-primary)", fontFamily: "var(--font-display)" }}>Open a Support Ticket</h1>
      <Card className="card-base">
        <CardContent className="p-6">
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            <div className="space-y-1.5">
              <Label style={{ color: "var(--text-primary)" }}>Subject *</Label>
              <Input placeholder="Brief description of your issue" {...register("subject")} style={{ background: "var(--bg-secondary)", borderColor: "var(--border)", color: "var(--text-primary)" }} />
              {errors.subject && <p className="text-xs" style={{ color: "var(--error)" }}>{errors.subject.message}</p>}
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label style={{ color: "var(--text-primary)" }}>Category *</Label>
                <Select onValueChange={(v) => setValue("category", v)}>
                  <SelectTrigger style={{ background: "var(--bg-secondary)", borderColor: "var(--border)", color: "var(--text-primary)" }}><SelectValue placeholder="Select category" /></SelectTrigger>
                  <SelectContent>
                    {["GENERAL", "BILLING", "TECHNICAL", "FEATURE", "OTHER"].map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}
                  </SelectContent>
                </Select>
                {errors.category && <p className="text-xs" style={{ color: "var(--error)" }}>{errors.category.message}</p>}
              </div>
              <div className="space-y-1.5">
                <Label style={{ color: "var(--text-primary)" }}>Priority *</Label>
                <Select onValueChange={(v) => setValue("priority", v)}>
                  <SelectTrigger style={{ background: "var(--bg-secondary)", borderColor: "var(--border)", color: "var(--text-primary)" }}><SelectValue placeholder="Select priority" /></SelectTrigger>
                  <SelectContent>
                    {["LOW", "MEDIUM", "HIGH", "CRITICAL"].map((p) => <SelectItem key={p} value={p}>{p}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="space-y-1.5">
              <Label style={{ color: "var(--text-primary)" }}>Description *</Label>
              <Textarea rows={6} placeholder="Describe your issue in detail..." {...register("description")} style={{ background: "var(--bg-secondary)", borderColor: "var(--border)", color: "var(--text-primary)" }} />
              {errors.description && <p className="text-xs" style={{ color: "var(--error)" }}>{errors.description.message}</p>}
            </div>
            <Button type="submit" className="w-full text-white" disabled={isSubmitting} style={{ background: "var(--brand-primary)" }}>
              {isSubmitting ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Submitting…</> : "Submit ticket"}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
