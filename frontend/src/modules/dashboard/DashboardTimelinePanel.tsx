import { useMemo, useState } from "react";

import { t } from "../../core/i18n";
import { formatBytes } from "../../lib/format";
import type { WireGuardOverviewHistoryPoint } from "../../types";
import { Panel } from "../../design/ui/Cards";

const TIMELINE_WINDOWS = [6, 24, 72] as const;
const CHART_LEFT = 10;
const CHART_RIGHT = 92;
const CHART_TOP = 10;
const CHART_BOTTOM = 82;

type TimelineChartModel = {
  areaPath: string | null;
  trafficPath: string | null;
  onlinePath: string | null;
  latestUsageBytes: number;
  peakUsageBytes: number;
  peakOnlinePeers: number;
  usageTicks: string[];
  onlineTicks: string[];
  timeTicks: string[];
};

export function DashboardTimelinePanel({
  historyPoints,
  historyWindowHours,
  onHistoryWindowHoursChange,
}: {
  historyPoints: WireGuardOverviewHistoryPoint[];
  historyWindowHours: number;
  onHistoryWindowHoursChange: (hours: number) => void;
}) {
  const [isExpanded, setIsExpanded] = useState(false);
  const chart = useMemo(
    () => buildTimelineChartModel(historyPoints, historyWindowHours),
    [historyPoints, historyWindowHours],
  );

  const actions = (
    <div className="chart-toolbar">
      <div className="chart-range-switch" role="tablist" aria-label={t("dashboard.timeline_window", "Timeline window")}>
        {TIMELINE_WINDOWS.map((hours) => (
          <button
            key={hours}
            className={`chart-range-button ${historyWindowHours === hours ? "chart-range-button-active" : ""}`}
            onClick={() => onHistoryWindowHoursChange(hours)}
            type="button"
            data-testid={`dashboard-timeline-range-${hours}`}
          >
            {hours}h
          </button>
        ))}
      </div>
      <button
        className="ghost-button"
        onClick={() => setIsExpanded(true)}
        type="button"
        data-testid="dashboard-timeline-expand"
      >
        {t("dashboard.timeline_expand", "Expand")}
      </button>
    </div>
  );

  return (
    <>
      <Panel title={t("dashboard.timeline", "Traffic timeline")} actions={actions}>
        <TimelineChartBody chart={chart} historyPoints={historyPoints} />
      </Panel>
      {isExpanded ? (
        <div className="modal-backdrop" onClick={() => setIsExpanded(false)}>
          <div
            className="modal-card timeline-modal-card"
            data-testid="dashboard-timeline-modal"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="panel-header">
              <h2>{t("dashboard.timeline", "Traffic timeline")}</h2>
              <button className="ghost-button" onClick={() => setIsExpanded(false)} type="button">
                {t("common.close", "Close")}
              </button>
            </div>
            <TimelineChartBody chart={chart} historyPoints={historyPoints} expanded />
          </div>
        </div>
      ) : null}
    </>
  );
}

function TimelineChartBody({
  chart,
  historyPoints,
  expanded = false,
}: {
  chart: TimelineChartModel;
  historyPoints: WireGuardOverviewHistoryPoint[];
  expanded?: boolean;
}) {
  if (!chart.trafficPath) {
    return (
      <div className="chart-empty-state">
        <div className="chart-overlay-title">{t("dashboard.timeline_ready", "History collection warming up")}</div>
        <div className="muted-text">
          {t(
            "dashboard.timeline_ready_desc",
            "The chart area is ready and will populate as snapshot points accumulate.",
          )}
        </div>
      </div>
    );
  }

  return (
    <div className={`chart-panel-stack ${expanded ? "chart-panel-stack-expanded" : ""}`}>
      <div className="chart-summary-grid" data-testid="dashboard-timeline-chart">
        <div className="chart-summary-card">
          <span>{t("dashboard.timeline_recorded_short", "Snapshots")}</span>
          <strong>{historyPoints.length}</strong>
        </div>
        <div className="chart-summary-card">
          <span>{t("dashboard.timeline_latest", "Latest total usage")}</span>
          <strong>{formatBytes(chart.latestUsageBytes)}</strong>
        </div>
        <div className="chart-summary-card">
          <span>{t("dashboard.timeline_peak_usage", "Peak total usage")}</span>
          <strong>{formatBytes(chart.peakUsageBytes)}</strong>
        </div>
        <div className="chart-summary-card">
          <span>{t("dashboard.timeline_peak_online", "Peak online peers")}</span>
          <strong>{chart.peakOnlinePeers}</strong>
        </div>
      </div>
      <div className={`chart-shell ${expanded ? "chart-shell-expanded" : ""}`}>
        <div className="chart-y-axis chart-y-axis-left">
          {chart.usageTicks.map((tick) => (
            <span key={`usage-${tick}`}>{tick}</span>
          ))}
        </div>
        <div className="chart-canvas-wrap">
          <div className="chart-placeholder">
            <div className="chart-grid" />
            <svg className="chart-svg" viewBox="0 0 100 100" preserveAspectRatio="none" aria-hidden="true">
              <path className="chart-area" d={chart.areaPath ?? ""} />
              <path className="chart-stroke" d={chart.trafficPath} />
              <path className="chart-stroke-secondary" d={chart.onlinePath ?? ""} />
            </svg>
          </div>
          <div className="chart-x-axis">
            {chart.timeTicks.map((tick, index) => (
              <span key={`${tick}-${index}`}>{tick}</span>
            ))}
          </div>
        </div>
        <div className="chart-y-axis chart-y-axis-right">
          {chart.onlineTicks.map((tick) => (
            <span key={`online-${tick}`}>{tick}</span>
          ))}
        </div>
      </div>
      <div className="chart-legend">
        <span className="chart-legend-item">
          <span className="chart-legend-line chart-legend-line-primary" />
          {t("dashboard.timeline_total_usage", "Total usage")}
        </span>
        <span className="chart-legend-item">
          <span className="chart-legend-line chart-legend-line-secondary" />
          {t("dashboard.timeline_online_series", "Online peers")}
        </span>
      </div>
    </div>
  );
}

function buildTimelineChartModel(
  historyPoints: WireGuardOverviewHistoryPoint[],
  historyWindowHours: number,
): TimelineChartModel {
  if (!historyPoints.length) {
    return {
      areaPath: null,
      trafficPath: null,
      onlinePath: null,
      latestUsageBytes: 0,
      peakUsageBytes: 0,
      peakOnlinePeers: 0,
      usageTicks: [],
      onlineTicks: [],
      timeTicks: [],
    };
  }

  const usageValues = historyPoints.map((point) => point.total_usage_bytes);
  const onlineValues = historyPoints.map((point) => point.online_peer_count);
  const peakUsageBytes = Math.max(...usageValues, 0);
  const peakOnlinePeers = Math.max(...onlineValues, 0);
  const latestUsageBytes = usageValues[usageValues.length - 1] ?? 0;
  const usageScaleMax = Math.max(peakUsageBytes, 1);
  const onlineScaleMax = Math.max(peakOnlinePeers, 1);

  const trafficPoints = historyPoints.map((point, index) => ({
    x: scalePoint(index, historyPoints.length),
    y: scaleValue(point.total_usage_bytes, usageScaleMax),
  }));
  const onlinePoints = historyPoints.map((point, index) => ({
    x: scalePoint(index, historyPoints.length),
    y: scaleValue(point.online_peer_count, onlineScaleMax),
  }));

  const trafficPath = buildPath(trafficPoints);
  const onlinePath = buildPath(onlinePoints);
  const areaPath =
    trafficPath !== null
      ? `${trafficPath} L ${CHART_RIGHT} ${CHART_BOTTOM} L ${CHART_LEFT} ${CHART_BOTTOM} Z`
      : null;

  return {
    areaPath,
    trafficPath,
    onlinePath,
    latestUsageBytes,
    peakUsageBytes,
    peakOnlinePeers,
    usageTicks: [
      formatBytes(usageScaleMax),
      formatBytes(Math.round(usageScaleMax / 2)),
      formatBytes(0),
    ],
    onlineTicks: [`${onlineScaleMax}`, `${Math.round(onlineScaleMax / 2)}`, "0"],
    timeTicks: buildTimeTicks(historyPoints, historyWindowHours),
  };
}

function buildPath(points: Array<{ x: number; y: number }>): string | null {
  if (!points.length) {
    return null;
  }

  if (points.length === 1) {
    return `M ${points[0].x.toFixed(2)} ${points[0].y.toFixed(2)} L ${CHART_RIGHT.toFixed(2)} ${points[0].y.toFixed(2)}`;
  }

  return points
    .map((point, index) => `${index === 0 ? "M" : "L"} ${point.x.toFixed(2)} ${point.y.toFixed(2)}`)
    .join(" ");
}

function scalePoint(index: number, count: number): number {
  if (count <= 1) {
    return CHART_LEFT;
  }
  return CHART_LEFT + (index / (count - 1)) * (CHART_RIGHT - CHART_LEFT);
}

function scaleValue(value: number, maxValue: number): number {
  return CHART_BOTTOM - (value / Math.max(maxValue, 1)) * (CHART_BOTTOM - CHART_TOP);
}

function buildTimeTicks(
  historyPoints: WireGuardOverviewHistoryPoint[],
  historyWindowHours: number,
): string[] {
  const locale = document.documentElement.lang === "ja" ? "ja-JP" : "en-US";
  const tickIndexes = [0, 0.33, 0.66, 1].map((ratio) =>
    Math.min(historyPoints.length - 1, Math.max(0, Math.round((historyPoints.length - 1) * ratio))),
  );

  return tickIndexes.map((index) => {
    const value = historyPoints[index]?.captured_at;
    if (!value) {
      return "";
    }

    return new Intl.DateTimeFormat(locale, {
      month: historyWindowHours > 24 ? "numeric" : undefined,
      day: historyWindowHours > 24 ? "numeric" : undefined,
      hour: "2-digit",
      minute: "2-digit",
    }).format(new Date(value));
  });
}
