import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { resolveChildrenChecklistIds } from "./children-roster";
import {
  parseAttendanceSessionDetail,
  parseAttendanceSessionListItem,
} from "./parse";
import {
  activityTypeRequiresMinistry,
  isAttendanceMode,
} from "./types";

describe("attendance helpers", () => {
  it("parses aggregate sessions and preserves dynamic concepts", () => {
    const parsed = parseAttendanceSessionListItem({
      id: "session-1",
      churchId: 7,
      sessionDate: "2026-07-21",
      activityType: "service",
      attendanceMode: "aggregate",
      aggregateData: [
        { label: " Adultos ", value: 12 },
        { label: "Niños", value: "4" },
        { label: "", value: 99 },
        { label: "Inválido", value: -1 },
      ],
      presentCount: 16,
      recordCount: 16,
    });

    assert.ok(parsed);
    assert.equal(parsed.attendanceMode, "aggregate");
    assert.deepEqual(parsed.aggregateData, [
      { label: "Adultos", value: 12 },
      { label: "Niños", value: 4 },
    ]);
  });

  it("defaults legacy sessions to individual mode", () => {
    const parsed = parseAttendanceSessionDetail({
      session: {
        id: "session-legacy",
        church_id: 7,
        session_date: "2026-07-20T00:00:00Z",
        activity_type: "house_group",
        ministry_member_ids: ["member-1"],
      },
      records: [],
    });

    assert.ok(parsed);
    assert.equal(parsed.session.attendanceMode, "individual");
    assert.deepEqual(parsed.session.aggregateData, []);
    assert.deepEqual(parsed.session.ministryMemberIds, ["member-1"]);
  });

  it("keeps children checklist free of adult ministry members", () => {
    assert.deepEqual(
      resolveChildrenChecklistIds(
        ["adult-1", "child-2", "child-1"],
        ["child-1", "child-2", "child-3"],
      ),
      { profileIds: ["child-2", "child-1"], scope: "ministry" },
    );
  });

  it("falls back to registered children when ministry roster has no children", () => {
    assert.deepEqual(
      resolveChildrenChecklistIds(["adult-1"], ["child-1", "child-2"]),
      { profileIds: ["child-1", "child-2"], scope: "church" },
    );
    assert.deepEqual(resolveChildrenChecklistIds([], []), {
      profileIds: [],
      scope: "empty",
    });
  });

  it("enforces known modes and ministry requirements", () => {
    assert.equal(isAttendanceMode("individual"), true);
    assert.equal(isAttendanceMode("aggregate"), true);
    assert.equal(isAttendanceMode("other"), false);
    assert.equal(activityTypeRequiresMinistry("house_group"), true);
    assert.equal(activityTypeRequiresMinistry("children"), true);
    assert.equal(activityTypeRequiresMinistry("service"), false);
  });
});
