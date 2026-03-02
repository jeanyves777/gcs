import { NextRequest, NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

const SYSTEM_PROMPT = `You are the GCS AI Assistant for Global Computing Solutions (GCS), a leading Managed IT & Software provider based in the US.

Your role is to help website visitors learn about GCS services and guide them toward becoming clients.

**Our Services:**
- Managed IT Services: 24/7 monitoring, helpdesk, network management, patch management
- Software Development: Custom web & mobile apps, enterprise software, API integrations
- Cybersecurity: Threat detection, vulnerability assessments, compliance (SOC2, HIPAA, PCI-DSS)
- Cloud Solutions: AWS, Azure, Google Cloud — migration, management, cost optimization
- AI & Automation: Workflow automation, AI chatbots, data analytics, process optimization
- Enterprise IT: Infrastructure design, ERP/CRM integrations, IT consulting

**Key Info:**
- Website: www.itatgcs.com
- Contact: info@itatgcs.com
- Client Portal: www.itatgcs.com/portal
- Get a Quote: www.itatgcs.com/get-quote
- Support: Existing clients open tickets at www.itatgcs.com/portal/support

Be concise, professional, and helpful. Guide visitors toward getting a quote or contacting us. Do not discuss competitors. Keep responses under 150 words.`;

export async function POST(req: NextRequest) {
  try {
    const { messages } = await req.json();

    if (!Array.isArray(messages) || messages.length === 0) {
      return NextResponse.json({ error: "Messages required" }, { status: 400 });
    }

    const validMessages = messages
      .filter((m) => m.role === "user" || m.role === "assistant")
      .slice(-10)
      .map((m) => ({ role: m.role as "user" | "assistant", content: String(m.content) }));

    const stream = new ReadableStream({
      async start(controller) {
        const response = await client.messages.stream({
          model: "claude-haiku-4-5-20251001",
          max_tokens: 300,
          system: SYSTEM_PROMPT,
          messages: validMessages,
        });

        for await (const chunk of response) {
          if (
            chunk.type === "content_block_delta" &&
            chunk.delta.type === "text_delta"
          ) {
            controller.enqueue(new TextEncoder().encode(chunk.delta.text));
          }
        }
        controller.close();
      },
    });

    return new NextResponse(stream, {
      headers: { "Content-Type": "text/plain; charset=utf-8" },
    });
  } catch {
    return NextResponse.json({ error: "AI unavailable" }, { status: 500 });
  }
}
