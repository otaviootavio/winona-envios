export const SortableFields = {
  ORDER_NUMBER: "orderNumber",
  UPDATED_AT: "updatedAt",
} as const;

export type SortableFieldValue =
  (typeof SortableFields)[keyof typeof SortableFields];
