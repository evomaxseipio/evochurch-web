/** Etiquetas CEAD — sección A/B ingresos (informe financiero mensual, REP-2). */
export const CEAD_INCOME_LINE_LABELS = [
  "Diezmos",
  "Ofrendas Voluntarias",
  "Ofrendas Especiales",
  "Donaciones",
  "Otros Ingresos",
] as const;
export type CeadIncomeLineLabel = (typeof CEAD_INCOME_LINE_LABELS)[number];

export const CEAD_INCOME_LINE_I18N_KEYS: Record<CeadIncomeLineLabel, string> = {
  Diezmos: "cead.incomeLines.tithes",
  "Ofrendas Voluntarias": "cead.incomeLines.voluntaryOfferings",
  "Ofrendas Especiales": "cead.incomeLines.specialOfferings",
  Donaciones: "cead.incomeLines.donations",
  "Otros Ingresos": "cead.incomeLines.otherIncome",
};

/** Etiquetas CEAD — sección B egresos (informe financiero mensual, REP-2). */
export const CEAD_EXPENSE_LINE_LABELS = [
  "Asignación Pastoral",
  "Alquileres",
  "Servicios (Luz, Agua, Internet)",
  "Mantenimiento y Reparaciones",
  "Materiales y Suministros",
  "Otros Egresos",
] as const;
export type CeadExpenseLineLabel = (typeof CEAD_EXPENSE_LINE_LABELS)[number];

export const CEAD_EXPENSE_LINE_I18N_KEYS: Record<CeadExpenseLineLabel, string> = {
  "Asignación Pastoral": "cead.expenseLines.pastoralSupport",
  Alquileres: "cead.expenseLines.rent",
  "Servicios (Luz, Agua, Internet)": "cead.expenseLines.utilities",
  "Mantenimiento y Reparaciones": "cead.expenseLines.maintenance",
  "Materiales y Suministros": "cead.expenseLines.supplies",
  "Otros Egresos": "cead.expenseLines.otherOutflows",
};

/** Envíos al concilio — sección C (REP-2). */
export const CEAD_COUNCIL_SEND_LABELS = [
  "Diezmo de la iglesia (10%)",
  "IBCR (3%)",
  "Educación Cristiana (1%)",
  "FPJ (1%)",
] as const;
export type CeadCouncilSendLabel = (typeof CEAD_COUNCIL_SEND_LABELS)[number];

export const CEAD_COUNCIL_SEND_I18N_KEYS: Record<CeadCouncilSendLabel, string> = {
  "Diezmo de la iglesia (10%)": "cead.councilLines.churchTithe",
  "IBCR (3%)": "cead.councilLines.ibcr",
  "Educación Cristiana (1%)": "cead.councilLines.christianEducation",
  "FPJ (1%)": "cead.councilLines.fpj",
};

export const CEAD_COUNCIL_FORMULA_I18N_KEYS: Record<string, string> = {
  "10% × (ingresos − asignación pastoral)": "cead.formulas.titheBase",
  "3% × total ingresos": "cead.formulas.ibcr",
  "1% × total ingresos": "cead.formulas.onePercent",
};

/** Buckets de edad formulario estadístico anual (REP-4). */
export const CEAD_AGE_BUCKET_LABELS = [
  "0-5",
  "6-12",
  "13-17",
  "18-25",
  "26-35",
  "36-50",
  "51-65",
  "65+",
] as const;
export type CeadAgeBucketLabel = (typeof CEAD_AGE_BUCKET_LABELS)[number];
