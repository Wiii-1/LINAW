import { describe, expect, it } from "vitest";
import {
  CreateRFQSchema,
  MonthlyCompletedProcurementQuerySchema,
  UpdateRFQSchema,
} from "../../../modules/purchase_order_management/purchaseOrderManagementValidator.js";
import { getApplicationTodayDate } from "../../../shared/applicationDate.js";

const purchaseRequisitionId = "00000000-0000-1000-8000-000000000001";

const item = {
  line_no: 1,
  description: "Laptop",
  quantity: 1,
  unit_of_measure: "EA",
  specification: "",
};

const validRequest = {
  purchase_requisition_id: purchaseRequisitionId,
  title: "Office equipment quotation",
  closing_date: "2099-11-01",
};

describe("CreateRFQSchema", () => {
  it.each(["rfq_items", "items"])(
    "accepts an empty specification through the %s alias",
    (field) => {
      const result = CreateRFQSchema.safeParse({
        ...validRequest,
        [field]: [item],
      });

      expect(result.success).toBe(true);
      if (result.success) expect(result.data.rfq_items).toEqual([item]);
    },
  );

  it("rejects a request without RFQ items", () => {
    const result = CreateRFQSchema.safeParse(validRequest);

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            path: ["items"],
            message: "At least one RFQ item is required",
          }),
        ]),
      );
    }
  });

  it("rejects an RFQ item with an incorrect quantity type", () => {
    const result = CreateRFQSchema.safeParse({
      ...validRequest,
      rfq_items: [{ ...item, quantity: "1" }],
    });

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            path: ["rfq_items", 0, "quantity"],
            message: "Invalid input: expected number, received string",
          }),
        ]),
      );
    }
  });

  it("rejects a past RFQ closing date", () => {
    const result = CreateRFQSchema.safeParse({
      ...validRequest,
      closing_date: "2000-01-01",
      rfq_items: [item],
    });

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            path: ["closing_date"],
            message: "RFQ closing date cannot be in the past.",
          }),
        ]),
      );
    }
  });

  it("accepts today's RFQ closing date", () => {
    expect(
      CreateRFQSchema.safeParse({
        ...validRequest,
        closing_date: getApplicationTodayDate(),
        rfq_items: [item],
      }).success,
    ).toBe(true);
  });
});

describe("UpdateRFQSchema", () => {
  it("rejects a past draft RFQ closing date", () => {
    const result = UpdateRFQSchema.safeParse({ closing_date: "2000-01-01" });

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            path: ["closing_date"],
            message: "RFQ closing date cannot be in the past.",
          }),
        ]),
      );
    }
  });
});

describe("MonthlyCompletedProcurementQuerySchema", () => {
  it("accepts a calendar month", () => {
    expect(MonthlyCompletedProcurementQuerySchema.parse({ month: "2026-10" })).toEqual({
      month: "2026-10",
    });
  });

  it("rejects malformed or impossible months", () => {
    expect(() => MonthlyCompletedProcurementQuerySchema.parse({ month: "2026-13" })).toThrow();
    expect(() => MonthlyCompletedProcurementQuerySchema.parse({ month: "October 2026" })).toThrow();
  });
});