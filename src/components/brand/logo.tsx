import Image from "next/image";
import { cn } from "@/lib/utils";

const LOGO_URLS = {
  svg: "https://yhsnzizfskkwmzflnhjw.supabase.co/storage/v1/object/public/wp-content/logo.svg",
  png: "https://yhsnzizfskkwmzflnhjw.supabase.co/storage/v1/object/public/wp-content/logo.png",
  ico: "https://yhsnzizfskkwmzflnhjw.supabase.co/storage/v1/object/public/wp-content/logo.ico",
} as const;

export const LOGO_URL = LOGO_URLS.png;

interface LogoProps {
  className?: string;
  width?: number;
  height?: number;
  showText?: boolean;
  textClassName?: string;
}

export function Logo({
  className,
  width = 24,
  height = 24,
  showText = false,
  textClassName,
}: LogoProps) {
  return (
    <div className={cn("flex items-center gap-2", className)}>
      <Image
        src={LOGO_URL}
        alt="UniCebim Logo"
        width={width}
        height={height}
        className="object-contain"
        priority
        unoptimized
      />
      {showText && (
        <span className={cn("text-lg font-semibold tracking-tight", textClassName)}>
          UniCebim
        </span>
      )}
    </div>
  );
}

export { LOGO_URLS };

