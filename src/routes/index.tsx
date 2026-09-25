import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import type { Session } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";
import { AuthCard } from "@/components/AuthCard";
import { GroceryApp } from "@/components/GroceryApp";
import { HouseholdSetup } from "@/components/HouseholdSetup";
import { useMyHousehold } from "@/lib/household";

export const Route = createFileRoute("/")({
  ssr: false,
  head: () => ({
    meta: [
      { title: "Groceries Hub — shared master & restock lists" },
      {
        name: "description",
        content:
          "A shared family grocery app: keep a permanent master list and a 'Get next time' restock list grouped by store.",
      },
      { property: "og:title", content: "Groceries Hub — shared master & restock lists" },
      {
        property: "og:description",
        content:
          "Keep one shared grocery list for the whole family, with a restock list grouped by Costco, Fred Meyer and Indian store.",
      },
      { property: "og:type", content: "website" },
      { property: "og:url", content: "https://groceries-hub.lovable.app/" },
      { property: "og:site_name", content: "Groceries Hub" },
      { property: "og:image", content: "https://groceries-hub.lovable.app/og-image.jpg" },
      { property: "og:image:width", content: "1200" },
      { property: "og:image:height", content: "630" },
      { name: "twitter:card", content: "summary_large_image" },
      { name: "twitter:title", content: "Groceries Hub — shared master & restock lists" },
      { name: "twitter:description", content: "One shared grocery list for the whole family, grouped by the stores you shop at." },
      { name: "twitter:image", content: "https://groceries-hub.lovable.app/og-image.jpg" },
    ],
  }),
  component: Index,
});

function Index() {
  const [session, setSession] = useState<Session | null>(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const { data: sub } = supabase.auth.onAuthStateChange((_event, next) => {
      setSession(next);
      setReady(true);
    });
    void supabase.auth.getSession().then(({ data }) => {
      setSession(data.session);
      setReady(true);
    });
    return () => sub.subscription.unsubscribe();
  }, []);

  if (!ready) {
    return <div className="min-h-dvh bg-background" />;
  }

  return session ? <SignedIn session={session} /> : <AuthCard />;
}

function SignedIn({ session }: { session: Session }) {
  const { data: household, isLoading, error } = useMyHousehold(session.user.id);
  if (isLoading) return <div className="min-h-dvh bg-background" />;
  if (error) {
    return <p className="p-10 text-center text-sm text-muted-foreground">Could not load your family. Please refresh.</p>;
  }
  if (!household) return <HouseholdSetup />;
  return <GroceryApp session={session} household={household} />;
}
