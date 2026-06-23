export const ROW_ID_FIELD = "__rowId";

export function isSystemField(field: string): boolean {
  return field === ROW_ID_FIELD;
}