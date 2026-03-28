import type { ReactNode } from "react";

export type DashboardPanelSlotId =
  | "dashboard-top-sync"
  | "dashboard-top-timeline"
  | "dashboard-top-side"
  | "dashboard-bottom-topology";

export type DashboardPanelEntry = {
  id: string;
  slot: DashboardPanelSlotId;
  spanClassName: string;
  content: ReactNode;
};

export function getDashboardPanelsForSlot(
  slot: DashboardPanelSlotId,
  panels: DashboardPanelEntry[],
) {
  return panels.filter((panel) => panel.slot === slot);
}
