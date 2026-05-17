import type { Metadata } from "next";
import Link from "next/link";
import { FadeUp, FadeIn, StaggerContainer, StaggerItem } from "@/components/shared/motion";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  ArrowRight,
  Store,
  Target,
  MapPin,
  Award,
  PenLine,
  Star,
  Share2,
  BookMarked,
  LocateFixed,
  Search,
  BarChart3,
  MousePointerClick,
  CalendarCheck,
  Video,
  LayoutTemplate,
} from "lucide-react";
import { LocalSEOIllustration } from "@/components/shared/illustrations";

export const metadata: Metadata = {
  title: "Google Business Profile & Local SEO",
  description:
    "GCS helps local businesses get found on Google Search and Google Maps — through profile optimization, local SEO, weekly content, reputation management, and monthly reporting.",
};

const coreFeatures = [
  {
    icon: Store,
    title: "Google Business Profile Setup & Optimization",
    desc: "We set up and optimize your profile from top to bottom — accurate info, strong visuals, and the right categories so you make a great first impression.",
  },
  {
    icon: Target,
    title: "Local SEO Strategy",
    desc: "A targeted approach to improving how your business ranks in local search results, built around your services and the neighborhoods you serve.",
  },
  {
    icon: MapPin,
    title: "Google Maps Visibility",
    desc: "We optimize your presence so customers searching nearby can actually find you — not just your competitors.",
  },
  {
    icon: Award,
    title: "Local 3-Pack Targeting",
    desc: "The Local 3-Pack is prime real estate on Google. We work to position your business as one of the top three results for local searches that matter.",
  },
  {
    icon: PenLine,
    title: "Weekly Posts & Content Updates",
    desc: "Regular Google Business posts keep your profile active and give customers timely reasons to choose you. We handle the writing and publishing.",
  },
  {
    icon: Star,
    title: "Reputation & Review Management",
    desc: "We help you build a strong review presence and coach you on responding professionally — turning feedback into a competitive advantage.",
  },
  {
    icon: Share2,
    title: "Social Media Profile Linking",
    desc: "Connecting your social profiles to your Google listing signals consistency to search engines and gives customers more ways to engage.",
  },
  {
    icon: BookMarked,
    title: "Business Citations & Directory Listings",
    desc: "We get your business listed accurately across the directories that matter — improving local authority and reducing conflicting information online.",
  },
  {
    icon: LocateFixed,
    title: "Location Geo-Tagging",
    desc: "Geo-tagged content reinforces your local relevance to Google and helps customers find you exactly where you operate.",
  },
  {
    icon: Search,
    title: "Keyword Tracking & Local Targeting",
    desc: "We track how you rank for the searches your customers actually use — and adjust strategy as those rankings move.",
  },
  {
    icon: BarChart3,
    title: "Online Reporting Portal",
    desc: "You get a clear view of your performance — search impressions, profile views, calls, and direction requests — without needing to dig through Google on your own.",
  },
  {
    icon: MousePointerClick,
    title: "Conversion Tracking",
    desc: "We measure what matters: calls, website clicks, and direction requests so you can see the real business impact of your local SEO work.",
  },
  {
    icon: CalendarCheck,
    title: "Monthly Performance Review",
    desc: "A monthly walkthrough of your results, what moved, what we're adjusting, and what's coming next — so you're always in the loop.",
  },
];

const addOns = [
  {
    icon: Video,
    title: "Business Video & YouTube Channel Setup",
    desc: "A professional YouTube presence can strengthen your local authority and give customers a richer look at your business before they call. We handle setup, basic optimization, and your first business video.",
    color: "#EF4444",
  },
  {
    icon: LayoutTemplate,
    title: "Website Redesign & Local SEO Support",
    desc: "If your current website isn't pulling its weight, we can redesign it from the ground up — SEO-friendly structure, mobile-ready design, engaging content, and conversion tools built in from the start.",
    color: "var(--brand-primary)",
  },
];

export default function LocalSEOPage() {
  return (
    <>
      <section className="pt-8 pb-16 lg:pt-12 lg:pb-20" style={{ background: "var(--bg-primary)" }}>
        <div className="container-gcs">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
            <FadeUp>
              <Badge
                className="mb-6"
                style={{ background: "var(--bg-tertiary)", color: "var(--brand-primary)", border: "1px solid var(--border)" }}
              >
                Google Business Profile & Local SEO
              </Badge>
              <h1 className="font-black mb-6" style={{ fontFamily: "var(--font-display)" }}>
                Get found by local customers —{" "}
                <span className="text-gradient">on Google, where it counts</span>
              </h1>
              <p className="text-lg max-w-2xl mb-8" style={{ color: "var(--text-secondary)" }}>
                GCS helps businesses improve their Google Business Profile, build local SEO momentum, increase visibility on Google Maps, and grow a stronger online reputation. We handle the work so you can focus on serving customers.
              </p>
              <div className="flex flex-wrap gap-3">
                <Button asChild className="text-white" style={{ background: "var(--brand-primary)" }}>
                  <Link href="/get-quote">
                    Get a quote <ArrowRight className="ml-2 h-4 w-4" />
                  </Link>
                </Button>
                <Button
                  asChild
                  variant="outline"
                  style={{ borderColor: "var(--border)", color: "var(--text-primary)" }}
                >
                  <Link href="/contact">Talk to us first</Link>
                </Button>
              </div>
            </FadeUp>
            <div className="hidden sm:block">
              <FadeIn delay={0.2}>
                <LocalSEOIllustration />
              </FadeIn>
            </div>
          </div>
        </div>
      </section>

      <section className="section-padding" style={{ background: "var(--bg-secondary)" }}>
        <div className="container-gcs">
          <FadeUp className="text-center mb-12">
            <h2 className="font-bold mb-3" style={{ fontFamily: "var(--font-display)" }}>
              What&apos;s included
            </h2>
            <p className="max-w-xl mx-auto" style={{ color: "var(--text-secondary)" }}>
              Everything you need to build a visible, credible local presence on Google.
            </p>
          </FadeUp>
          <StaggerContainer className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {coreFeatures.map(({ icon: Icon, title, desc }) => (
              <StaggerItem key={title}>
                <div className="card-base p-6">
                  <div
                    className="w-11 h-11 rounded-lg flex items-center justify-center mb-4"
                    style={{ background: "var(--bg-tertiary)" }}
                  >
                    <Icon className="h-5 w-5" style={{ color: "var(--brand-primary)" }} />
                  </div>
                  <h3 className="font-semibold mb-2" style={{ color: "var(--text-primary)" }}>
                    {title}
                  </h3>
                  <p className="text-sm" style={{ color: "var(--text-secondary)" }}>
                    {desc}
                  </p>
                </div>
              </StaggerItem>
            ))}
          </StaggerContainer>
        </div>
      </section>

      <section className="section-padding" style={{ background: "var(--bg-primary)" }}>
        <div className="container-gcs">
          <FadeUp className="text-center mb-10">
            <Badge
              className="mb-4"
              style={{ background: "var(--bg-tertiary)", color: "var(--text-secondary)", border: "1px solid var(--border)" }}
            >
              Optional Add-Ons
            </Badge>
            <h2 className="font-bold mb-3" style={{ fontFamily: "var(--font-display)" }}>
              Take it further
            </h2>
            <p className="max-w-xl mx-auto" style={{ color: "var(--text-secondary)" }}>
              Pair your local SEO work with these services for a stronger overall presence.
            </p>
          </FadeUp>
          <StaggerContainer className="grid grid-cols-1 md:grid-cols-2 gap-6 max-w-3xl mx-auto">
            {addOns.map(({ icon: Icon, title, desc, color }) => (
              <StaggerItem key={title}>
                <div className="card-base p-6 h-full">
                  <div
                    className="w-11 h-11 rounded-lg flex items-center justify-center mb-4"
                    style={{ background: "var(--bg-tertiary)" }}
                  >
                    <Icon className="h-5 w-5" style={{ color }} />
                  </div>
                  <h3 className="font-semibold mb-2" style={{ color: "var(--text-primary)" }}>
                    {title}
                  </h3>
                  <p className="text-sm" style={{ color: "var(--text-secondary)" }}>
                    {desc}
                  </p>
                </div>
              </StaggerItem>
            ))}
          </StaggerContainer>
        </div>
      </section>
    </>
  );
}
