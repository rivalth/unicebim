import { describe, expect, it, vi } from "vitest";

import { getRequestId } from "./request-id";

describe("getRequestId", () => {
  it("reuses x-request-id when present and within bounds", () => {
    const id = getRequestId({ get: (k) => (k === "x-request-id" ? "req-123" : null) });
    expect(id).toBe("req-123");
  });

  it("generates a new id when missing", () => {
    const spy = vi.spyOn(globalThis.crypto, "randomUUID").mockReturnValue("uuid-1");
    const id = getRequestId({ get: () => null });
    expect(id).toBe("uuid-1");
    spy.mockRestore();
  });

  it("generates a new id when existing is too long", () => {
    const spy = vi.spyOn(globalThis.crypto, "randomUUID").mockReturnValue("uuid-2");
    const long = "x".repeat(129);
    const id = getRequestId({ get: (k) => (k === "x-request-id" ? long : null) });
    expect(id).toBe("uuid-2");
    spy.mockRestore();
  });
});


