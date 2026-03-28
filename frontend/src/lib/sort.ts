export type SortDirection = "asc" | "desc";

export function compareText(a: string, b: string): number {
  return a.localeCompare(b, undefined, { sensitivity: "base", numeric: true });
}

export function compareBoolean(a: boolean, b: boolean): number {
  if (a === b) {
    return 0;
  }
  return a ? 1 : -1;
}

export function compareNumber(a: number, b: number): number {
  return a - b;
}

export function applySortDirection(value: number, direction: SortDirection): number {
  return direction === "asc" ? value : -value;
}
