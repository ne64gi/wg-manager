import { useState } from "react";

import type { SortDirection } from "../../lib/sort";

export function useSortableTable<TSortKey extends string>(defaultSort: {
  key: TSortKey;
  direction: SortDirection;
}) {
  const [sortKey, setSortKey] = useState<TSortKey>(defaultSort.key);
  const [sortDirection, setSortDirection] = useState<SortDirection>(defaultSort.direction);

  function toggleSort(nextKey: TSortKey) {
    if (sortKey === nextKey) {
      setSortDirection((current) => (current === "asc" ? "desc" : "asc"));
      return;
    }

    setSortKey(nextKey);
    setSortDirection("asc");
  }

  return {
    sortKey,
    sortDirection,
    toggleSort,
  };
}
