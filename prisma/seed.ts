import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

async function main() {
  console.log("🌱 Seeding database...");

  // Create GCS organization (internal)
  const gcsOrg = await prisma.organization.upsert({
    where: { domain: "itatgcs.com" },
    update: {},
    create: {
      name: "Global Computing Solutions",
      domain: "itatgcs.com",
      website: "https://www.itatgcs.com",
      subscriptionTier: "GCSGUARD_MANAGED",
    },
  });

  // Create demo client organization
  const clientOrg = await prisma.organization.upsert({
    where: { domain: "acmecorp.com" },
    update: {},
    create: {
      name: "Acme Corporation",
      domain: "acmecorp.com",
      website: "https://acmecorp.com",
      phone: "+1 (555) 234-5678",
      subscriptionTier: "GCSGUARD_NON_MANAGED",
    },
  });

  // Admin user (GCS internal)
  const adminPasswordHash = await bcrypt.hash("Admin@123!", 12);
  const admin = await prisma.user.upsert({
    where: { email: "admin@itatgcs.com" },
    update: {},
    create: {
      email: "admin@itatgcs.com",
      name: "GCS Admin",
      role: "ADMIN",
      passwordHash: adminPasswordHash,
      emailVerified: new Date(),
      organizationId: gcsOrg.id,
      jobTitle: "System Administrator",
    },
  });

  // Staff user
  const staffPasswordHash = await bcrypt.hash("Staff@123!", 12);
  const staff = await prisma.user.upsert({
    where: { email: "staff@itatgcs.com" },
    update: {},
    create: {
      email: "staff@itatgcs.com",
      name: "Alex Johnson",
      role: "STAFF",
      passwordHash: staffPasswordHash,
      emailVerified: new Date(),
      organizationId: gcsOrg.id,
      jobTitle: "Project Manager",
    },
  });

  // Client admin
  const clientAdminPasswordHash = await bcrypt.hash("Client@123!", 12);
  const clientAdmin = await prisma.user.upsert({
    where: { email: "admin@acmecorp.com" },
    update: {},
    create: {
      email: "admin@acmecorp.com",
      name: "Sarah Mitchell",
      role: "CLIENT_ADMIN",
      passwordHash: clientAdminPasswordHash,
      emailVerified: new Date(),
      organizationId: clientOrg.id,
      jobTitle: "IT Director",
    },
  });

  // Client user
  const clientUserPasswordHash = await bcrypt.hash("User@123!", 12);
  await prisma.user.upsert({
    where: { email: "user@acmecorp.com" },
    update: {},
    create: {
      email: "user@acmecorp.com",
      name: "Tom Wilson",
      role: "CLIENT_USER",
      passwordHash: clientUserPasswordHash,
      emailVerified: new Date(),
      organizationId: clientOrg.id,
      jobTitle: "Developer",
    },
  });

  // Demo project
  const project = await prisma.project.upsert({
    where: { id: "demo-project-001" },
    update: {},
    create: {
      id: "demo-project-001",
      name: "Acme ERP Integration",
      description:
        "Full ERP system integration connecting CRM, inventory, and billing modules with real-time data sync.",
      status: "ACTIVE",
      progress: 45,
      startDate: new Date("2024-01-15"),
      targetDate: new Date("2024-06-30"),
      organizationId: clientOrg.id,
      ownerId: staff.id,
    },
  });

  // Milestones
  const milestone1 = await prisma.milestone.create({
    data: {
      title: "Requirements & Architecture",
      description: "Define full requirements and system architecture",
      status: "COMPLETED",
      order: 1,
      completedAt: new Date("2024-02-01"),
      projectId: project.id,
    },
  });

  const milestone2 = await prisma.milestone.create({
    data: {
      title: "Core API Development",
      description: "Build all REST API endpoints",
      status: "IN_PROGRESS",
      order: 2,
      dueDate: new Date("2024-04-30"),
      projectId: project.id,
    },
  });

  // Tasks
  await prisma.task.createMany({
    data: [
      {
        title: "Document API endpoints",
        status: "DONE",
        priority: "HIGH",
        projectId: project.id,
        milestoneId: milestone1.id,
        assigneeId: staff.id,
        order: 1,
      },
      {
        title: "Design database schema",
        status: "DONE",
        priority: "HIGH",
        projectId: project.id,
        milestoneId: milestone1.id,
        assigneeId: staff.id,
        order: 2,
      },
      {
        title: "Implement authentication module",
        status: "IN_PROGRESS",
        priority: "CRITICAL",
        projectId: project.id,
        milestoneId: milestone2.id,
        assigneeId: staff.id,
        order: 3,
      },
      {
        title: "CRM data sync endpoint",
        status: "TODO",
        priority: "HIGH",
        projectId: project.id,
        milestoneId: milestone2.id,
        order: 4,
      },
    ],
  });

  // Demo ticket
  const ticket = await prisma.ticket.create({
    data: {
      ticketNumber: "TKT-0001",
      subject: "Unable to access client portal",
      description:
        "I'm getting a 403 error when trying to log in to the portal. This started this morning.",
      status: "IN_PROGRESS",
      priority: "HIGH",
      category: "TECHNICAL",
      organizationId: clientOrg.id,
      assignedTo: staff.id,
      slaDeadline: new Date(Date.now() + 24 * 60 * 60 * 1000),
    },
  });

  await prisma.ticketMessage.create({
    data: {
      content:
        "Hi Sarah, I'm looking into this now. Could you confirm which browser and OS you're using?",
      ticketId: ticket.id,
      authorId: staff.id,
    },
  });

  // Demo invoice
  await prisma.invoice.create({
    data: {
      invoiceNumber: "INV-2024-001",
      amount: 4500.0,
      tax: 450.0,
      currency: "USD",
      status: "SENT",
      dueDate: new Date("2024-03-31"),
      organizationId: clientOrg.id,
      notes: "Monthly managed IT services fee — March 2024",
      lineItems: JSON.stringify([
        { description: "Managed IT Services", quantity: 1, unitPrice: 3000.0 },
        { description: "Cloud Monitoring", quantity: 1, unitPrice: 1500.0 },
      ]),
    },
  });

  // Notification for client admin
  await prisma.notification.create({
    data: {
      type: "PROJECT_UPDATE",
      title: "Project progress updated",
      content: "Acme ERP Integration is now 45% complete.",
      link: "/portal/projects/demo-project-001",
      userId: clientAdmin.id,
    },
  });

  console.log("✅ Seed complete!");
  console.log("");
  console.log("Test accounts:");
  console.log("  Admin:        admin@itatgcs.com / Admin@123!");
  console.log("  Staff:        staff@itatgcs.com / Staff@123!");
  console.log("  Client Admin: admin@acmecorp.com / Client@123!");
  console.log("  Client User:  user@acmecorp.com / User@123!");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
