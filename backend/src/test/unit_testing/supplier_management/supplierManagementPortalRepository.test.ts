import { describe, expect, it, vi } from "vitest";

const { prismaMock } = vi.hoisted(() => ({
  prismaMock: {
    $transaction: vi.fn(),
  },
}));

vi.mock("../../../config/database.js", () => ({ prisma: prismaMock }));

import { SupplierManagementPortalRepository } from "../../../modules/supplier_management/supplierManagementPortal/supplierManagementPortalRepository.js";

describe("SupplierManagementPortalRepository.submitQuotation", () => {
  it("allocates a date-scoped human-readable quotation number", async () => {
    const quotationCreate = vi.fn().mockImplementation(async ({ data }) => ({
      ...data,
      id: "quotation-id",
    }));
    const tx = {
      $executeRaw: vi.fn(),
      rFQ: {
        findFirst: vi.fn().mockResolvedValue({
          id: "rfq-id",
          tenant_id: "tenant-id",
          company_id: "company-id",
          closing_date: new Date("2099-11-10T00:00:00.000Z"),
          items: [{ id: "rfq-item-id" }],
        }),
      },
      supplierQuotation: {
        findFirst: vi.fn().mockResolvedValue(null),
        findMany: vi.fn().mockResolvedValue([
          { quotation_number: "QUO-20261110-001" },
          { quotation_number: "QUO-20261110-1000" },
          { quotation_number: "legacy-quotation-uuid-20261110-1" },
        ]),
        create: quotationCreate,
      },
    };
    prismaMock.$transaction.mockImplementation(async (callback) => callback(tx));

    const result = await new SupplierManagementPortalRepository().submitQuotation({
      tenant_id: "tenant-id",
      company_id: "company-id",
      supplier_id: "supplier-id",
      rfq_id: "rfq-id",
      currency_code: "USD",
      total_amount: "100.00",
      submitted_at: new Date("2026-11-10T02:00:00.000Z"),
      valid_until: null,
      items: [
        {
          tenant_id: "tenant-id",
          company_id: "company-id",
          rfq_item_id: "rfq-item-id",
          line_no: 1,
          quoted_quantity: "1.0000",
          unit_price: "100.00",
          total_price: "100.00",
          remarks: "",
        },
      ],
    });

    expect(tx.$executeRaw).toHaveBeenCalledOnce();
    expect(result?.quotation_number).toBe("QUO-20261110-1001");
  });
});
