"use client";

import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Loader2, Send } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";

const schema = z.object({
  name: z.string().min(2, "Name is required"),
  email: z.string().email("Valid email required"),
  company: z.string().optional(),
  subject: z.string().min(1, "Please select a subject"),
  message: z.string().min(20, "Please provide more details (min 20 characters)"),
});

type FormData = z.infer<typeof schema>;

const subjects = [
  "Managed IT Services inquiry",
  "Custom software project",
  "Enterprise solution discussion",
  "Cloud management consultation",
  "Cybersecurity assessment",
  "General inquiry",
];

export function ContactForm() {
  const { register, handleSubmit, setValue, reset, formState: { errors, isSubmitting } } = useForm<FormData>({
    resolver: zodResolver(schema),
  });

  const onSubmit = async (data: FormData) => {
    const res = await fetch("/api/contact", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    });
    if (res.ok) {
      toast.success("Message sent! We'll be in touch within one business day.");
      reset();
    } else {
      const { error } = await res.json().catch(() => ({ error: "Something went wrong." }));
      toast.error(error ?? "Failed to send. Please try again.");
    }
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {[
          { id: "name", label: "Full name", placeholder: "Jane Smith", type: "text" },
          { id: "email", label: "Email", placeholder: "jane@company.com", type: "email" },
        ].map(({ id, label, placeholder, type }) => (
          <div key={id} className="space-y-1.5">
            <Label htmlFor={id} style={{ color: "var(--text-primary)" }}>{label}</Label>
            <Input id={id} type={type} placeholder={placeholder} {...register(id as keyof FormData)}
              style={{ background: "var(--bg-secondary)", borderColor: "var(--border)", color: "var(--text-primary)" }} />
            {errors[id as keyof FormData] && <p className="text-xs" style={{ color: "var(--error)" }}>{errors[id as keyof FormData]?.message}</p>}
          </div>
        ))}
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="company" style={{ color: "var(--text-primary)" }}>Company (optional)</Label>
        <Input id="company" placeholder="Acme Corp" {...register("company")}
          style={{ background: "var(--bg-secondary)", borderColor: "var(--border)", color: "var(--text-primary)" }} />
      </div>

      <div className="space-y-1.5">
        <Label style={{ color: "var(--text-primary)" }}>Subject</Label>
        <Select onValueChange={(v) => setValue("subject", v)}>
          <SelectTrigger style={{ background: "var(--bg-secondary)", borderColor: "var(--border)", color: "var(--text-primary)" }}>
            <SelectValue placeholder="What can we help with?" />
          </SelectTrigger>
          <SelectContent>
            {subjects.map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}
          </SelectContent>
        </Select>
        {errors.subject && <p className="text-xs" style={{ color: "var(--error)" }}>{errors.subject.message}</p>}
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="message" style={{ color: "var(--text-primary)" }}>Message</Label>
        <Textarea id="message" rows={5} placeholder="Tell us about your needs..." {...register("message")}
          style={{ background: "var(--bg-secondary)", borderColor: "var(--border)", color: "var(--text-primary)" }} />
        {errors.message && <p className="text-xs" style={{ color: "var(--error)" }}>{errors.message.message}</p>}
      </div>

      <Button type="submit" className="w-full text-white font-medium" disabled={isSubmitting} style={{ background: "var(--brand-primary)" }}>
        {isSubmitting ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Sending…</> : <><Send className="mr-2 h-4 w-4" />Send message</>}
      </Button>
    </form>
  );
}
