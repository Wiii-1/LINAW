export type PurchaseRequisitionItemType = "GOODS" | "SERVICE" | "ASSET";

export type PurchaseRequisitionUomOption = {
  value: string;
  label: string;
};

export const purchaseRequisitionUomOptions: Record<
  PurchaseRequisitionItemType,
  PurchaseRequisitionUomOption[]
> = {
  GOODS: [
    { value: "PCS", label: "Piece (pcs)" },
    { value: "BOX", label: "Box" },
    { value: "PACK", label: "Pack" },
    { value: "SET", label: "Set" },
    { value: "DOZ", label: "Dozen" },
    { value: "CTN", label: "Carton" },
    { value: "KG", label: "Kilogram" },
    { value: "L", label: "Liter" },
    { value: "EA", label: "Each (legacy)" },
  ],
  ASSET: [
    { value: "UNIT", label: "Unit" },
    { value: "PCS", label: "Piece (pcs)" },
    { value: "SET", label: "Set" },
    { value: "LOT", label: "Lot" },
  ],
  SERVICE: [
    { value: "HOUR", label: "Hour" },
    { value: "DAY", label: "Day" },
    { value: "SESSION", label: "Session" },
    { value: "PROJECT", label: "Project" },
    { value: "JOB", label: "Job" },
    { value: "CONTRACT", label: "Contract" },
  ],
};

export const purchaseRequisitionDefaultUom: Record<
  PurchaseRequisitionItemType,
  string
> = {
  GOODS: "PCS",
  ASSET: "UNIT",
  SERVICE: "HOUR",
};

export function getPurchaseRequisitionUomOptions(
  itemType: PurchaseRequisitionItemType,
) {
  return purchaseRequisitionUomOptions[itemType];
}

export function getPurchaseRequisitionDefaultUom(
  itemType: PurchaseRequisitionItemType,
) {
  return purchaseRequisitionDefaultUom[itemType];
}

export function isPurchaseRequisitionUomValid(
  itemType: PurchaseRequisitionItemType,
  unitOfMeasure: string,
) {
  return getPurchaseRequisitionUomOptions(itemType).some(
    (option) => option.value === unitOfMeasure,
  );
}
