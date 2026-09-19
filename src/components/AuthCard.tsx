import { useState } from "react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { lovable } from "@/integrations/lovable/index";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ShoppingBasket } from "lucide-react";

export function AuthCard() {
  const [email, setEmail] = useState("");
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState(false);

  async function sendLink(e: React.FormEvent) {
    e.preventDefault();
    if (!email.trim()) return;
    setSending(true);
    const { error } = await supabase.auth.signInWithOtp({
      email: email.trim(),
      options: { emailRedirectTo: window.location.origin },
    });
    setSending(false);
    if (error) {
      toast.error(error.message);
      return;
    }
    setSent(true);
  }

  async function googleSignIn() {
    const result = await lovable.auth.signInWithOAuth("google", {
      redirect_uri: window.location.origin,
    });
    if (result.error) {
      toast.error("Could not sign in with Google. Please try the email link.");
    }
  }

  return (
    <main className="flex min-h-dvh items-center justify-center bg-background px-5 py-10">
      <div className="w-full max-w-sm">
        <div className="mb-8 text-center">
          <div className="mx-auto mb-4 flex size-14 items-center justify-center rounded-2xl bg-primary text-primary-foreground">
            <ShoppingBasket className="size-7" />
          </div>
          <h1 className="font-display text-3xl font-semibold text-foreground">Family Groceries</h1>
          <p className="mt-2 text-sm text-muted-foreground">
            One shared list for the whole family.
          </p>
        </div>

        <div className="rounded-2xl border border-border bg-card p-6 shadow-sm">
          {sent ? (
            <div className="space-y-3 text-center">
              <h2 className="font-display text-xl font-semibold text-card-foreground">
                Check your email
              </h2>
              <p className="text-sm text-muted-foreground">
                We sent a sign-in link to <span className="font-medium">{email}</span>. Open it on
                this device to get in — no password needed.
              </p>
              <Button variant="ghost" className="w-full" onClick={() => setSent(false)}>
                Use a different email
              </Button>
            </div>
          ) : (
            <form onSubmit={sendLink} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="email">Email address</Label>
                <Input
                  id="email"
                  type="email"
                  inputMode="email"
                  autoComplete="email"
                  placeholder="you@example.com"
                  className="h-12 text-base"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                />
              </div>
              <Button type="submit" className="h-12 w-full text-base" disabled={sending}>
                {sending ? "Sending…" : "Email me a sign-in link"}
              </Button>
              <div className="flex items-center gap-3 text-xs text-muted-foreground">
                <span className="h-px flex-1 bg-border" />
                or
                <span className="h-px flex-1 bg-border" />
              </div>
              <Button
                type="button"
                variant="outline"
                className="h-12 w-full text-base"
                onClick={googleSignIn}
              >
                Continue with Google
              </Button>
            </form>
          )}
        </div>
      </div>
    </main>
  );
}
