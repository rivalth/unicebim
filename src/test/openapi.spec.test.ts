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

  it("health endpoint returns uptime and runtime information", () => {
    const spec = loadSpec();
    const healthPath = spec.paths?.["/api/health"];
    expect(isRecord(healthPath)).toBe(true);
    if (!isRecord(healthPath)) return;

    const get = healthPath.get;
    expect(isRecord(get)).toBe(true);
    if (!isRecord(get)) return;

    const responses = get.responses;
    expect(isRecord(responses)).toBe(true);
    if (!isRecord(responses)) return;

    const response200 = responses[200 as keyof typeof responses];
    expect(isRecord(response200)).toBe(true);
    if (!isRecord(response200)) return;

    const content = response200.content?.["application/json" as keyof typeof response200.content];
    expect(isRecord(content)).toBe(true);
    if (!isRecord(content)) return;

    const schema = content.schema;
    expect(isRecord(schema)).toBe(true);
    if (!isRecord(schema)) return;

    const required = schema.required;
    expect(Array.isArray(required)).toBe(true);
    if (!Array.isArray(required)) return;

    expect(required).toEqual(
      expect.arrayContaining(["ok", "service", "timestamp", "uptime", "build", "runtime"]),
    );

    // Check uptime structure
    const properties = schema.properties;
    expect(isRecord(properties)).toBe(true);
    if (isRecord(properties)) {
      const uptime = properties["uptime" as keyof typeof properties];
      expect(isRecord(uptime)).toBe(true);
      if (isRecord(uptime)) {
        const uptimeRequired = uptime.required;
        expect(Array.isArray(uptimeRequired)).toBe(true);
        if (Array.isArray(uptimeRequired)) {
          expect(uptimeRequired).toEqual(expect.arrayContaining(["seconds", "milliseconds", "formatted"]));
        }
      }
    }
  });

  it("profile endpoint requires authentication", () => {
    const spec = loadSpec();
    const profilePath = spec.paths?.["/api/profile"];
    expect(isRecord(profilePath)).toBe(true);
    if (!isRecord(profilePath)) return;

    const get = profilePath.get;
    expect(isRecord(get)).toBe(true);
    if (!isRecord(get)) return;

    const security = get.security;
    expect(Array.isArray(security)).toBe(true);
    if (Array.isArray(security) && security.length > 0) {
      expect(security[0]).toHaveProperty("cookieAuth");
    }
  });

  it("transactions POST endpoint validates required fields", () => {
    const spec = loadSpec();
    const txPath = spec.paths?.["/api/transactions"];
    expect(isRecord(txPath)).toBe(true);
    if (!isRecord(txPath)) return;

    const post = txPath.post;
    expect(isRecord(post)).toBe(true);
    if (!isRecord(post)) return;

    const requestBody = post.requestBody;
    expect(isRecord(requestBody)).toBe(true);
    if (!isRecord(requestBody)) return;

    const content = requestBody.content?.["application/json" as keyof typeof requestBody.content];
    expect(isRecord(content)).toBe(true);
    if (!isRecord(content)) return;

    const schema = content.schema;
    expect(isRecord(schema)).toBe(true);
    if (!isRecord(schema)) return;

    // Should reference CreateTransactionRequest schema
    expect(schema).toHaveProperty("$ref");
    if (schema.$ref && typeof schema.$ref === "string") {
      const refPath = schema.$ref.split("/").pop();
      const schemas = spec.components?.schemas;
      if (refPath && isRecord(schemas)) {
        const createSchema = schemas[refPath as keyof typeof schemas];
        expect(isRecord(createSchema)).toBe(true);
        if (isRecord(createSchema)) {
          const required = createSchema.required;
          expect(Array.isArray(required)).toBe(true);
          if (Array.isArray(required)) {
            expect(required).toEqual(expect.arrayContaining(["amount", "type", "category", "date"]));
          }
        }
      }
    }
  });
});


