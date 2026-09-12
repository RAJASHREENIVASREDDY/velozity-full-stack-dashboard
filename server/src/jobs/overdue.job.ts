import cron from "node-cron";
import { prisma } from "../config/db.js";
import { env } from "../config/env.js";
import { emitActivityToAuthorized } from "../sockets/index.js";

/** Marks tasks past dueDate as OVERDUE. Idempotent: only touches tasks whose
 *  status is not already OVERDUE/DONE, so no duplicate activity entries.
 *  Overdue transitions DO create one ActivityLog each (documented in README). */
export async function runOverduePass(): Promise<number> {
  const now = new Date();
  const due = await prisma.task.findMany({
    where: { dueDate: { lt: now }, status: { notIn: ["DONE", "OVERDUE"] } },
    select: { id: true, projectId: true, title: true, status: true, assignedDeveloperId: true },
    take: 500,
  });
  let marked = 0;
  for (const t of due) {
    try {
      const activity = await prisma.$transaction(async (tx) => {
        const updated = await tx.task.update({ where: { id: t.id }, data: { status: "OVERDUE" } });
        const log = await tx.activityLog.create({
          data: {
            projectId: t.projectId,
            taskId: t.id,
            actorId: null,
            action: "SYSTEM_MARKED_OVERDUE",
            prevStatus: t.status,
            newStatus: "OVERDUE",
            message: `System marked "${t.title}" as Overdue`,
          },
        });
        void updated;
        return log;
      });
      const full = await prisma.activityLog.findUnique({
        where: { id: activity.id },
        include: { actor: { select: { id: true, name: true } }, task: { select: { id: true, title: true } }, project: { select: { id: true, name: true } } },
      });
      if (full) emitActivityToAuthorized(full);
      marked += 1;
    } catch {
      // continue with next task
    }
  }
  return marked;
}

export function startOverdueJob(): void {
  const schedule = env.OVERDUE_CRON;
  if (!cron.validate(schedule)) {
    console.warn(`[overdue-job] invalid OVERDUE_CRON "${schedule}", using "*/1 * * * *"`);
  }
  cron.schedule(cron.validate(schedule) ? schedule : "*/1 * * * *", async () => {
    try {
      const n = await runOverduePass();
      if (n > 0) console.log(`[overdue-job] marked ${n} task(s) OVERDUE`);
    } catch (err) {
      console.error("[overdue-job] failed", err);
    }
  });
  console.log(`[overdue-job] scheduled with "${schedule}"`);
}
