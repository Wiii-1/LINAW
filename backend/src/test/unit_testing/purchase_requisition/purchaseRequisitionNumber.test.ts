import { beforeEach, describe, expect, it, vi } from "vitest";
import { purchaseRequisitionService } from "../../../modules/purchase_requisition/purchaseRequisitionService.js";

const repository = {
  findByUserId: vi.fn(),
  findActiveByUserId: vi.fn(),
  findByRequisitionId: vi.fn(),
  update: vi.fn(),
  createRequisitionWithItemsAndStatusLog: vi.fn(),
};

const approvalWorkflowRepository = {
  findApprovalWorkflowDefinition: vi.fn(),
};

const eventBus = { publish: vi.fn() };
const service = new purchaseRequisitionService(
  repository as never,
  eventBus as never,
  approvalWorkflowRepository as never,
);

const prefixGenerator = (purpose: string | null | undefined) =>
  (
    service as unknown as {
      prNumberPrefixGenerator: (value: string | null | undefined) => string;
    }
  ).prNumberPrefixGenerator(purpose);

describe("purchase requisition number generation", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("normalizes purpose into a readable PR prefix", () => {
    expect(prefixGenerator(" Office / Supplies!!! ")).toBe(
      "PR-OFFICE-SUPPLIES",
    );
  });

  it("removes unsupported characters and limits long purposes", () => {
    const prefix = prefixGenerator(
      "A very long purpose with @ unsupported # characters and more details",
    );

    expect(prefix).toBe("PR-A-VERY-LONG-PURPOSE-WITH-UNSUPPORTED-CHA");
    expect(prefix.length).toBeLessThanOrEqual(44);
  });

  it("uses GENERAL when purpose has no supported characters", () => {
    expect(prefixGenerator("---***---")).toBe("PR-GENERAL");
  });

  it("passes the normalized prefix to creation without exposing a UUID", async () => {
    repository.findByUserId.mockResolvedValue({ id: "user-id" });
    repository.findActiveByUserId.mockResolvedValue({ company_id: "company-id" });
    approvalWorkflowRepository.findApprovalWorkflowDefinition.mockResolvedValue({
      id: "workflow-id",
    });
    repository.createRequisitionWithItemsAndStatusLog.mockResolvedValue({
      id: "requisition-id",
    });

    await service.createRequisition({
      purpose: "Laptop Procurement",
      workflow_code: "PURCHASE_REQUISITION",
      justification: "Needed for a new employee",
      priority: "NORMAL",
      currency_code: "USD",
      items: [
        {
          item_type: "GOODS",
          description: "Laptop",
          specification: "Standard",
          quantity: 1,
          unit_of_measure: "EA",
          estimated_unit_cost: 1000,
        },
      ],
      tenantId: "tenant-id",
      userId: "user-id",
      companyId: "company-id",
    } as never);

    const calls = repository.createRequisitionWithItemsAndStatusLog.mock.calls;
    expect(calls).toHaveLength(1);
    const call = calls[0];
    if (!call) throw new Error("Expected a requisition creation call");
    const [data, , , prefix] = call;
    expect(prefix).toBe("PR-LAPTOP-PROCUREMENT");
    expect(data.pr_number).toBe("");
    expect(data.pr_number).not.toContain(data.id);
  });

  it("does not include pr_number when changing the purpose", async () => {
    repository.findByRequisitionId.mockResolvedValue({
      id: "requisition-id",
      tenant_id: "tenant-id",
      company_id: "company-id",
      requested_by_user_id: "user-id",
      status: "DRAFT",
    });
    repository.findByUserId.mockResolvedValue({ id: "user-id" });
    repository.findActiveByUserId.mockResolvedValue({ company_id: "company-id" });
    repository.update.mockResolvedValue({ id: "requisition-id" });

    await service.updateRequisition(
      "requisition-id",
      "user-id",
      "tenant-id",
      "company-id",
      {
        purpose: "Changed purpose",
        requested_by_user_id: "user-id",
      } as never,
    );

    expect(repository.update).toHaveBeenCalledWith(
      "requisition-id",
      expect.not.objectContaining({ pr_number: expect.anything() }),
    );
  });
});
