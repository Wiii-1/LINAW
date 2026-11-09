import { describe, expect, it, vi } from "vitest";

const { prismaMock } = vi.hoisted(() => ({
  prismaMock: {
    $transaction: vi.fn(),
    $executeRaw: vi.fn(),
    rFQ: {
      findMany: vi.fn(),
      create: vi.fn(),
    },
    supplierQuotation: {
      findMany: vi.fn(),
    },
    purchaseOrder: {
      findFirst: vi.fn(),
    },
  },
}));

vi.mock("../../../config/database.js", () => ({ prisma: prismaMock }));

import { PurchaseOrderManagementRepository } from "../../../modules/purchase_order_management/purchaseOrderManagementRepository.js";
import { SupplierManagementPortalRepository } from "../../../modules/supplier_management/supplierManagementPortal/supplierManagementPortalRepository.js";

describe("RFQ repository workflow", () => {
  it("allocates a human-readable RFQ number inside the creation transaction", async () => {
    const tx = {
      $executeRaw: vi.fn(),
      rFQ: {
        findMany: vi.fn().mockResolvedValue([
          { rfq_number: "RFQ-20261110-001" },
          { rfq_number: "RFQ-20261110-003" },
        ]),
        create: vi.fn().mockImplementation(async ({ data }) => data),
      },
    };
    prismaMock.$transaction.mockImplementation(async (callback) => callback(tx));

    const result = await new PurchaseOrderManagementRepository().createRFQS({
      id: "rfq-id",
      tenant_id: "tenant-id",
      company_id: "company-id",
      rfq_number: "",
      purchase_requisition_id: "requisition-id",
      created_by_user_id: "user-id",
      title: "Office equipment quotation",
      description: undefined,
      closing_date: new Date("2026-11-10T02:00:00.000Z"),
      status: "DRAFT",
      created_at: new Date("2026-11-10T02:00:00.000Z"),
      items: [],
    });

    expect(tx.$executeRaw).toHaveBeenCalledOnce();
    expect(result.rfq_number).toBe("RFQ-20261110-004");
  });

  it("returns the purchasing company name for supplier RFQs", async () => {
    prismaMock.rFQ.findMany.mockResolvedValue([]);

    await new SupplierManagementPortalRepository().getAvailableRFQs({
      supplier_id: "supplier-id",
    });

    expect(prismaMock.rFQ.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        include: {
          items: true,
          company: {
            select: {
              legal_name: true,
              display_name: true,
            },
          },
          purchase_requisition: {
            select: { pr_number: true },
          },
        },
      }),
    );
  });

  it("loads quotation references through the RFQ relation", async () => {
    prismaMock.supplierQuotation.findMany.mockResolvedValue([]);

    await new PurchaseOrderManagementRepository().getQuotationList({
      tenant_id: "tenant-id",
      company_id: "company-id",
      rfq_id: "rfq-id",
    });

    expect(prismaMock.supplierQuotation.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: {
          tenant_id: "tenant-id",
          company_id: "company-id",
          rfq_id: "rfq-id",
        },
        include: expect.objectContaining({
          rfq: {
            select: {
              id: true,
              rfq_number: true,
              title: true,
              purchase_requisition: {
                select: { pr_number: true },
              },
            },
          },
        }),
      }),
    );
  });

  it("loads PO details through valid Purchase Requisition relations", async () => {
    prismaMock.purchaseOrder.findFirst.mockResolvedValue(null);

    await new PurchaseOrderManagementRepository().getPO({
      po_id: "po-id",
      tenant_id: "tenant-id",
      company_id: "company-id",
    });

    const query = prismaMock.purchaseOrder.findFirst.mock.calls[0]?.[0];
    expect(query.include.purchase_requisition).toEqual({
      include: { items: true },
    });
    expect(query.include.purchase_requisition.include.rfq).toBeUndefined();
  });

  it("creates assignments for active supplier relationships when publishing", async () => {
    const tx = {
      rFQ: {
        updateMany: vi.fn().mockResolvedValue({ count: 1 }),
        findFirst: vi.fn().mockResolvedValue({ id: "rfq-id", items: [] }),
      },
      supplierCompanyRelationship: {
        findMany: vi.fn().mockResolvedValue([
          { supplier_id: "supplier-a" },
          { supplier_id: "supplier-b" },
        ]),
      },
      rFQSupplierAssignment: {
        createMany: vi.fn().mockResolvedValue({ count: 2 }),
      },
    };
    prismaMock.$transaction.mockImplementation(async (callback) => callback(tx));

    await new PurchaseOrderManagementRepository().publishRfq({
      rfq_id: "rfq-id",
      tenant_id: "tenant-id",
      company_id: "company-id",
    });

    expect(tx.rFQSupplierAssignment.createMany).toHaveBeenCalledWith({
      data: [
        {
          tenant_id: "tenant-id",
          company_id: "company-id",
          rfq_id: "rfq-id",
          supplier_id: "supplier-a",
        },
        {
          tenant_id: "tenant-id",
          company_id: "company-id",
          rfq_id: "rfq-id",
          supplier_id: "supplier-b",
        },
      ],
      skipDuplicates: true,
    });
  });
});
