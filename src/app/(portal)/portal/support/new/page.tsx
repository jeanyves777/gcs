"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Loader2, Sparkles, ChevronDown, ChevronUp } from "lucide-react";
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
  const { register, handleSubmit, setValue, watch, formState: { errors, isSubmitting } } = useForm<FormData>({ resolver: zodResolver(schema) });

  const [aiOpen, setAiOpen] = useState(false);
  const [aiDraft, setAiDraft] = useState("");
  const [aiLoading, setAiLoading] = useState(false);

  const subject = watch("subject") ?? "";

  const getAISuggestion = async () => {
    if (!subject.trim()) {
      toast.error("Enter a subject first so AI can help describe the issue.");
      return;
    }
    setAiLoading(true);
    setAiDraft("");
    try {
      const res = await fetch("/api/portal/ai/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          messages: [{
            role: "user",
            content: `I need to write a detailed support ticket description for this IT issue: "${subject}". Please write a clear, professional description (3-5 sentences) that includes: what the problem is, its potential impact, and any helpful context. Just the description text, no intro or preamble.`,
          }],
        }),
      });
      if (!res.ok || !res.body) { toast.error("AI unavailable. Try again later."); setAiLoading(false); return; }
      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let text = "";
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        text += decoder.decode(value, { stream: true });
        setAiDraft(text);
      }
    } catch {
      toast.error("AI unavailable. Try again later.");
    }
    setAiLoading(false);
  };

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
    <div className="space-y-6">
      <h1 className="text-2xl font-bold" style={{ color: "var(--text-primary)", fontFamily: "var(--font-display)" }}>Open a Support Ticket</h1>

      {/* AI Helper Panel */}
      <Card className="card-base overflow-hidden" style={{ borderColor: aiOpen ? "var(--brand-primary)" : "var(--border)" }}>
        <button
          type="button"
          onClick={() => setAiOpen(!aiOpen)}
          className="w-full flex items-center gap-2.5 px-4 py-3 text-left"
          style={{ background: aiOpen ? "var(--brand-primary)10" : "transparent" }}
        >
          <Sparkles className="h-4 w-4 flex-shrink-0" style={{ color: "var(--brand-primary)" }} />
          <span className="text-sm font-medium flex-1" style={{ color: "var(--text-primary)" }}>
            Ask AI to help describe your issue
          </span>
          {aiOpen ? <ChevronUp className="h-4 w-4" style={{ color: "var(--text-muted)" }} /> : <ChevronDown className="h-4 w-4" style={{ color: "var(--text-muted)" }} />}
        </button>

        {aiOpen && (
          <CardContent className="px-4 pb-4 pt-0 space-y-3 border-t" style={{ borderColor: "var(--border)" }}>
            <p className="text-xs pt-3" style={{ color: "var(--text-muted)" }}>
              Fill in the subject above, then click below — AI will draft a description you can use.
            </p>
            <Button
              type="button"
              size="sm"
              onClick={getAISuggestion}
              disabled={aiLoading || !subject.trim()}
              className="text-white text-xs gap-1.5"
              style={{ background: "var(--brand-primary)" }}
            >
              {aiLoading ? <><Loader2 className="h-3.5 w-3.5 animate-spin" />Generating…</> : <><Sparkles className="h-3.5 w-3.5" />Get AI suggestion</>}
            </Button>
            {aiDraft && (
              <div className="space-y-2">
                <div
                  className="rounded-lg px-3 py-2.5 text-sm whitespace-pre-wrap"
                  style={{ background: "var(--bg-secondary)", color: "var(--text-secondary)", border: "1px solid var(--border)" }}
                >
                  {aiDraft}
                </div>
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  className="text-xs"
                  onClick={() => { setValue("description", aiDraft, { shouldValidate: true }); toast.success("Description filled in!"); }}
                >
                  Use this description
                </Button>
              </div>
            )}
          </CardContent>
        )}
      </Card>

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
