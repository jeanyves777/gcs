import { NextRequest, NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";
import { auth } from "@/lib/auth";

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

const SYSTEM_PROMPT = `You are GCS Assistant, the AI support agent for General Computing Solutions (GCS) — a Managed IT Services & Software Provider based in the United States.

GCS offers the following services:
- Managed IT Services: 24/7 monitoring, help desk support, network management, patch management
- Custom Software Development: web apps, mobile apps, enterprise systems, API integrations
- Enterprise Solutions: ERP/CRM implementations, workflow automation, business intelligence
- Cloud Services: AWS/Azure/GCP migrations, cloud architecture, DevOps, serverless
- Cybersecurity: penetration testing, endpoint protection, security training, compliance (SOC2, HIPAA)
- AI Integration: document processing, custom LLM tools, chatbots, workflow automation

Your role:
- Answer questions about GCS services clearly and helpfully
- Help clients understand their invoices and billing
- Guide users through opening support tickets (what info to include, which category/priority)
- Assist with common IT questions and troubleshooting guidance
- Escalate complex issues by directing users to open a support ticket

Communication style:
- Professional but friendly
- Concise and clear
- Always end with a helpful next step if applicable

Important:
- Do NOT share API keys, passwords, or internal system details
- Do NOT make promises about specific SLAs or pricing unless the user has an existing invoice
- For billing disputes or account changes, direct to the support ticket system`;

export async function POST(req: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { messages } = await req.json();
    if (!Array.isArray(messages) || messages.length === 0) {
      return NextResponse.json({ error: "Messages required" }, { status: 400 });
    }

    // Validate message format
    const validMessages = messages
      .filter((m) => m.role === "user" || m.role === "assistant")
      .map((m) => ({ role: m.role as "user" | "assistant", content: String(m.content) }))
      .slice(-20); // keep last 20 messages to stay within context

    const stream = new ReadableStream({
      async start(controller) {
        const encoder = new TextEncoder();
        try {
          const response = await client.messages.stream({
            model: "claude-haiku-4-5-20251001",
            max_tokens: 1024,
            system: SYSTEM_PROMPT,
            messages: validMessages,
          });

          for await (const chunk of response) {
            if (
              chunk.type === "content_block_delta" &&
              chunk.delta.type === "text_delta"
            ) {
              controller.enqueue(encoder.encode(chunk.delta.text));
            }
          }
        } catch (err) {
          controller.enqueue(encoder.encode("Sorry, I'm having trouble connecting right now. Please try again or open a support ticket."));
        } finally {
          controller.close();
        }
      },
    });

    return new NextResponse(stream, {
      headers: {
        "Content-Type": "text/plain; charset=utf-8",
        "Cache-Control": "no-cache",
        "X-Content-Type-Options": "nosniff",
      },
    });
  } catch {
    return NextResponse.json({ error: "Something went wrong" }, { status: 500 });
  }
}
