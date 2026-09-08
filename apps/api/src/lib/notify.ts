import { prisma } from "./prisma.js";
import type { NotificationType } from "../generated/prisma/index.js";

export async function notify(params: {
  userId: string;
  type: NotificationType;
  title: string;
  body?: string;
  relatedTaskId?: string;
  relatedProjectId?: string;
}) {
  await prisma.notification.create({
    data: {
      userId: params.userId,
      type: params.type,
      title: params.title,
      body: params.body,
      relatedTaskId: params.relatedTaskId,
      relatedProjectId: params.relatedProjectId,
    },
  });
}

export async function logActivity(params: {
  taskId: string;
  actorId: string;
  action: string;
  fromValue?: string | null;
  toValue?: string | null;
}) {
  await prisma.taskActivity.create({
    data: {
      taskId: params.taskId,
      actorId: params.actorId,
      action: params.action,
      fromValue: params.fromValue ?? null,
      toValue: params.toValue ?? null,
    },
  });
}
