"use client";

import { Icons } from "@/components/icons";
import { linePercentsExceedMax, sumLinePercents } from "@/lib/discounts/parse";
import { toast } from "@/lib/toast";
import { useTranslations } from "next-intl";
import {
  forwardRef,
  useImperativeHandle,
  useMemo,
  useState,
} from "react";

export type DiscountLineDraft = { label: string; percent: number };

export type DiscountLineEditorHandle = {
  flushDraft: () => DiscountLineDraft[];
};

function parsePercent(raw: string): number | null {
  const percent = Number.parseFloat(raw.replace(",", "."));
  if (!Number.isFinite(percent) || percent <= 0) return null;
  return percent;
}

export const DiscountLineEditor = forwardRef<
  DiscountLineEditorHandle,
  {
    lines: DiscountLineDraft[];
    onChange: (lines: DiscountLineDraft[]) => void;
    disabled?: boolean;
  }
>(function DiscountLineEditor({ lines, onChange, disabled }, ref) {
  const t = useTranslations("discountTemplates");
  const [labelDraft, setLabelDraft] = useState("");
  const [percentDraft, setPercentDraft] = useState("");

  const total = useMemo(
    () => lines.reduce((s, l) => s + l.percent, 0),
    [lines],
  );

  function tryAddDraft(
    currentLines: DiscountLineDraft[],
    labelRaw: string,
    percentRaw: string,
    showErrors: boolean,
  ): DiscountLineDraft[] | null {
    const label = labelRaw.trim();
    const percent = parsePercent(percentRaw);

    if (!label && !percentRaw.trim()) return currentLines;
    if (!label || percent == null) {
      if (showErrors) {
        toast.error(t("lineDraftIncomplete"));
      }
      return null;
    }

    const nextTotal = sumLinePercents(currentLines) + percent;
    if (nextTotal > 100.05) {
      if (showErrors) {
        toast.error(t("percentExceeds100"));
      }
      return null;
    }

    return [...currentLines, { label, percent }];
  }

  function addLine() {
    const next = tryAddDraft(lines, labelDraft, percentDraft, true);
    if (!next) return;
    onChange(next);
    setLabelDraft("");
    setPercentDraft("");
  }

  useImperativeHandle(ref, () => ({
    flushDraft() {
      const next = tryAddDraft(lines, labelDraft, percentDraft, false);
      if (!next) return lines;
      onChange(next);
      setLabelDraft("");
      setPercentDraft("");
      return next;
    },
  }));

  function removeAt(index: number) {
    onChange(lines.filter((_, i) => i !== index));
  }

  return (
    <div>
      <div className="row" style={{ gap: 8, flexWrap: "wrap", marginBottom: 10 }}>
        {lines.map((line, index) => (
          <span key={`${line.label}-${index}`} className="chip violet">
            {line.label} · {line.percent}%
            {!disabled ? (
              <button
                type="button"
                className="btn ghost sm"
                style={{ marginLeft: 6, padding: "0 4px", minHeight: 0 }}
                onClick={() => removeAt(index)}
                aria-label={t("removeLine")}
              >
                <Icons.x size={12} />
              </button>
            ) : null}
          </span>
        ))}
      </div>

      {!disabled ? (
        <div className="row" style={{ gap: 8, flexWrap: "wrap", alignItems: "flex-end" }}>
          <div className="field" style={{ flex: "1 1 160px", margin: 0 }}>
            <label htmlFor="discount-line-label">{t("lineLabel")}</label>
            <div className="input-wrap">
              <input
                id="discount-line-label"
                value={labelDraft}
                onChange={(e) => setLabelDraft(e.target.value)}
                placeholder={t("lineLabelPlaceholder")}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    addLine();
                  }
                }}
              />
            </div>
          </div>
          <div className="field" style={{ width: 100, margin: 0 }}>
            <label htmlFor="discount-line-percent">%</label>
            <div className="input-wrap">
              <input
                id="discount-line-percent"
                className="tnum"
                value={percentDraft}
                onChange={(e) => setPercentDraft(e.target.value)}
                inputMode="decimal"
                placeholder="0"
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    addLine();
                  }
                }}
              />
            </div>
          </div>
          <button type="button" className="btn outline sm" onClick={addLine}>
            <Icons.plus size={14} /> {t("addLine")}
          </button>
        </div>
      ) : null}

      <p
        className="tiny mono"
        style={{
          marginTop: 8,
          color: linePercentsExceedMax(lines)
            ? "var(--danger)"
            : total <= 100.05
              ? "var(--success)"
              : "var(--warning)",
        }}
      >
        {t("percentTotal", { total: total.toFixed(1) })}
        {total < 99.95 ? ` · ${t("percentUnallocated", { rest: (100 - total).toFixed(1) })}` : ""}
      </p>
      <p className="tiny muted" style={{ marginTop: 4 }}>
        {t("linesAddHint")}
      </p>
    </div>
  );
});
