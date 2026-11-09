import { describe, expect, it } from "vitest";
import { getApplicationTodayDate } from "../../../shared/applicationDate.js";
import { SubmitSupplierQuotationSchema } from "../../../modules/supplier_management/supplierManagementPortal/supplierManagementPortalValidator.js";

const validQuotation = (valid_until: string) => ({
  valid_until,
  items: [
    {
      rfq_item_id: "00000000-0000-1000-8000-000000000001",
      quoted_quantity: 1,
      unit_price: 100,
    },
  ],
});

describe("Supplier quotation validity date validation", () => {
  it("accepts today and future validity dates", () => {
    expect(() =>
      SubmitSupplierQuotationSchema.parse(validQuotation(getApplicationTodayDate())),
    ).not.toThrow();
    expect(() =>
      SubmitSupplierQuotationSchema.parse(validQuotation("2099-12-31")),
    ).not.toThrow();
  });

  it("rejects a past validity date", () => {
    expect(() =>
      SubmitSupplierQuotationSchema.parse(validQuotation("2000-01-01")),
    ).toThrow("Quotation validity date cannot be in the past");
  });
});
