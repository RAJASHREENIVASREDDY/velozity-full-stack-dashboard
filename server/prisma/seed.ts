import { PrismaClient, type Priority, type TaskStatus } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();
const PASSWORD = process.env.SEED_PASSWORD ?? "Velozity123!";

const users = [
  { email: "admin@velozity.local", name: "Asha Admin", role: "ADMIN" as const },
  { email: "pm1@velozity.local", name: "Priya Manager", role: "PROJECT_MANAGER" as const },
  { email: "pm2@velozity.local", name: "Arjun Manager", role: "PROJECT_MANAGER" as const },
  { email: "dev1@velozity.local", name: "Ravi Dev", role: "DEVELOPER" as const },
  { email: "dev2@velozity.local", name: "Meera Dev", role: "DEVELOPER" as const },
  { email: "dev3@velozity.local", name: "Kabir Dev", role: "DEVELOPER" as const },
  { email: "dev4@velozity.local", name: "Zara Dev", role: "DEVELOPER" as const },
];

async function main(): Promise<void> {
  const hash = await bcrypt.hash(PASSWORD, 10);
  const userMap = new Map<string, { id: string; name: string }>();
  for (const u of users) {
    const rec = await prisma.user.upsert({
      where: { email: u.email },
      update: { name: u.name, role: u.role, password: hash, isActive: true },
      create: { email: u.email, name: u.name, role: u.role, password: hash, isActive: true },
    });
    userMap.set(u.email, { id: rec.id, name: rec.name });
  }

  const clients = [
    { name: "Acme Retail", company: "Acme Retail Pvt Ltd", email: "hello@acme.test", phone: "+91-90000-00001" },
    { name: "Northwind Traders", company: "Northwind Traders", email: "ops@northwind.test", phone: "+91-90000-00002" },
    { name: "Globex Media", company: "Globex Media", email: "team@globex.test", phone: "+91-90000-00003" },
  ];
  const clientIds: string[] = [];
  for (const c of clients) {
    const existing = await prisma.client.findFirst({ where: { name: c.name } });
    const rec = existing ?? (await prisma.client.create({ data: c }));
    clientIds.push(rec.id);
  }

  const pm1 = userMap.get("pm1@velozity.local")!;
  const pm2 = userMap.get("pm2@velozity.local")!;
  const devs = ["dev1@velozity.local", "dev2@velozity.local", "dev3@velozity.local", "dev4@velozity.local"].map((e) => userMap.get(e)!);

  const projectDefs = [
    { name: "Acme Storefront Revamp", description: "Rebuild marketing site + checkout UX", clientId: clientIds[0], creatorId: pm1.id },
    { name: "Northwind Inventory App", description: "Internal inventory dashboard + alerts", clientId: clientIds[1], creatorId: pm1.id },
    { name: "Globex Campaign Portal", description: "Campaign management portal for media team", clientId: clientIds[2], creatorId: pm2.id },
  ];
  const projectIds: string[] = [];
  for (const p of projectDefs) {
    const existing = await prisma.project.findFirst({ where: { name: p.name } });
    const rec = existing ?? (await prisma.project.create({ data: p }));
    projectIds.push(rec.id);
  }

  const statuses: TaskStatus[] = ["TODO", "IN_PROGRESS", "IN_REVIEW", "DONE", "TODO", "IN_PROGRESS"];
  const priorities: Priority[] = ["LOW", "MEDIUM", "HIGH", "CRITICAL", "HIGH", "MEDIUM"];
  const titles = ["Design landing page", "Implement auth flow", "Build task board API", "Write activity feed UI", "Add notification bell", "Fix overdue scheduler edge cases"];

  const now = Date.now();
  const day = 24 * 3600 * 1000;
  // Mix of future, near, and past (overdue) due dates
  const offsets = [5 * day, 2 * day, -3 * day, 10 * day, -1 * day, 1 * day];

  for (let pi = 0; pi < projectIds.length; pi++) {
    for (let i = 0; i < 6; i++) {
      const title = `${titles[i]} (P${pi + 1})`;
      const existing = await prisma.task.findFirst({ where: { projectId: projectIds[pi], title } });
      if (existing) continue;
      const assignee = devs[(i + pi) % devs.length];
      const task = await prisma.task.create({
        data: {
          title,
          description: `Seeded task ${i + 1} for project ${pi + 1}. Acceptance criteria documented internally.`,
          projectId: projectIds[pi],
          assignedDeveloperId: assignee.id,
          status: statuses[i],
          priority: priorities[i],
          dueDate: new Date(now + offsets[i]),
        },
      });
      await prisma.activityLog.create({
        data: {
          projectId: projectIds[pi],
          taskId: task.id,
          actorId: pi < 2 ? pm1.id : pm2.id,
          action: "TASK_CREATED",
          newStatus: task.status,
          message: `${pi < 2 ? pm1.name : pm2.name} created task "${task.title}"`,
        },
      });
      await prisma.notification.create({
        data: {
          userId: assignee.id,
          type: "TASK_ASSIGNED",
          title: "New task assigned",
          message: `You were assigned "${task.title}"`,
          taskId: task.id,
          projectId: projectIds[pi],
        },
      });
      if (task.status === "IN_REVIEW") {
        const ownerId = pi < 2 ? pm1.id : pm2.id;
        await prisma.notification.create({
          data: {
            userId: ownerId,
            type: "TASK_IN_REVIEW",
            title: "Task ready for review",
            message: `${assignee.name} moved "${task.title}" to In Review`,
            taskId: task.id,
            projectId: projectIds[pi],
          },
        });
      }
    }
  }

  console.log(`Seed complete. Password for all seeded users: ${PASSWORD}`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => {
    void prisma.$disconnect();
  });
