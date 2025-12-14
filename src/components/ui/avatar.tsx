"use client";

import * as React from "react";
import { cn } from "@/lib/utils";

type AvatarProps = {
  src?: string | null;
  alt?: string;
  fallback?: string;
  className?: string;
  size?: "sm" | "md" | "lg" | "xl";
};

const sizeClasses = {
  sm: "size-8 text-xs",
  md: "size-12 text-sm",
  lg: "size-16 text-base",
  xl: "size-24 text-xl",
};

export function Avatar({ src, alt = "", fallback, className, size = "md" }: AvatarProps) {
  const [error, setError] = React.useState(false);
  const displaySrc = error || !src ? null : src;
  const initials = fallback
    ?.split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);

  return (
    <div
      className={cn(
        "relative flex shrink-0 items-center justify-center overflow-hidden rounded-full bg-muted",
        sizeClasses[size],
        className,
      )}
    >
      {displaySrc ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={displaySrc}
          alt={alt}
          className="size-full object-cover"
          onError={() => setError(true)}
        />
      ) : (
        <span className="font-semibold text-muted-foreground">{initials || "?"}</span>
      )}
    </div>
  );
}
