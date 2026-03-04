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
  const { name, organizationId } = body;

  if (!name || !organizationId) {
    return NextResponse.json(
      { error: "name and organizationId are required" },
      { status: 400 }
    );
  }

  const org = await db.organization.findUnique({
    where: { id: organizationId },
  });
  if (!org) {
    return NextResponse.json(
      { error: "Organization not found" },
      { status: 404 }
    );
  }

  const { raw, hash, prefix } = generateApiKey();

  const agent = await db.guardAgent.create({
    data: {
      name,
      apiKey: hash,
      apiKeyPrefix: prefix,
      organizationId,
    },
  });

  return NextResponse.json({
    agentId: agent.id,
    apiKey: raw,
    apiKeyPrefix: prefix,
    installCommand: `curl -sSL https://itatgcs.com/guard/install.sh | sudo bash -s -- ${raw}`,
  });
}
