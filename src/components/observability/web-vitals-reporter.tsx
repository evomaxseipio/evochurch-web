"use client";

import { useEffect } from "react";
import { onCLS, onFCP, onINP, onLCP, onTTFB, type Metric } from "web-vitals";

function reportMetric(metric: Metric) {
  const payload = {
    type: "web_vital" as const,
    name: metric.name,
    value: Math.round(metric.value),
    rating: metric.rating,
    id: metric.id,
  };

  if (process.env.NODE_ENV === "development") {
    console.log(JSON.stringify(payload));
  }
}

export function WebVitalsReporter() {
  useEffect(() => {
    onCLS(reportMetric);
    onFCP(reportMetric);
    onINP(reportMetric);
    onLCP(reportMetric);
    onTTFB(reportMetric);
  }, []);

  return null;
}
