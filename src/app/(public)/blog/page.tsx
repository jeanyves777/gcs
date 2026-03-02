import type { Metadata } from "next";
import { FadeUp, FadeIn, StaggerContainer, StaggerItem } from "@/components/shared/motion";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { ArrowRight, Clock } from "lucide-react";
import Link from "next/link";
import { BlogIllustration } from "@/components/shared/illustrations";

export const metadata: Metadata = {
  title: "Blog",
  description: "Insights on managed IT services, software development, cloud management, and cybersecurity from the GCS team.",
};

const posts = [
  { slug: "managed-it-vs-inhouse", title: "Managed IT vs. In-House: What's Right for Your Business?", category: "Managed IT", readTime: "6 min", date: "Feb 2024", excerpt: "The decision to outsource IT operations is significant. Here's a framework to help you decide." },
  { slug: "cloud-cost-optimization-tips", title: "5 Ways to Cut Your Cloud Bill Without Sacrificing Performance", category: "Cloud", readTime: "5 min", date: "Jan 2024", excerpt: "Most companies overspend on cloud by 30-40%. These strategies will help you optimize." },
  { slug: "custom-software-vs-saas", title: "When Custom Software Beats Off-the-Shelf SaaS", category: "Software Dev", readTime: "7 min", date: "Jan 2024", excerpt: "SaaS is fast to deploy, but sometimes your workflows demand something built just for you." },
  { slug: "cybersecurity-for-smes", title: "A Practical Cybersecurity Guide for Small Businesses", category: "Cybersecurity", readTime: "8 min", date: "Dec 2023", excerpt: "You don't need an enterprise budget to have enterprise-grade security practices." },
  { slug: "ai-in-managed-services", title: "How AI is Changing Managed IT Services", category: "Managed IT", readTime: "5 min", date: "Dec 2023", excerpt: "AI-powered monitoring, anomaly detection, and automation are reshaping MSPs." },
  { slug: "nextjs-enterprise-apps", title: "Why We Build Enterprise Apps with Next.js", category: "Software Dev", readTime: "6 min", date: "Nov 2023", excerpt: "Our technical reasoning for choosing Next.js as our primary enterprise web framework." },
];

export default function BlogPage() {
  return (
    <>
      <section className="pt-8 pb-16 lg:pt-12 lg:pb-20" style={{ background: "var(--bg-primary)" }}>
        <div className="container-gcs">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
            <FadeUp>
              <Badge className="mb-6" style={{ background: "var(--bg-tertiary)", color: "var(--brand-primary)", border: "1px solid var(--border)" }}>Blog</Badge>
              <h1 className="font-black mb-6" style={{ fontFamily: "var(--font-display)" }}>
                Insights from the <span className="text-gradient">GCS team</span>
              </h1>
              <p className="text-lg" style={{ color: "var(--text-secondary)" }}>
                Practical guides, technical deep dives, and industry perspectives on IT and software.
              </p>
            </FadeUp>
            <div className="hidden sm:block">
              <FadeIn delay={0.2}>
                <BlogIllustration />
              </FadeIn>
            </div>
          </div>
        </div>
      </section>

      <section className="section-padding" style={{ background: "var(--bg-secondary)" }}>
        <div className="container-gcs">
          <StaggerContainer className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {posts.map((post) => (
              <StaggerItem key={post.slug}>
                <Link href={`/blog/${post.slug}`} className="block group">
                  <Card className="card-base h-full hover:border-[var(--brand-primary)] transition-all">
                    <CardContent className="p-6">
                      <div className="flex items-center justify-between mb-3">
                        <Badge className="text-xs" style={{ background: "var(--bg-tertiary)", color: "var(--brand-primary)", border: "1px solid var(--border)" }}>{post.category}</Badge>
                        <span className="flex items-center gap-1 text-xs" style={{ color: "var(--text-muted)" }}>
                          <Clock className="h-3 w-3" /> {post.readTime}
                        </span>
                      </div>
                      <h3 className="font-semibold mb-2 group-hover:text-[var(--brand-primary)] transition-colors" style={{ color: "var(--text-primary)" }}>{post.title}</h3>
                      <p className="text-sm" style={{ color: "var(--text-secondary)" }}>{post.excerpt}</p>
                      <div className="flex items-center gap-1.5 mt-4 text-sm font-medium" style={{ color: "var(--brand-primary)" }}>
                        Read article <ArrowRight className="h-3.5 w-3.5 group-hover:translate-x-1 transition-transform" />
                      </div>
                    </CardContent>
                  </Card>
                </Link>
              </StaggerItem>
            ))}
          </StaggerContainer>
        </div>
      </section>
    </>
  );
}
