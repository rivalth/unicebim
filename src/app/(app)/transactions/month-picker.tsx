"use client";

import { useRouter, useSearchParams } from "next/navigation";
import * as React from "react";

import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

type Props = {
  initialMonth: string; // YYYY-MM
};

export default function MonthPicker({ initialMonth }: Props) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [month, setMonth] = React.useState(initialMonth);

  return (
    <div className="grid gap-2">
      <Label className="text-xs text-muted-foreground" htmlFor="month">
        Ay
      </Label>
      <Input
        id="month"
        type="month"
        value={month}
        onChange={(e) => {
          const next = e.target.value;
          setMonth(next);

          const params = new URLSearchParams(searchParams.toString());
          if (next) params.set("month", next);
          else params.delete("month");

          const qs = params.toString();
          router.push(qs ? `/transactions?${qs}` : "/transactions");
        }}
      />
    </div>
  );
}


