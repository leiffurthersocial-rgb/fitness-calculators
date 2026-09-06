import { describe, it, expect } from "vitest";
import { SKILLS, SKILL_BY_ID, skillProgress, stepKey } from "./skills";

describe("skill library", () => {
  it("has unique ids and a complete ladder for every skill", () => {
    const ids = SKILLS.map((s) => s.id);
    expect(new Set(ids).size).toBe(ids.length);
    for (const skill of SKILLS) {
      expect(skill.steps.length).toBeGreaterThanOrEqual(4);
      for (const step of skill.steps) {
        expect(step.criterion.length).toBeGreaterThan(20);
        expect(step.how.length).toBeGreaterThan(20);
      }
      expect(skill.prereqs.length).toBeGreaterThan(0);
      expect(skill.mistakes.length).toBeGreaterThan(0);
      expect(skill.safety.length).toBeGreaterThan(0);
    }
  });

  it("tells you to get a coach and mats for every flip", () => {
    for (const skill of SKILLS.filter((s) => /flip|handspring/.test(s.id))) {
      expect(skill.safety.join(" ")).toMatch(/coach|mat|pit/i);
    }
  });

  it("looks a skill up by id", () => {
    expect(SKILL_BY_ID("handstand")!.name).toMatch(/handstand/i);
    expect(SKILL_BY_ID("nope")).toBeUndefined();
  });
});

describe("skillProgress", () => {
  const skill = SKILL_BY_ID("pistol-squat")!;

  it("counts only consecutive steps from the bottom of the ladder", () => {
    const skipped = new Set([stepKey(skill.id, 0), stepKey(skill.id, 3)]);
    const p = skillProgress(skill, skipped);
    expect(p.done).toBe(1);
    expect(p.next).toBe(skill.steps[1]);
    expect(p.nextIndex).toBe(1);
  });

  it("reports 100% and no next step once the ladder is complete", () => {
    const all = new Set(skill.steps.map((_, i) => stepKey(skill.id, i)));
    const p = skillProgress(skill, all);
    expect(p.pct).toBe(100);
    expect(p.next).toBeNull();
  });

  it("starts at zero", () => {
    const p = skillProgress(skill, new Set());
    expect(p.done).toBe(0);
    expect(p.pct).toBe(0);
    expect(p.next).toBe(skill.steps[0]);
  });
});
