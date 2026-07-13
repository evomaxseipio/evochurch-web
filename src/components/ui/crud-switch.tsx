"use client";

import { YesNoToggle } from "@/components/ui/yes-no-field";

/** @deprecated Prefer YesNoToggle — kept for existing drawer imports. */
export function CrudSwitch({
  on,
  onChange,
}: {
  on: boolean;
  onChange: (v: boolean) => void;
}) {
  return <YesNoToggle value={on} onChange={onChange} />;
}
