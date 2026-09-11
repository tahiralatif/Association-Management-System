"use client";

import { useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { PageHeader } from "@/components/ui/shared";
import { CheckCircle, XCircle, ArrowLeft, CreditCard } from "lucide-react";
import Link from "next/link";

export default function CheckoutResultPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [status, setStatus] = useState<"success" | "cancelled" | "loading">("loading");

  useEffect(() => {
    // The Stripe redirect includes session_id in query params
    const sessionId = searchParams.get("session_id");
    if (sessionId) {
      // Verify the session (optional — the webhook already handles marking as paid)
      setStatus("success");
    } else {
      // No session_id means user came from cancel URL or direct access
      setStatus("cancelled");
    }
  }, [searchParams]);

  return (
    <div className="min-h-screen bg-slate-50">
      <PageHeader
        title="Payment"
        description="Stripe Checkout result"
      />
      <div className="max-w-lg mx-auto mt-8 px-4">
        <Card>
          <CardContent className="p-8 text-center">
            {status === "success" && (
              <div className="space-y-4">
                <div className="w-16 h-16 rounded-full bg-green-100 flex items-center justify-center mx-auto">
                  <CheckCircle className="h-8 w-8 text-green-600" />
                </div>
                <h2 className="text-2xl font-bold text-slate-900">Payment Successful!</h2>
                <p className="text-slate-500">
                  Your payment has been processed. The invoice will be updated shortly.
                </p>
                <p className="text-sm text-slate-400">
                  You'll receive a confirmation email shortly.
                </p>
                <div className="pt-4">
                  <Link href="/my-invoices">
                    <Button className="gap-2">
                      <ArrowLeft className="h-4 w-4" />
                      Back to Invoices
                    </Button>
                  </Link>
                </div>
              </div>
            )}
            {status === "cancelled" && (
              <div className="space-y-4">
                <div className="w-16 h-16 rounded-full bg-orange-100 flex items-center justify-center mx-auto">
                  <XCircle className="h-8 w-8 text-orange-600" />
                </div>
                <h2 className="text-2xl font-bold text-slate-900">Payment Cancelled</h2>
                <p className="text-slate-500">
                  No payment was made. Your invoice is still pending.
                </p>
                <p className="text-sm text-slate-400">
                  You can try again anytime from your invoices page.
                </p>
                <div className="pt-4 flex gap-3 justify-center">
                  <Link href="/my-invoices">
                    <Button variant="outline" className="gap-2">
                      <ArrowLeft className="h-4 w-4" />
                      Back to Invoices
                    </Button>
                  </Link>
                </div>
              </div>
            )}
            {status === "loading" && (
              <div className="space-y-4">
                <div className="w-16 h-16 rounded-full bg-blue-100 flex items-center justify-center mx-auto animate-pulse">
                  <CreditCard className="h-8 w-8 text-blue-600" />
                </div>
                <h2 className="text-2xl font-bold text-slate-900">Processing…</h2>
                <p className="text-slate-500">Checking payment status…</p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
