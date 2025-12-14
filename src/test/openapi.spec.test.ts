import { describe, expect, it } from "vitest";
import { readFileSync, existsSync } from "node:fs";
import path from "node:path";
import { parse } from "yaml";

type OpenApiDoc = {
  openapi?: string;
  paths?: Record<string, unknown>;
  components?: {
    schemas?: Record<string, unknown>;
    securitySchemes?: Record<string, unknown>;
  };
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function loadSpec(): OpenApiDoc {
  const specPath = path.join(process.cwd(), "docs", "openapi.yaml");
  const raw = readFileSync(specPath, "utf8");
  return parse(raw) as OpenApiDoc;
}

describe("OpenAPI spec drift", () => {
  it("parses and has core fields", () => {
    const spec = loadSpec();
    expect(spec.openapi).toMatch(/^3\./);
    expect(spec.paths).toBeTruthy();
    expect(spec.components?.schemas).toBeTruthy();
  });

  it("includes known routes that exist in the codebase", () => {
    const spec = loadSpec();

    const routes: Array<{ path: string; file: string }> = [
      { path: "/api/health", file: "src/app/api/health/route.ts" },
      { path: "/api/profile", file: "src/app/api/profile/route.ts" },
      { path: "/api/transactions", file: "src/app/api/transactions/route.ts" },
    ];

    for (const r of routes) {
      expect(existsSync(path.join(process.cwd(), r.file))).toBe(true);
      expect(spec.paths?.[r.path]).toBeTruthy();
    }
  });

  it("keeps ErrorResponse contract stable", () => {
    const spec = loadSpec();
    const err = spec.components?.schemas?.ErrorResponse;
    expect(isRecord(err)).toBe(true);
    if (!isRecord(err)) return;

    const required = err.required;
    expect(Array.isArray(required)).toBe(true);
    if (!Array.isArray(required)) return;

    expect(required).toEqual(expect.arrayContaining(["message", "code", "requestId"]));
  });

  it("does not allow writing monthlyFixedExpenses via profile update", () => {
    const spec = loadSpec();
    const req = spec.components?.schemas?.UpdateMonthlyBudgetGoalRequest;
    expect(isRecord(req)).toBe(true);
    if (!isRecord(req)) return;

    const props = req.properties;
    expect(isRecord(props)).toBe(true);
    if (!isRecord(props)) return;

    expect(props.monthlyFixedExpenses).toBeUndefined();
  });

  it("transactions list supports pagination parameters", () => {
    const spec = loadSpec();
    const txPath = spec.paths?.["/api/transactions"];
    expect(isRecord(txPath)).toBe(true);
    if (!isRecord(txPath)) return;

    const get = txPath.get;
    expect(isRecord(get)).toBe(true);
    if (!isRecord(get)) return;

    const params = get.parameters;
    expect(Array.isArray(params)).toBe(true);
    if (!Array.isArray(params)) return;

    const names = params
      .map((p) => (isRecord(p) ? p.name : undefined))
      .filter((v): v is string => typeof v === "string");

    expect(names).toEqual(expect.arrayContaining(["limit", "cursor"]));
  });
});


