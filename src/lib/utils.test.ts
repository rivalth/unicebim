import { describe, expect, it } from "vitest";

import { cn } from "@/lib/utils";

describe("cn", () => {
  it("merges class names and resolves Tailwind conflicts", () => {
    expect(cn("px-2", "px-4")).toBe("px-4");
  });

  it("supports conditional inputs", () => {
    expect(cn("text-sm", false && "text-lg", undefined, null)).toBe("text-sm");
  });
});


