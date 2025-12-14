import "server-only";

import { z } from "zod";

const cursorSchema = z.object({
  id: z.string().uuid(),
  date: z
    .string()
    .min(1)
    .refine((v) => Number.isFinite(new Date(v).getTime()), "Invalid cursor date"),
});

export type TxCursor = z.infer<typeof cursorSchema>;

export function encodeTxCursor(cursor: TxCursor): string {
  const json = JSON.stringify(cursor);
  return Buffer.from(json, "utf8").toString("base64url");
}

export function decodeTxCursor(value: string): TxCursor | null {
  try {
    const json = Buffer.from(value, "base64url").toString("utf8");
    const parsed = JSON.parse(json);
    const res = cursorSchema.safeParse(parsed);
    return res.success ? res.data : null;
  } catch {
    return null;
  }
}


