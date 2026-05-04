import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

const apply = process.argv.includes("--apply");

function isAlreadyPaidReference(description) {
  const normalized = String(description ?? "").toLowerCase();
  return normalized.includes("ja pago") || normalized.includes("já pago") || normalized.includes("jÃ¡ pago");
}

function fecOutstandingFromItems(items) {
  return items.reduce((sum, item) => {
    const value = Number(item.lineTotal);
    if (!Number.isFinite(value) || value <= 0 || isAlreadyPaidReference(item.description)) {
      return sum;
    }
    return sum + value;
  }, 0);
}

function referencedOrderNumbers(items) {
  const result = new Set();
  const numberRegex = /OS-\d{4}-\d{5}(?:-P\d+)?/g;
  for (const item of items) {
    const direct = item.referencedOrderNumber?.trim();
    if (direct) {
      result.add(direct);
      continue;
    }

    for (const match of String(item.description ?? "").matchAll(numberRegex)) {
      result.add(match[0]);
    }
  }
  return Array.from(result);
}

function parseBillingPlan(value) {
  if (!Array.isArray(value)) return null;
  const rows = value
    .map((item) => ({
      dueDate: typeof item?.dueDate === "string" ? item.dueDate : null,
      amount: Number(item?.amount),
    }))
    .filter((item) => item.dueDate && Number.isFinite(item.amount) && item.amount > 0);
  return rows.length >= 2 ? rows : null;
}

function money2(value) {
  return Math.round((Number(value) + Number.EPSILON) * 100) / 100;
}

function paidSummary(receivables) {
  const paid = receivables.filter((item) => item.status === "PAGO");
  const paidAmount = money2(paid.reduce((sum, item) => sum + Number(item.amount), 0));
  const paidAt = paid
    .map((item) => item.paidAt)
    .filter(Boolean)
    .sort((a, b) => b.getTime() - a.getTime())[0] ?? null;

  return {
    paidAmount,
    paidAt,
    allPaid: receivables.length > 0 && receivables.every((item) => item.status === "PAGO"),
    hasPaid: paid.length > 0,
  };
}

async function createReceivablesForClosure(tx, closure, sourceReceivables) {
  const outstanding = money2(fecOutstandingFromItems(closure.items));
  if (outstanding <= 0) {
    return { created: 0, skipped: "saldo-zero" };
  }

  const { paidAmount, paidAt, allPaid, hasPaid } = paidSummary(sourceReceivables);
  const dueDate = closure.dueDate ?? closure.openedAt ?? new Date();
  const plan = parseBillingPlan(closure.billingInstallmentPlan);
  let lineSlot = 0;
  const rows = [];

  if (allPaid) {
    rows.push({
      amount: outstanding,
      dueDate,
      status: "PAGO",
      paidAt: paidAt ?? new Date(),
      description: closure.number,
      installmentNumber: null,
      installmentCount: null,
      installmentGroupId: null,
    });
  } else if (hasPaid && paidAmount > 0) {
    const paidPart = Math.min(paidAmount, outstanding);
    const pendingPart = money2(outstanding - paidPart);
    rows.push({
      amount: paidPart,
      dueDate,
      status: "PAGO",
      paidAt: paidAt ?? new Date(),
      description: `${closure.number} (recebido)`,
      installmentNumber: null,
      installmentCount: null,
      installmentGroupId: null,
    });
    if (pendingPart > 0) {
      rows.push({
        amount: pendingPart,
        dueDate,
        status: "PENDENTE",
        paidAt: null,
        description: `Pendência de ${closure.number}`,
        installmentNumber: null,
        installmentCount: null,
        installmentGroupId: null,
      });
    }
  } else if (plan) {
    const planTotal = plan.reduce((sum, item) => sum + item.amount, 0);
    const installmentGroupId = crypto.randomUUID();
    for (let index = 0; index < plan.length; index += 1) {
      const part = plan[index];
      rows.push({
        amount: money2((outstanding * part.amount) / planTotal),
        dueDate: new Date(`${part.dueDate}T00:00:00`),
        status: "PENDENTE",
        paidAt: null,
        description: `${closure.number} (${index + 1}/${plan.length})`,
        installmentNumber: index + 1,
        installmentCount: plan.length,
        installmentGroupId,
      });
    }
  } else {
    rows.push({
      amount: outstanding,
      dueDate,
      status: "PENDENTE",
      paidAt: null,
      description: closure.number,
      installmentNumber: null,
      installmentCount: null,
      installmentGroupId: null,
    });
  }

  for (const row of rows) {
    await tx.accountReceivable.create({
      data: {
        companyId: closure.companyId,
        unitId: closure.unitId,
        customerId: closure.customerId,
        serviceOrderId: closure.id,
        lineSlot,
        originType: "SERVICE_ORDER",
        description: row.description,
        amount: row.amount,
        dueDate: row.dueDate,
        status: row.status,
        paidAt: row.paidAt,
        installmentGroupId: row.installmentGroupId,
        installmentNumber: row.installmentNumber,
        installmentCount: row.installmentCount,
      },
    });
    lineSlot += 1;
  }

  const paymentStatus = allPaid ? "PAGO" : hasPaid ? "PAGO_PARCIAL" : "PENDENTE";
  await tx.serviceOrder.update({
    where: { id: closure.id },
    data: {
      paymentStatus,
      closedAt: allPaid ? (paidAt ?? new Date()) : null,
    },
  });

  return { created: rows.length, skipped: null };
}

async function main() {
  const closures = await prisma.serviceOrder.findMany({
    where: {
      number: { startsWith: "FEC-" },
      isBilled: true,
      receivables: {
        none: {
          originType: "SERVICE_ORDER",
        },
      },
    },
    include: {
      items: true,
    },
    orderBy: { createdAt: "asc" },
  });

  let fixed = 0;
  let skipped = 0;

  for (const closure of closures) {
    const sourceNumbers = referencedOrderNumbers(closure.items);
    const sourceOrders = sourceNumbers.length
      ? await prisma.serviceOrder.findMany({
          where: {
            companyId: closure.companyId,
            number: { in: sourceNumbers },
          },
          select: { id: true },
        })
      : [];

    const sourceReceivables = sourceOrders.length
      ? await prisma.accountReceivable.findMany({
          where: {
            serviceOrderId: { in: sourceOrders.map((item) => item.id) },
            originType: "SERVICE_ORDER",
          },
          select: {
            amount: true,
            status: true,
            paidAt: true,
          },
        })
      : [];

    const outstanding = money2(fecOutstandingFromItems(closure.items));
    if (!apply) {
      console.log(`[dry-run] ${closure.number}: criaria recebível no FEC; saldo=${outstanding.toFixed(2)}`);
      fixed += 1;
      continue;
    }

    const result = await prisma.$transaction((tx) => createReceivablesForClosure(tx, closure, sourceReceivables));
    if (result.skipped) {
      console.log(`[skip] ${closure.number}: ${result.skipped}`);
      skipped += 1;
    } else {
      console.log(`[ok] ${closure.number}: ${result.created} recebível(is) criado(s)`);
      fixed += 1;
    }
  }

  console.log(apply ? `Concluído: ${fixed} FEC(s) corrigido(s), ${skipped} ignorado(s).` : `Dry-run: ${fixed} FEC(s) seriam corrigidos. Rode com --apply para aplicar.`);
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
