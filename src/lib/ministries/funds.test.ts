import { describe, it } from "node:test";
import assert from "node:assert/strict";

import {
  canDeleteFund,
  filterFundsByMinistryScope,
  fundsForMinistry,
  getMinistryDefaultFund,
  getMinistryOperatingFund,
  hasMinistryOperatingFund,
  isMinistryDefaultFund,
  isMinistryOperatingFund,
  ministryAllowsOperatingKind,
  validateFundInputForKind,
} from "./funds";
import type { Fund } from "@/lib/funds/types";
import type { Ministry } from "@/lib/ministries/types";

const ministry: Ministry = {
  id: "min-1",
  name: "Caballeros",
  description: "",
  category: "other",
  leaderProfileIds: [],
  memberProfileIds: [],
  color: "violet",
  isActive: true,
  isFeatured: false,
  defaultFundId: "fund-op",
  createdAt: "2026-01-01",
};

const operatingFund: Fund = {
  fundId: "fund-op",
  churchId: 1,
  name: "Fondo General Caballeros",
  description: "",
  targetAmount: 0,
  startDate: "2026-01-01",
  endDate: null,
  totalContributions: 20000,
  isActive: true,
  isPrimary: false,
  ministryId: "min-1",
  fundKind: "operating",
  createdAt: null,
  updatedAt: null,
};

const projectFund: Fund = {
  ...operatingFund,
  fundId: "fund-proj",
  name: "Conferencia 2026",
  fundKind: "project",
  targetAmount: 150000,
  totalContributions: 50000,
};

const churchFund: Fund = {
  ...operatingFund,
  fundId: "fund-church",
  name: "Fondo General Iglesia",
  ministryId: null,
  fundKind: "operating",
};

const allFunds = [operatingFund, projectFund, churchFund];

describe("ministry funds helpers", () => {
  it("fundsForMinistry returns only ministry funds sorted operating first", () => {
    const result = fundsForMinistry(allFunds, "min-1");
    assert.equal(result.length, 2);
    assert.equal(result[0]?.fundId, "fund-op");
  });

  it("getMinistryOperatingFund returns the single operating fund", () => {
    assert.equal(getMinistryOperatingFund(allFunds, "min-1")?.fundId, "fund-op");
    assert.equal(getMinistryOperatingFund(allFunds, "missing"), null);
  });

  it("hasMinistryOperatingFund and ministryAllowsOperatingKind", () => {
    assert.equal(hasMinistryOperatingFund(allFunds, "min-1"), true);
    assert.equal(ministryAllowsOperatingKind(allFunds, "min-1"), false);
    assert.equal(ministryAllowsOperatingKind(allFunds, "min-2"), true);
  });

  it("isMinistryOperatingFund and canDeleteFund", () => {
    assert.equal(isMinistryOperatingFund(operatingFund), true);
    assert.equal(isMinistryOperatingFund(projectFund), false);
    assert.equal(canDeleteFund(operatingFund), false);
    assert.equal(canDeleteFund(projectFund), true);
  });

  it("getMinistryDefaultFund resolves operating fund", () => {
    const fund = getMinistryDefaultFund(ministry, allFunds);
    assert.equal(fund?.fundId, "fund-op");
  });

  it("getMinistryDefaultFund falls back to operating when default_fund_id null", () => {
    const m = { ...ministry, defaultFundId: null };
    const fund = getMinistryDefaultFund(m, allFunds);
    assert.equal(fund?.fundId, "fund-op");
  });

  it("isMinistryDefaultFund matches operating fund", () => {
    assert.equal(isMinistryDefaultFund(ministry, operatingFund, allFunds), true);
    assert.equal(isMinistryDefaultFund(ministry, projectFund, allFunds), false);
  });

  it("filterFundsByMinistryScope filters church-only funds", () => {
    const churchOnly = filterFundsByMinistryScope(allFunds, "church");
    assert.equal(churchOnly.length, 1);
    assert.equal(churchOnly[0]?.fundId, "fund-church");
  });

  it("filterFundsByMinistryScope filters by ministry id", () => {
    const scoped = filterFundsByMinistryScope(allFunds, "min-1");
    assert.equal(scoped.length, 2);
  });

  it("validateFundInputForKind allows operating fund without target", () => {
    assert.equal(
      validateFundInputForKind({
        name: "Operativo",
        startDate: "2026-01-01",
        targetAmount: 0,
        fundKind: "operating",
      }),
      null,
    );
  });

  it("validateFundInputForKind requires target for project funds", () => {
    assert.equal(
      validateFundInputForKind({
        name: "Campaña",
        startDate: "2026-01-01",
        targetAmount: 0,
        fundKind: "project",
      }),
      "finances.invalidAmount",
    );
  });

  it("validateFundInputForKind blocks second operating fund for ministry", () => {
    assert.equal(
      validateFundInputForKind({
        name: "Otro operativo",
        startDate: "2026-01-01",
        targetAmount: 0,
        fundKind: "operating",
        ministryId: "min-1",
        funds: allFunds,
      }),
      "ministerios.funds.operatingAlreadyExists",
    );
  });
});
