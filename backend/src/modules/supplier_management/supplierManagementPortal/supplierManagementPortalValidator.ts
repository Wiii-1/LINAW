import { z } from "zod";
import {
  currencyCodeSchema,
  DEFAULT_CURRENCY_CODE,
  hasCurrencyPrecision,
} from "../../../shared/currency.js";
import { isDateOnOrAfterApplicationToday } from "../../../shared/applicationDate.js";

// ====================
// RFQ Parameters
// ====================

export const SupplierPortalRFQIdSchema = z.object({
  rfqId: z.uuid("Invalid RFQ ID."),
});

// ====================
// Quotation Parameters
// ====================

export const SupplierQuotationParamsSchema = z.object({
  rfqId: z.uuid("Invalid RFQ ID."),
  quotationId: z.uuid("Invalid quotation ID."),
});

// ====================
// Quotation ID
// ====================

export const SupplierQuotationIdSchema = z.object({
  quotationId: z.uuid("Invalid quotation ID."),
});

// ====================
// Quotation Item Schema
// ====================

export const SupplierQuotationItemSchema = z.object({
  rfq_item_id: z.uuid("Invalid RFQ item ID."),

  quoted_quantity: z
    .number()
    .positive("Quoted quantity must be greater than zero.")
    .refine(
      (value) => Number.isFinite(value) && Number(value.toFixed(4)) === value,
      "Quoted quantity supports up to 4 decimal places.",
    ),

  unit_price: z
    .number()
    .positive("Unit price must be greater than zero.")
    .refine(
      (value) => Number.isFinite(value) && Number(value.toFixed(4)) === value,
      "Unit price supports up to 4 decimal places.",
    ),

  remarks: z
    .string()
    .trim()
    .max(1000, "Remarks cannot exceed 1000 characters.")
    .optional(),
});

// ====================
// Submit Quotation Schema
// ====================

export const SubmitSupplierQuotationSchema = z
  .object({
    currency_code: currencyCodeSchema.optional().default(DEFAULT_CURRENCY_CODE),

    valid_until: z.coerce.date().optional(),

    items: z
      .array(SupplierQuotationItemSchema)
      .min(1, "A quotation must contain at least one item."),
  })
  .superRefine((value, context) => {
    if (value.valid_until && !isDateOnOrAfterApplicationToday(value.valid_until)) {
      context.addIssue({
        code: "custom",
        path: ["valid_until"],
        message: "Quotation validity date cannot be in the past.",
      });
    }

    value.items.forEach((item, index) => {
      if (!hasCurrencyPrecision(item.unit_price, value.currency_code)) {
        context.addIssue({
          code: "custom",
          path: ["items", index, "unit_price"],
          message: `Unit price does not match ${value.currency_code} minor-unit precision.`,
        });
      }
    });
  });

// ====================
// Inferred Types
// ====================

export type SupplierPortalRFQId = z.infer<typeof SupplierPortalRFQIdSchema>;

export type SupplierQuotationParams = z.infer<
  typeof SupplierQuotationParamsSchema
>;

export type SupplierQuotationItem = z.infer<typeof SupplierQuotationItemSchema>;

export type SubmitSupplierQuotation = z.infer<
  typeof SubmitSupplierQuotationSchema
>;
