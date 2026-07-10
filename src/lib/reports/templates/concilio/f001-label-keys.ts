/** Orden y keys i18n de filas F.001 — alineado al Excel oficial. */

export const F001_GENERAL_INCOME_KEYS = [
  "tithes",
  "voluntaryOfferings",
  "specialOfferings",
  "otherOfferings",
  "otherIncome",
  "councilAid",
  "foreignOfferings",
] as const;

export const F001_MINISTRY_INCOME_KEYS = [
  "womensMinistry",
  "mensMinistry",
  "ambassadors",
  "bibleSchool",
  "missionettes",
  "pathfinders",
  "mda",
  "missions",
  "betesdaHome",
] as const;

export const F001_CHURCH_EXPENSE_KEYS = [
  "pastoralSupport",
  "rentHouseTemple",
  "evangelismMissions",
  "utilities",
  "chapelAid",
  "needyAid",
  "maintenance",
  "localMinistrySupport",
  "otherOutflows",
] as const;

export const F001_CHURCH_TO_COUNCIL_KEYS = [
  "churchTithe",
  "ibcr",
  "christianEducation",
  "fpj",
  "pastoralTithe",
  "pastorOtherTithe",
  "spouseTithe",
  "pastorFpjContribution",
] as const;

export const F001_MINISTRY_TO_NATIONAL_KEYS = F001_MINISTRY_INCOME_KEYS;

export const F001_SPECIAL_CONTRIBUTION_KEYS = [
  "evangelismMinistry",
  "desead",
  "churchPlanting",
  "missionaries",
  "orphanMinistries",
  "elderlyMinistries",
  "vulnerableGroups",
  "deafMinistries",
  "councilDevelopment",
] as const;

export type F001LineKey =
  | (typeof F001_GENERAL_INCOME_KEYS)[number]
  | (typeof F001_MINISTRY_INCOME_KEYS)[number]
  | (typeof F001_CHURCH_EXPENSE_KEYS)[number]
  | (typeof F001_CHURCH_TO_COUNCIL_KEYS)[number]
  | (typeof F001_SPECIAL_CONTRIBUTION_KEYS)[number];

export function f001LineI18nKey(key: string): string {
  return `concilioF001.lines.${key}`;
}

const F001_I18N_KEYS = new Set<string>([
  ...F001_GENERAL_INCOME_KEYS,
  ...F001_MINISTRY_INCOME_KEYS,
  ...F001_CHURCH_EXPENSE_KEYS,
  ...F001_CHURCH_TO_COUNCIL_KEYS,
  ...F001_MINISTRY_TO_NATIONAL_KEYS,
  ...F001_SPECIAL_CONTRIBUTION_KEYS,
]);

/** Etiqueta de fila F.001: i18n para keys conocidas; texto literal para plantillas de descuento. */
export function concilioLineDisplayLabel(
  key: string,
  t: (i18nKey: string) => string,
): string {
  if (!F001_I18N_KEYS.has(key)) return key;
  return t(f001LineI18nKey(key));
}
