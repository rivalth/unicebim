"use client";

import * as React from "react";
import { useTheme } from "next-themes";
import { motion } from "motion/react";
import { Monitor, Sun, Moon, Check } from "lucide-react";
import { cn } from "@/lib/utils";

type ThemeOption = "system" | "light" | "dark";

interface ThemeOptionConfig {
  value: ThemeOption;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  description: string;
}

const themeOptions: ThemeOptionConfig[] = [
  {
    value: "system",
    label: "Cihaz Teması",
    icon: Monitor,
    description: "Cihazınızın tema ayarını kullan",
  },
  {
    value: "light",
    label: "Açık Mod",
    icon: Sun,
    description: "Açık renk teması",
  },
  {
    value: "dark",
    label: "Koyu Mod",
    icon: Moon,
    description: "Koyu renk teması",
  },
];

/**
 * LightThemePreview - Açık tema için mini UI preview
 */
function LightThemePreview({ isSelected, isHovered }: { isSelected: boolean; isHovered: boolean }) {
  return (
    <div className="relative">
      {/* Mini UI Window */}
      <motion.div
        className="relative h-24 w-28 rounded-md border-2 border-border bg-white shadow-lg overflow-hidden"
        animate={{
          boxShadow: isHovered
            ? "0 4px 12px rgba(0, 0, 0, 0.15)"
            : isSelected
              ? "0 2px 8px rgba(0, 0, 0, 0.1)"
              : "0 1px 3px rgba(0, 0, 0, 0.1)",
        }}
        transition={{ duration: 0.3 }}
      >
        {/* Window Header */}
        <div className="flex h-4 items-center gap-1.5 border-b border-border/50 bg-gray-100 px-2">
          <div className="size-2 rounded-full bg-red-500" />
          <div className="size-2 rounded-full bg-yellow-500" />
          <div className="size-2 rounded-full bg-green-500" />
        </div>

        {/* Content Area */}
        <div className="p-2 space-y-1.5 bg-white">
          {/* Text Lines - Light theme için açık gri tonlar */}
          <div className="h-1 w-full rounded bg-gray-300" />
          <div className="h-1 w-3/4 rounded bg-gray-200" />
          <div className="h-1 w-1/2 rounded bg-gray-200" />

          {/* Image Placeholder */}
          <div className="mt-1.5 h-4 w-full rounded bg-gray-100 border border-gray-200" />

          {/* Decorative Elements - Light theme için açık renkler */}
          <div className="flex gap-1.5 mt-1.5">
            <div className="h-2 w-2 rounded-full bg-blue-200" />
            <div className="h-2 w-2 rounded-full bg-blue-100" />
            <div className="h-2 w-2 rounded-full bg-blue-50" />
          </div>
        </div>

        {/* Cursor (only when selected) */}
        {isSelected && (
          <motion.div
            className="absolute bottom-2 right-2"
            initial={{ opacity: 0 }}
            animate={{ opacity: [0, 1, 0] }}
            transition={{ duration: 1.5, repeat: Infinity, repeatDelay: 0.5 }}
          >
            <div className="size-2.5 border border-gray-400 bg-white" style={{ clipPath: "polygon(0 0, 100% 0, 100% 70%, 70% 100%, 0 100%)" }} />
          </motion.div>
        )}
      </motion.div>
    </div>
  );
}

/**
 * DarkThemePreview - Koyu tema için mini UI preview
 */
function DarkThemePreview({ isSelected, isHovered }: { isSelected: boolean; isHovered: boolean }) {
  return (
    <div className="relative">
      {/* Mini UI Window */}
      <motion.div
        className="relative h-24 w-28 rounded-md border-2 border-border bg-[#0f172a] shadow-lg overflow-hidden"
        animate={{
          boxShadow: isHovered
            ? "0 4px 12px rgba(255, 255, 255, 0.1)"
            : isSelected
              ? "0 2px 8px rgba(255, 255, 255, 0.05)"
              : "0 1px 3px rgba(255, 255, 255, 0.05)",
        }}
        transition={{ duration: 0.3 }}
      >
        {/* Window Header */}
        <div className="flex h-4 items-center gap-1.5 border-b border-gray-700 bg-[#1e293b] px-2">
          <div className="size-2 rounded-full bg-red-500/60" />
          <div className="size-2 rounded-full bg-yellow-500/60" />
          <div className="size-2 rounded-full bg-green-500/60" />
        </div>

        {/* Content Area */}
        <div className="p-2 space-y-1.5 bg-[#0f172a]">
          {/* Text Lines - Dark theme için açık gri tonlar */}
          <div className="h-1 w-full rounded bg-gray-500" />
          <div className="h-1 w-3/4 rounded bg-gray-600" />
          <div className="h-1 w-1/2 rounded bg-gray-600" />

          {/* Image Placeholder */}
          <div className="mt-1.5 h-4 w-full rounded bg-[#1e293b] border border-gray-700" />

          {/* Decorative Elements - Dark theme için açık renkler */}
          <div className="flex gap-1.5 mt-1.5">
            <div className="h-2 w-2 rounded-full bg-blue-400/50" />
            <div className="h-2 w-2 rounded-full bg-blue-400/40" />
            <div className="h-2 w-2 rounded-full bg-blue-400/30" />
          </div>
        </div>

        {/* Cursor (only when selected) */}
        {isSelected && (
          <motion.div
            className="absolute bottom-2 right-2"
            initial={{ opacity: 0 }}
            animate={{ opacity: [0, 1, 0] }}
            transition={{ duration: 1.5, repeat: Infinity, repeatDelay: 0.5 }}
          >
            <div className="size-2.5 border border-gray-400 bg-[#0f172a]" style={{ clipPath: "polygon(0 0, 100% 0, 100% 70%, 70% 100%, 0 100%)" }} />
          </motion.div>
        )}
      </motion.div>
    </div>
  );
}

/**
 * SystemThemePreview - Sistem teması için mini UI preview (her iki temayı gösterir)
 */
// eslint-disable-next-line @typescript-eslint/no-unused-vars
function SystemThemePreview({ isSelected: _isSelected, isHovered }: { isSelected: boolean; isHovered: boolean }) {
  return (
    <div className="relative flex items-center justify-center">
      {/* Two Phone Previews Side by Side */}
      <div className="flex items-center gap-2">
        {/* Light Theme Phone */}
        <motion.div
          className="relative h-24 w-12 rounded-lg border-2 border-border bg-white shadow-md overflow-hidden"
          animate={{
            scale: isHovered ? 1.05 : 1,
          }}
          transition={{ type: "spring", stiffness: 300, damping: 20 }}
        >
          {/* Phone Notch */}
          <div className="absolute top-0 left-1/2 -translate-x-1/2 h-1 w-8 rounded-b-sm bg-gray-300" />
          
          {/* Screen Content */}
          <div className="pt-2 px-1.5 pb-1.5 space-y-1 bg-white">
            <div className="h-0.5 w-full rounded bg-gray-300" />
            <div className="h-0.5 w-2/3 rounded bg-gray-200" />
            <div className="h-2 w-full rounded bg-gray-100" />
          </div>
        </motion.div>

        {/* Dark Theme Phone */}
        <motion.div
          className="relative h-24 w-12 rounded-lg border-2 border-border bg-[#0f172a] shadow-md overflow-hidden"
          animate={{
            scale: isHovered ? 1.05 : 1,
          }}
          transition={{ type: "spring", stiffness: 300, damping: 20, delay: 0.05 }}
        >
          {/* Phone Notch */}
          <div className="absolute top-0 left-1/2 -translate-x-1/2 h-1 w-8 rounded-b-sm bg-gray-700" />
          
          {/* Screen Content */}
          <div className="pt-2 px-1.5 pb-1.5 space-y-1 bg-[#0f172a]">
            <div className="h-0.5 w-full rounded bg-gray-500" />
            <div className="h-0.5 w-2/3 rounded bg-gray-600" />
            <div className="h-2 w-full rounded bg-[#1e293b]" />
          </div>
        </motion.div>
      </div>
    </div>
  );
}

/**
 * ThemeSelector - Tema seçim komponenti
 * 
 * Kullanıcının sistem teması, açık mod veya koyu mod arasında seçim yapmasını sağlar.
 * Her seçenek için animasyonlu kartlar ve hover efektleri içerir.
 */
export function ThemeSelector() {
  const { theme, setTheme } = useTheme();
  const [mounted, setMounted] = React.useState(false);

  React.useEffect(() => {
    setMounted(true);
  }, []);

  // Hydration hatası önlemek için
  if (!mounted) {
    return (
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        {themeOptions.map((option) => (
          <div
            key={option.value}
            className="relative h-40 rounded-lg border bg-card p-4"
          >
            <div className="flex h-full flex-col items-center justify-center gap-3">
              <div className="h-24 w-28 rounded-md bg-muted" />
              <div className="h-4 w-20 rounded bg-muted" />
            </div>
          </div>
        ))}
      </div>
    );
  }

  const currentTheme = theme || "system";

  return (
    <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
      {themeOptions.map((option) => {
        const isSelected = currentTheme === option.value;

        return (
          <ThemeOptionCard
            key={option.value}
            option={option}
            isSelected={isSelected}
            onClick={() => setTheme(option.value)}
          />
        );
      })}
    </div>
  );
}

interface ThemeOptionCardProps {
  option: ThemeOptionConfig;
  isSelected: boolean;
  onClick: () => void;
}

function ThemeOptionCard({ option, isSelected, onClick }: ThemeOptionCardProps) {
  const [isHovered, setIsHovered] = React.useState(false);

  return (
    <motion.button
      type="button"
      onClick={onClick}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      className={cn(
        "group relative h-40 overflow-hidden rounded-lg border-2 bg-card p-4 text-left transition-all duration-300",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
        isSelected
          ? "border-primary shadow-md shadow-primary/20"
          : "border-border hover:border-primary/50 hover:shadow-md",
      )}
      whileHover={{ scale: 1.02 }}
      whileTap={{ scale: 0.98 }}
      transition={{ type: "spring", stiffness: 400, damping: 25 }}
    >
      {/* Selection Indicator */}
      {isSelected && (
        <motion.div
          initial={{ scale: 0, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          className="absolute right-2 top-2 rounded-full bg-primary p-1.5 text-primary-foreground shadow-lg"
        >
          <Check className="size-3" />
        </motion.div>
      )}

      {/* Background Gradient Animation */}
      <motion.div
        className="absolute inset-0 opacity-0 transition-opacity duration-300 group-hover:opacity-100"
        style={{
          background: isSelected
            ? "linear-gradient(135deg, hsl(var(--primary)) 0%, hsl(var(--primary)) 100%)"
            : "linear-gradient(135deg, hsl(var(--primary)/0.1) 0%, hsl(var(--primary)/0.05) 100%)",
        }}
        animate={{
          opacity: isHovered ? (isSelected ? 0.1 : 0.05) : 0,
        }}
      />

      {/* Content */}
      <div className="relative z-10 flex h-full flex-col items-center justify-center gap-3">
        {/* Theme Preview Illustration */}
        <motion.div
          animate={{
            scale: isHovered ? 1.1 : isSelected ? 1.05 : 1,
          }}
          transition={{
            type: "spring",
            stiffness: 300,
            damping: 20,
          }}
          className="relative"
        >
          {option.value === "system" ? (
            <SystemThemePreview isSelected={isSelected} isHovered={isHovered} />
          ) : option.value === "light" ? (
            <LightThemePreview isSelected={isSelected} isHovered={isHovered} />
          ) : (
            <DarkThemePreview isSelected={isSelected} isHovered={isHovered} />
          )}
        </motion.div>

        {/* Label */}
        <div className="flex flex-col items-center">
          <motion.span
            className={cn(
              "text-sm font-semibold transition-colors",
              isSelected ? "text-primary" : "text-foreground",
            )}
            animate={{
              scale: isHovered ? 1.05 : 1,
            }}
          >
            {option.label}
          </motion.span>
        </div>
      </div>

      {/* Shine Effect on Hover */}
      {isHovered && (
        <motion.div
          className="absolute inset-0 rounded-lg"
          style={{
            background: "linear-gradient(135deg, transparent 0%, hsl(var(--primary)/0.1) 50%, transparent 100%)",
          }}
          initial={{ x: "-100%", opacity: 0 }}
          animate={{ x: "100%", opacity: [0, 0.5, 0] }}
          transition={{ duration: 0.6, ease: "easeInOut" }}
        />
      )}
    </motion.button>
  );
}

