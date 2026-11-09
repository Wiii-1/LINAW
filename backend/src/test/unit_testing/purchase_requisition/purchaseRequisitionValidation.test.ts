import { describe, expect, it } from "vitest";
import { getApplicationTodayDate } from "../../../shared/applicationDate.js";
import {
  PurchaseRequisitionQuerySchema,
  purchaseRequisitionItemSchema,
  purchaseRequisitionInputSchema,
} from "../../../modules/purchase_requisition/purchaseRequisitionValidation.js";

describe("Purchase requisition query validation", () => {
  it("accepts CANCELLED status and normalizes referenceNo", () => {
    const result = PurchaseRequisitionQuerySchema.parse({
      status: "CANCELLED",
      referenceNo: "PR-20261015-001-01",
    });

    expect(result).toEqual({
      status: "CANCELLED",
      referenceNo: "PR-20261015-001-01",
      pr_number: "PR-20261015-001-01",
    });
  });

  it("rejects an invalid requester ID", () => {
    expect(() =>
      PurchaseRequisitionQuerySchema.parse({
        requesterId: "not-a-uuid",
      }),
    ).toThrow();
  });
});

describe("Purchase requisition item UOM validation", () => {
  const item = {
    description: "Consulting service",
    specification: "Implementation support",
    quantity: 1,
    unit_of_measure: "HOUR",
    estimated_unit_cost: 100,
    item_type: "SERVICE" as const,
  };

  it("accepts a UOM configured for the item type", () => {
    expect(purchaseRequisitionItemSchema.parse(item).unit_of_measure).toBe(
      "HOUR",
    );
  });

  it("rejects a UOM configured for a different item type", () => {
    expect(() =>
      purchaseRequisitionItemSchema.parse({ ...item, unit_of_measure: "PCS" }),
    ).toThrow("Unit of measure is not valid for this item type");
  });
});

describe("Purchase requisition needed-by date validation", () => {
  const validItem = {
    description: "Laptop",
    specification: "Business laptop",
    quantity: 1,
    unit_of_measure: "PCS",
    estimated_unit_cost: 100,
    item_type: "GOODS" as const,
  };

  const input = (needed_by_date: string) => ({
    workflow_code: "PURCHASE_REQUISITION",
    justification: "Needed for a new employee workstation.",
    needed_by_date,
    items: [validItem],
  });

  it("accepts today and future needed-by dates", () => {
    expect(() =>
      purchaseRequisitionInputSchema.parse(input(getApplicationTodayDate())),
    ).not.toThrow();
    expect(() =>
      purchaseRequisitionInputSchema.parse(input("2099-12-31")),
    ).not.toThrow();
  });

  it("rejects a past needed-by date", () => {
    expect(() =>
      purchaseRequisitionInputSchema.parse(input("2000-01-01")),
    ).toThrow("Needed-by date cannot be in the past");
  });
});
