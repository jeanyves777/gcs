import { NextRequest } from "next/server";
import { auth } from "@/lib/auth";
import { isGCSStaff } from "@/lib/auth-utils";
import { db } from "@/lib/db";
import { generatePitchPDF } from "@/lib/pitch-pdf";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth();
    if (!session?.user || !isGCSStaff(session.user.role ?? "")) {
      return new Response("Unauthorized", { status: 403 });
    }

    const { id } = await params;
    const pitch = await db.pitch.findUnique({ where: { id } });
    if (!pitch) return new Response("Not found", { status: 404 });

    // Fetch client logo buffer (non-fatal)
    let logoBuffer: Buffer | null = null;
    if (pitch.brandLogoUrl) {
      try {
        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), 5000);
        const logoRes = await fetch(pitch.brandLogoUrl, { signal: controller.signal });
        clearTimeout(timeout);
        if (logoRes.ok) {
          const contentType = logoRes.headers.get("content-type") || "";
          if (contentType.includes("png") || contentType.includes("jpeg") || contentType.includes("jpg")) {
            const arrayBuf = await logoRes.arrayBuffer();
            logoBuffer = Buffer.from(arrayBuf);
          }
        }
      } catch { /* non-fatal — PDF renders without client logo */ }
    }

    const pdfBuffer = await generatePitchPDF(
      {
        businessName: pitch.businessName,
        websiteUrl: pitch.websiteUrl,
        pitchText: pitch.pitchText,
        securityScore: pitch.securityScore,
        presenceScore: pitch.presenceScore,
        dealScore: pitch.dealScore,
        painCount: pitch.painCount,
        businessIntelData: pitch.businessIntelData,
        reportData: pitch.reportData,
        brandColor: pitch.brandColor,
        createdAt: pitch.createdAt,
      },
      logoBuffer
    );

    const safeName = pitch.businessName.replace(/[^a-z0-9]/gi, "-").slice(0, 40).toLowerCase();
    return new Response(new Uint8Array(pdfBuffer), {
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename="${safeName}-technology-assessment.pdf"`,
        "Cache-Control": "no-cache",
      },
    });
  } catch (err) {
    console.error("[pitch-pdf] Error generating PDF:", err);
    return new Response(`Failed to generate PDF: ${err instanceof Error ? err.message : "Unknown error"}`, { status: 500 });
  }
}
