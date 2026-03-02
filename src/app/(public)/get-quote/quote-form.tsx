"use client";

import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Loader2, Send } from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";

const services = ["Managed IT Services", "Custom Software Dev", "Enterprise Solutions", "Cloud Management", "Cybersecurity", "Other"];
const budgets = ["< $5,000", "$5,000 – $15,000", "$15,000 – $50,000", "$50,000 – $100,000", "$100,000+", "Ongoing retainer"];

const schema = z.object({
  name: z.string().min(2),
  email: z.string().email(),
  company: z.string().min(1),
  phone: z.string().optional(),
  services: z.array(z.string()).min(1, "Select at least one service"),
  budget: z.string().min(1),
  timeline: z.string().min(1),
  description: z.string().min(30, "Please describe your needs in at least 30 characters"),
});
type FormData = z.infer<typeof schema>;

export function QuoteForm() {
  const [selectedServices, setSelectedServices] = useState<string[]>([]);
  const { register, handleSubmit, setValue, reset, formState: { errors, isSubmitting } } = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: { services: [] },
  });

  const toggleService = (s: string) => {
    const updated = selectedServices.includes(s) ? selectedServices.filter((x) => x !== s) : [...selectedServices, s];
    setSelectedServices(updated);
    setValue("services", updated);
  };

  const onSubmit = async (_data: FormData) => {
    await new Promise((r) => setTimeout(r, 1000));
    toast.success("Quote request submitted! We'll reach out within one business day.");
    reset();
    setSelectedServices([]);
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {[
          { id: "name", label: "Full name *", placeholder: "Jane Smith" },
          { id: "email", label: "Email *", placeholder: "jane@company.com", type: "email" },
          { id: "company", label: "Company *", placeholder: "Acme Corp" },
          { id: "phone", label: "Phone", placeholder: "+1 (555) 000-0000" },
        ].map(({ id, label, placeholder, type }) => (
          <div key={id} className="space-y-1.5">
            <Label htmlFor={id} style={{ color: "var(--text-primary)" }}>{label}</Label>
            <Input id={id} type={type ?? "text"} placeholder={placeholder} {...register(id as keyof FormData)}
              style={{ background: "var(--bg-secondary)", borderColor: "var(--border)", color: "var(--text-primary)" }} />
            {errors[id as keyof FormData] && <p className="text-xs" style={{ color: "var(--error)" }}>{errors[id as keyof FormData]?.message?.toString()}</p>}
          </div>
        ))}
      </div>

      <div className="space-y-2">
        <Label style={{ color: "var(--text-primary)" }}>Services needed *</Label>
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
          {services.map((s) => (
            <label key={s} className="flex items-center gap-2 cursor-pointer p-2 rounded-lg hover:bg-[var(--bg-secondary)] transition-colors">
              <Checkbox checked={selectedServices.includes(s)} onCheckedChange={() => toggleService(s)} />
              <span className="text-sm" style={{ color: "var(--text-secondary)" }}>{s}</span>
            </label>
          ))}
        </div>
        {errors.services && <p className="text-xs" style={{ color: "var(--error)" }}>{errors.services.message}</p>}
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="space-y-1.5">
          <Label style={{ color: "var(--text-primary)" }}>Budget range *</Label>
          <Select onValueChange={(v) => setValue("budget", v)}>
            <SelectTrigger style={{ background: "var(--bg-secondary)", borderColor: "var(--border)", color: "var(--text-primary)" }}>
              <SelectValue placeholder="Select budget" />
            </SelectTrigger>
            <SelectContent>
              {budgets.map((b) => <SelectItem key={b} value={b}>{b}</SelectItem>)}
            </SelectContent>
          </Select>
          {errors.budget && <p className="text-xs" style={{ color: "var(--error)" }}>{errors.budget.message}</p>}
        </div>
        <div className="space-y-1.5">
          <Label style={{ color: "var(--text-primary)" }}>Timeline *</Label>
          <Select onValueChange={(v) => setValue("timeline", v)}>
            <SelectTrigger style={{ background: "var(--bg-secondary)", borderColor: "var(--border)", color: "var(--text-primary)" }}>
              <SelectValue placeholder="When do you need this?" />
            </SelectTrigger>
            <SelectContent>
              {["ASAP", "Within 1 month", "1–3 months", "3–6 months", "6+ months", "No specific timeline"].map((t) => (
                <SelectItem key={t} value={t}>{t}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          {errors.timeline && <p className="text-xs" style={{ color: "var(--error)" }}>{errors.timeline.message}</p>}
        </div>
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="description" style={{ color: "var(--text-primary)" }}>Project description *</Label>
        <Textarea id="description" rows={5} placeholder="Describe your needs, current challenges, and what success looks like..." {...register("description")}
          style={{ background: "var(--bg-secondary)", borderColor: "var(--border)", color: "var(--text-primary)" }} />
        {errors.description && <p className="text-xs" style={{ color: "var(--error)" }}>{errors.description.message}</p>}
      </div>

      <Button type="submit" size="lg" className="w-full text-white font-medium" disabled={isSubmitting} style={{ background: "var(--brand-primary)" }}>
        {isSubmitting ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Submitting…</> : <><Send className="mr-2 h-4 w-4" />Submit quote request</>}
      </Button>
    </form>
  );
}
