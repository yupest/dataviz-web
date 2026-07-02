export function normalizeNumber(value: unknown): number | null {
  if (typeof value === "number") return value;

  if (typeof value === "string" && value.trim() !== "") {
    const parsed = Number(value.replace(",", "."));
    return Number.isNaN(parsed) ? null : parsed;
  }

  return null;
}

export function formatCategoryLabel(value: unknown, index: number): string {
  if (value === null || value === undefined || value === "") return String(index + 1);
  return String(value);
}