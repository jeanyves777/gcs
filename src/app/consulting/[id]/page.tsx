import { db } from "@/lib/db";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { ConsultingLandingClient } from "./consulting-landing-client";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>;
}): Promise<Metadata> {
  const { id } = await params;
  const pitch = await db.pitch.findUnique({
    where: { id },
    select: { businessName: true },
  });
  if (!pitch) return {};
  return {
    title: `Technology Assessment for ${pitch.businessName} — GCS Consulting`,
    description: `GCS Technology Consulting has prepared a personalized technology assessment for ${pitch.businessName}. Discover your opportunities and security vulnerabilities.`,
    robots: { index: false, follow: false },
  };
}

export default async function ConsultingLandingPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const pitch = await db.pitch.findUnique({
    where: { id },
    select: {
      id: true,
      businessName: true,
      websiteUrl: true,
      pitchText: true,
      securityScore: true,
      presenceScore: true,
      dealScore: true,
      painCount: true,
    },
  });
  if (!pitch) notFound();
  return <ConsultingLandingClient pitch={pitch} />;
}
