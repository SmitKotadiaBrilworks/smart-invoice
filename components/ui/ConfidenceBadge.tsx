"use client";

import { Tag } from "antd";

interface ConfidenceBadgeProps {
  confidence: number;
  showPercent?: boolean;
}

export default function ConfidenceBadge({
  confidence,
  showPercent = true,
}: ConfidenceBadgeProps) {
  const percent = (confidence * 100).toFixed(0);
  let badgeClass = "badge-paid";

  if (confidence < 0.7) {
    badgeClass = "badge-overdue";
  } else if (confidence < 0.9) {
    badgeClass = "badge-pending";
  }

  return (
    <Tag
      className={badgeClass}
      style={{ border: "none", padding: "4px 12px", borderRadius: "6px" }}
    >
      {showPercent ? `${percent}%` : confidence.toFixed(2)}
    </Tag>
  );
}
