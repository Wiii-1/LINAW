import { prisma } from "../../../config/database.js";
import { formatApplicationDate } from "../../../shared/applicationDate.js";

export class SupplierManagementPortalRepository {
  /**
   * Resolve the Supplier record belonging to the authenticated company.
   */
  async findSupplierByCompany(input: {
    supplier_company_id: string;
    supplier_tenant_id: string;
  }) {
    return prisma.supplier.findFirst({
      where: {
        company_id: input.supplier_company_id,
        tenant_id: input.supplier_tenant_id,
        status: "ACTIVE",
      },
      select: {
        id: true,
        company_id: true,
        tenant_id: true,
      },
    });
  }

  /**
   * Retrieve published RFQs from purchasing companies that have
   * an active relationship with this supplier.
   *
   * RFQs and relationships are scoped using the purchasing company's
   * tenant and company IDs, not the supplier's tenant ID.
   */
  async getAvailableRFQs(input: { supplier_id: string }) {
    return prisma.rFQ.findMany({
      where: {
        status: "PUBLISHED",
        company: {
          supplier_company_relationships: {
            some: {
              supplier_id: input.supplier_id,
              relationship_status: "ACTIVE",
            },
          },
        },
      },
      orderBy: {
        created_at: "desc",
      },
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
    });
  }

  /**
   * Retrieve one published RFQ accessible to the supplier.
   */
  async getRFQ(input: { rfq_id: string; supplier_id: string }) {
    return prisma.rFQ.findFirst({
      where: {
        id: input.rfq_id,
        status: "PUBLISHED",
        company: {
          supplier_company_relationships: {
            some: {
              supplier_id: input.supplier_id,
              relationship_status: "ACTIVE",
            },
          },
        },
      },
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
    });
  }

  /**
   * Retrieve quotations submitted by this supplier.
   *
   * Supplier identity is enforced through supplier_id.
   */
  async getQuotations(input: { supplier_id: string }) {
    return prisma.supplierQuotation.findMany({
      where: {
        supplier_id: input.supplier_id,
      },
      orderBy: {
        created_at: "desc",
      },
      include: {
        items: true,
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
      },
    });
  }

  /**
   * Retrieve one quotation owned by this supplier.
   */
  async getQuotation(input: { quotation_id: string; supplier_id: string }) {
    return prisma.supplierQuotation.findFirst({
      where: {
        id: input.quotation_id,
        supplier_id: input.supplier_id,
      },
      include: {
        items: true,
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
      },
    });
  }

  /**
   * Submit a quotation for an eligible published RFQ.
   *
   * The caller must supply the supplier identity and purchasing
   * company context resolved by the service.
   *
   * Item prices and totals are calculated by the service.
   */
  async submitQuotation(input: {
    tenant_id: string;
    company_id: string;
    supplier_id: string;
    rfq_id: string;
    currency_code: string;
    total_amount: string;
    submitted_at: Date;
    valid_until: Date | null;
    items: {
      tenant_id: string;
      company_id: string;
      rfq_item_id: string;
      line_no: number;
      quoted_quantity: string;
      unit_price: string;
      total_price: string;
      remarks?: string;
    }[];
  }) {
    return prisma.$transaction(async (tx) => {
      // Revalidate RFQ visibility inside the transaction.
      const rfq = await tx.rFQ.findFirst({
        where: {
          id: input.rfq_id,
          tenant_id: input.tenant_id,
          company_id: input.company_id,
          status: "PUBLISHED",
          company: {
            supplier_company_relationships: {
              some: {
                tenant_id: input.tenant_id,
                company_id: input.company_id,
                supplier_id: input.supplier_id,
                relationship_status: "ACTIVE",
              },
            },
          },
        },
        select: {
          id: true,
          closing_date: true,
          items: {
            select: {
              id: true,
            },
          },
        },
      });

      if (!rfq) {
        return null;
      }

      // Prevent submission after the RFQ's closing date.
      if (
        rfq.closing_date &&
        new Date(
          `${rfq.closing_date.toISOString().slice(0, 10)}T23:59:59.999Z`,
        ) < input.submitted_at
      ) {
        return null;
      }

      // Every quoted item must belong to this RFQ.
      const rfqItemIds = new Set(rfq.items.map((item) => item.id));

      if (input.items.some((item) => !rfqItemIds.has(item.rfq_item_id))) {
        return null;
      }

      // Require every RFQ item to be quoted exactly once.
      if (
        input.items.length !== rfq.items.length ||
        new Set(input.items.map((item) => item.rfq_item_id)).size !==
          input.items.length
      ) {
        return null;
      }

      // Prevent duplicate quotations from the same supplier for
      // the same RFQ.
      const existingQuotation = await tx.supplierQuotation.findFirst({
        where: {
          tenant_id: input.tenant_id,
          company_id: input.company_id,
          rfq_id: input.rfq_id,
          supplier_id: input.supplier_id,
          status: {
            not: "CANCELLED",
          },
        },
        select: {
          id: true,
        },
      });

      if (existingQuotation) {
        return null;
      }

      const businessDate = formatApplicationDate(input.submitted_at).replaceAll(
        "-",
        "",
      );
      const sequenceLockKey = `${input.tenant_id}:${businessDate}`;

      await tx.$executeRaw`
        SELECT pg_advisory_xact_lock(hashtextextended(${sequenceLockKey}, 0))
      `;

      const existingNumbers = await tx.supplierQuotation.findMany({
        where: {
          tenant_id: input.tenant_id,
          quotation_number: { contains: `QUO-${businessDate}-` },
        },
        select: { quotation_number: true },
      });
      const sequencePattern = new RegExp(`^QUO-${businessDate}-(\\d+)$`);
      const nextSequence =
        existingNumbers.reduce((highest, quotation) => {
          const match = quotation.quotation_number.match(sequencePattern);
          return match ? Math.max(highest, Number(match[1])) : highest;
        }, 0) + 1;

      return tx.supplierQuotation.create({
        data: {
          tenant_id: input.tenant_id,
          company_id: input.company_id,
          rfq_id: input.rfq_id,
          supplier_id: input.supplier_id,
          quotation_number: `QUO-${businessDate}-${String(nextSequence).padStart(3, "0")}`,
          currency_code: input.currency_code,
          total_amount: input.total_amount,
          status: "SUBMITTED",
          submitted_at: input.submitted_at,
          valid_until: input.valid_until,
          items: {
            create: input.items.map((item) => ({
              tenant_id: item.tenant_id,
              company_id: item.company_id,
              rfq_item_id: item.rfq_item_id,
              line_no: item.line_no,
              quoted_quantity: item.quoted_quantity,
              unit_price: item.unit_price,
              total_price: item.total_price,
              remarks: item.remarks,
            })),
          },
        },
        include: {
          items: true,
        },
      });
    });
  }
}
