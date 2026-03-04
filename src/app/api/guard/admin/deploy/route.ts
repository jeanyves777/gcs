import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { isGCSStaff } from "@/lib/auth-utils";
import { db } from "@/lib/db";
import { generateApiKey } from "@/lib/guard-auth";

export async function POST(request: Request) {
  const session = await auth();
  if (!session?.user || !isGCSStaff(session.user.role ?? "")) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
  }

  const body = await request.json();
  const { organizationId, agentName } = body;

  if (!organizationId || !agentName) {
    return NextResponse.json(
      { error: "organizationId and agentName are required" },
      { status: 400 }
    );
  }

  const org = await db.organization.findUnique({
    where: { id: organizationId },
    select: { id: true, name: true },
  });
  if (!org) {
    return NextResponse.json({ error: "Organization not found" }, { status: 404 });
  }

  const { raw, hash, prefix } = generateApiKey();

  const agent = await db.guardAgent.create({
    data: {
      name: agentName,
      apiKey: hash,
      apiKeyPrefix: prefix,
      organizationId,
    },
  });

  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || "https://itatgcs.com";

  return NextResponse.json({
    agent: {
      id: agent.id,
      name: agent.name,
      apiKeyPrefix: prefix,
      organization: org.name,
    },
    apiKey: raw, // Shown only once
    installCommand: `curl -sSL ${baseUrl}/guard/install.sh | sudo bash -s -- ${raw}`,
    manualInstall: {
      step1: `sudo mkdir -p /etc/gcsguard /var/log/gcsguard`,
      step2: `# Save API key to config:\nsudo tee /etc/gcsguard/agent.conf << EOF\nAPI_KEY="${raw}"\nAPI_URL="${baseUrl}/api/guard/agent"\nAGENT_NAME="${agentName}"\nHEARTBEAT_INTERVAL=30\nEOF`,
      step3: `sudo curl -sSL ${baseUrl}/guard/gcsguard-agent.sh -o /usr/local/bin/gcsguard-agent && sudo chmod +x /usr/local/bin/gcsguard-agent`,
      step4: `# Create systemd service and start`,
    },
  });
}
