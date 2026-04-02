import type { Prisma } from "@prisma/client";

import { prisma } from "@/lib/prisma";

type AuditClient = Pick<typeof prisma, "auditLog">;

type CreateLogInput = {
  companyId: string;
  unitId?: string | null;
  userId?: string | null;
  entityType: string;
  entityId: string;
  action: "CREATE" | "UPDATE" | "DELETE" | "LOGIN" | "LOGOUT" | "STATUS_CHANGE";
  beforeData?: Prisma.InputJsonValue | Prisma.NullableJsonNullValueInput;
  afterData?: Prisma.InputJsonValue | Prisma.NullableJsonNullValueInput;
  ipAddress?: string | null;
  userAgent?: string | null;
};

export const auditService = {
  async createLog(data: CreateLogInput, db: AuditClient = prisma) {
    return db.auditLog.create({ data });
  },
};
