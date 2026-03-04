import { auth } from "@/lib/auth";
import { isGCSStaff } from "@/lib/auth-utils";
import { db } from "@/lib/db";
import { generateApiKey } from "@/lib/guard-auth";
import { runRemoteInstall } from "@/lib/guard-ssh-deploy";

export const maxDuration = 120;

export async function POST(request: Request) {
  const session = await auth();
  if (!session?.user || !isGCSStaff(session.user.role ?? "")) {
    return new Response(JSON.stringify({ error: "Unauthorized" }), {
      status: 403,
      headers: { "Content-Type": "application/json" },
    });
  }

  const body = await request.json();
  const { organizationId, agentName, sshHost, sshPort, sshUsername, sshPrivateKey } = body;

  // Validate required fields
  if (!organizationId || !agentName?.trim()) {
    return new Response(
      JSON.stringify({ error: "organizationId and agentName are required" }),
      { status: 400, headers: { "Content-Type": "application/json" } }
    );
  }
  if (!sshHost?.trim() || !sshPrivateKey?.trim()) {
    return new Response(
      JSON.stringify({ error: "SSH host and private key are required" }),
      { status: 400, headers: { "Content-Type": "application/json" } }
    );
  }

  // Validate SSH inputs
  const host = sshHost.trim();
  const port = Math.max(1, Math.min(65535, parseInt(sshPort) || 22));
  const username = (sshUsername?.trim() || "root").slice(0, 64);
  const privateKey = sshPrivateKey.trim();

  if (host.length > 255) {
    return new Response(
      JSON.stringify({ error: "SSH host too long" }),
      { status: 400, headers: { "Content-Type": "application/json" } }
    );
  }
  if (!privateKey.includes("-----BEGIN")) {
    return new Response(
      JSON.stringify({ error: "Invalid SSH private key format. Must be a PEM-encoded key." }),
      { status: 400, headers: { "Content-Type": "application/json" } }
    );
  }

  // Verify organization
  const org = await db.organization.findUnique({
    where: { id: organizationId },
    select: { id: true, name: true },
  });
  if (!org) {
    return new Response(
      JSON.stringify({ error: "Organization not found" }),
      { status: 404, headers: { "Content-Type": "application/json" } }
    );
  }

  // Create agent in DB
  const { raw, hash, prefix } = generateApiKey();
  const agent = await db.guardAgent.create({
    data: {
      name: agentName.trim(),
      apiKey: hash,
      apiKeyPrefix: prefix,
      organizationId,
    },
  });

  // Stream SSE progress
  const encoder = new TextEncoder();
  const stream = new ReadableStream({
    async start(controller) {
      const send = (event: string, data: Record<string, unknown>) => {
        controller.enqueue(
          encoder.encode(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`)
        );
      };

      try {
        await runRemoteInstall(host, port, username, privateKey, raw, agentName.trim(), send);

        send("complete", {
          agent: {
            id: agent.id,
            name: agent.name,
            apiKeyPrefix: prefix,
            organization: org.name,
          },
          apiKey: raw,
        });
      } catch (err) {
        // Clean up the agent record on failure
        await db.guardAgent.delete({ where: { id: agent.id } }).catch(() => {});

        send("error", {
          message: err instanceof Error ? err.message : "Remote installation failed",
        });
      } finally {
        controller.close();
      }
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache",
      Connection: "keep-alive",
    },
  });
}
