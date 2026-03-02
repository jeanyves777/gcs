import { Suspense } from "react";
import Link from "next/link";
import { CheckCircle2 } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

export default function InvoiceSuccessPage() {
  return (
    <Suspense fallback={null}>
      <div className="max-w-md mx-auto mt-16">
        <Card className="card-base text-center">
          <CardContent className="pt-10 pb-10 space-y-4">
            <div className="w-16 h-16 rounded-full flex items-center justify-center mx-auto" style={{ background: "var(--success-bg)" }}>
              <CheckCircle2 className="h-8 w-8" style={{ color: "var(--success)" }} />
            </div>
            <div>
              <h1 className="text-2xl font-bold" style={{ color: "var(--text-primary)", fontFamily: "var(--font-display)" }}>
                Payment successful!
              </h1>
              <p className="mt-2 text-sm" style={{ color: "var(--text-secondary)" }}>
                Thank you — your invoice has been paid. A receipt will be sent to your email.
              </p>
            </div>
            <Button asChild className="text-white" style={{ background: "var(--brand-primary)" }}>
              <Link href="/portal/invoices">View invoices</Link>
            </Button>
          </CardContent>
        </Card>
      </div>
    </Suspense>
  );
}
