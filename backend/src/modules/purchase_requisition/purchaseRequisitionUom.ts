export type PurchaseRequisitionItemType = "GOODS" | "SERVICE" | "ASSET";

export const purchaseRequisitionUomsByItemType: Record<
  PurchaseRequisitionItemType,
  readonly string[]
> = {
  GOODS: ["PCS", "BOX", "PACK", "SET", "DOZ", "CTN", "KG", "L", "EA"],
  ASSET: ["UNIT", "PCS", "SET", "LOT"],
  SERVICE: ["HOUR", "DAY", "SESSION", "PROJECT", "JOB", "CONTRACT"],
};

export function isPurchaseRequisitionUomValid(
  itemType: PurchaseRequisitionItemType,
  unitOfMeasure: string,
) {
  return purchaseRequisitionUomsByItemType[itemType].includes(unitOfMeasure);
}
