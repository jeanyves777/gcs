import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { isGCSStaff } from "@/lib/auth-utils";
import { db } from "@/lib/db";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session?.user?.id || !isGCSStaff(session.user.role ?? "")) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
  }

  const { id } = await params;
  const url = new URL(request.url);
  const filePath = url.searchParams.get("filePath");

  if (!filePath) {
    return NextResponse.json({ error: "filePath query param is required" }, { status: 400 });
  }

  const agent = await db.guardAgent.findUnique({ where: { id } });
  if (!agent) {
    return NextResponse.json({ error: "Agent not found" }, { status: 404 });
  }

  // Create a GET_CONFIG command for the agent to fetch and return the file content
  const command = await db.guardCommand.create({
    data: {
      type: "GET_CONFIG",
      payload: JSON.stringify({ filePath }),
      agentId: id,
      createdById: session.user.id,
    },
  });

  return NextResponse.json(command);
}

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

  const agent = await db.guardAgent.findUnique({ where: { id } });
  if (!agent) {
    return NextResponse.json({ error: "Agent not found" }, { status: 404 });
  }

  let filePath: string;
  let content: string;
  let restartService: string | null = null;
  let templateId: string | null = null;

  if (body.templateId) {
    // Deploy from template
    const template = await db.guardConfigTemplate.findUnique({
      where: { id: body.templateId },
    });
    if (!template) {
      return NextResponse.json({ error: "Template not found" }, { status: 404 });
    }
    filePath = template.filePath;
    content = template.content;
    restartService = template.restartService;
    templateId = template.id;
  } else {
    // Deploy raw content
    if (!body.filePath || !body.content) {
      return NextResponse.json(
        { error: "Either templateId or both filePath and content are required" },
        { status: 400 }
      );
    }
    filePath = body.filePath;
    content = body.content;
    restartService = body.restartService || null;
  }

  // Base64 encode the content for safe transport to the agent
  const contentBase64 = Buffer.from(content).toString("base64");

  // Create PUSH_CONFIG command
  const command = await db.guardCommand.create({
    data: {
      type: "PUSH_CONFIG",
      payload: JSON.stringify({
        filePath,
        content: contentBase64,
        restartService,
      }),
      agentId: id,
      createdById: session.user.id,
    },
  });

  // Create deployment record
  const deployment = await db.guardConfigDeployment.create({
    data: {
      filePath,
      status: "PENDING",
      newContent: content,
      templateId,
      agentId: id,
      deployedById: session.user.id,
    },
  });

  return NextResponse.json({ command, deployment });
}
