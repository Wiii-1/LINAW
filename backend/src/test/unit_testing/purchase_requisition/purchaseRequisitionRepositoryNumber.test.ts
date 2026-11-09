import { beforeEach, describe, expect, it, vi } from "vitest";

const { prismaMock } = vi.hoisted(() => ({
  prismaMock: {
    $transaction: vi.fn(),
    $executeRaw: vi.fn(),
    purchaseRequisition: {
      findMany: vi.fn(),
      create: vi.fn(),
      findUnique: vi.fn(),
    },
    purchaseRequisitionItem: {
      createMany: vi.fn(),
    },
    purchaseRequisitionStatusLog: {
      create: vi.fn(),
    },
  },
}));

vi.mock("../../../config/database.js", () => ({
  prisma: prismaMock,
}));

import { purchaseRequisitionRepository } from "../../../modules/purchase_requisition/purchaseRequisitionRepository.js";

const data = {
  id: "requisition-id",
  root_id: "requisition-id",
  tenant_id: "tenant-id",
  company_id: "company-id",
  pr_number: "",
  generation: 1,
  requested_by_user_id: "user-id",
  workflow_code: "PURCHASE_REQUISITION",
  purpose: "Office Supplies",
  justification: "Needed for the office",
  status: "DRAFT",
  priority: "NORMAL",
  currency_code: "USD",
  total_amount: 100,
  needed_by_date: null,
  created_at: new Date("2026-11-09T15:00:00.000Z"),
};

const items: never[] = [];
const statusLog = {
  tenant_id: "tenant-id",
  purchase_requisition_id: "requisition-id",
  from_status: null,
  to_status: "DRAFT",
  action: "CREATED",
  acted_by_user_id: "user-id",
  remarks: null,
  acted_at: new Date("2026-11-09T15:00:00.000Z"),
};

describe("purchaseRequisitionRepository PR number allocation", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    prismaMock.$transaction.mockImplementation(async (callback) =>
      callback(prismaMock),
    );
    prismaMock.purchaseRequisition.findMany.mockResolvedValue([]);
    prismaMock.purchaseRequisition.create.mockImplementation(async ({ data: value }) => value);
    prismaMock.purchaseRequisition.findUnique.mockResolvedValue({
      id: data.id,
      items: [],
    });
    prismaMock.purchaseRequisitionItem.createMany.mockResolvedValue({ count: 0 });
    prismaMock.purchaseRequisitionStatusLog.create.mockResolvedValue({ id: "log-id" });
  });

  it("generates a purpose and UTC creation date number without a sequence", async () => {
    const result = await new purchaseRequisitionRepository().createRequisitionWithItemsAndStatusLog(
      data as never,
      items,
      statusLog,
      "PR-NETWORK-EQUIPMENT",
    );

    expect(prismaMock.$executeRaw).not.toHaveBeenCalled();
    expect(result.pr_number).toBe("PR-NETWORK-EQUIPMENT-20261109");
  });

  it("does not write a status log when item creation fails", async () => {
    prismaMock.purchaseRequisitionItem.createMany.mockRejectedValue(
      new Error("item insert failed"),
    );

    await expect(
      new purchaseRequisitionRepository().createRequisitionWithItemsAndStatusLog(
        data as never,
        items,
        statusLog,
        "PR-OFFICE-SUPPLIES",
      ),
    ).rejects.toThrow("item insert failed");

    expect(prismaMock.purchaseRequisitionStatusLog.create).not.toHaveBeenCalled();
  });

  it("starts the sequence over for a different creation date", async () => {
    const nextDayData = {
      ...data,
      created_at: new Date("2026-11-10T00:05:00.000Z"),
    };

    const result = await new purchaseRequisitionRepository().createRequisitionWithItemsAndStatusLog(
      nextDayData as never,
      items,
      statusLog,
      "PR-OFFICE-SUPPLIES",
    );

    expect(result.pr_number).toBe("PR-OFFICE-SUPPLIES-20261110");
  });
});
