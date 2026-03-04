import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { isGCSStaff } from "@/lib/auth-utils";
import { db } from "@/lib/db";

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session?.user?.id || !isGCSStaff(session.user.role ?? "")) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
  }

  const { id } = await params;
  const body = await request.json();
  const { deploymentId } = body;

  if (!deploymentId) {
    return NextResponse.json({ error: "deploymentId is required" }, { status: 400 });
  }

  const agent = await db.guardAgent.findUnique({ where: { id } });
  if (!agent) {
    return NextResponse.json({ error: "Agent not found" }, { status: 404 });
  }

  // Look up the deployment
  const deployment = await db.guardConfigDeployment.findUnique({
    where: { id: deploymentId },
  });

  if (!deployment) {
    return NextResponse.json({ error: "Deployment not found" }, { status: 404 });
  }

  if (deployment.agentId !== id) {
    return NextResponse.json({ error: "Deployment does not belong to this agent" }, { status: 400 });
  }

  if (!deployment.previousContent) {
    return NextResponse.json(
      { error: "No previous content available for rollback. This may be the first deployment for this file." },
      { status: 409 }
    );
  }

  // Base64 encode the previous content for safe transport
  const contentBase64 = Buffer.from(deployment.previousContent).toString("base64");

  // Create ROLLBACK_CONFIG command
  const command = await db.guardCommand.create({
    data: {
      type: "ROLLBACK_CONFIG",
      payload: JSON.stringify({
        filePath: deployment.filePath,
        content: contentBase64,
        deploymentId: deployment.id,
      }),
      agentId: id,
      createdById: session.user.id,
    },
  });

  // Update deployment status
  await db.guardConfigDeployment.update({
    where: { id: deploymentId },
    data: { status: "ROLLED_BACK" },
  });

  return NextResponse.json({ command, status: "ROLLED_BACK" });
}
