import { describe, expect, it } from "vitest";

import { loginSchema, registerSchema } from "@/features/auth/schemas";

describe("auth schemas", () => {
  describe("loginSchema", () => {
    it("accepts a valid email/password pair", () => {
      const parsed = loginSchema.parse({ email: "user@example.com", password: "password1" });
      expect(parsed).toEqual({ email: "user@example.com", password: "password1" });
    });

    it("rejects an invalid email", () => {
      expect(() => loginSchema.parse({ email: "not-an-email", password: "password1" })).toThrow();
    });

    it("rejects short passwords", () => {
      expect(() => loginSchema.parse({ email: "user@example.com", password: "123" })).toThrow();
    });
  });

  describe("registerSchema", () => {
    it("accepts a valid payload", () => {
      const parsed = registerSchema.parse({
        fullName: "Ada Lovelace",
        email: "ada@example.com",
        password: "password1",
        passwordConfirm: "password1",
      });

      expect(parsed.fullName).toBe("Ada Lovelace");
    });

    it("rejects when passwords do not match", () => {
      const result = registerSchema.safeParse({
        fullName: "Ada Lovelace",
        email: "ada@example.com",
        password: "password1",
        passwordConfirm: "password2",
      });

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.flatten().fieldErrors.passwordConfirm?.[0]).toBe("Parolalar eşleşmiyor.");
      }
    });
  });
});


