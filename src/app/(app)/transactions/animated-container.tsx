"use client";

import { motion } from "motion/react";
import type { ReactNode } from "react";
import * as React from "react";
import { usePrefersReducedMotion } from "@/lib/use-prefers-reduced-motion";

const containerVariants = {
  hidden: { opacity: 0 },
  show: {
    opacity: 1,
    transition: {
      staggerChildren: 0.1,
    },
  },
};

interface AnimatedContainerProps {
  children: ReactNode;
  className?: string;
}

export function AnimatedContainer({ children, className }: AnimatedContainerProps) {
  const [mounted, setMounted] = React.useState(false);
  const reduceMotion = usePrefersReducedMotion();

  React.useEffect(() => {
    setMounted(true);
  }, []);

  // During SSR and initial hydration, render without animation to prevent flash
  if (!mounted || reduceMotion) {
    return <div className={className}>{children}</div>;
  }

  return (
    <motion.div
      variants={containerVariants}
      initial="hidden"
      animate="show"
      className={className}
    >
      {children}
    </motion.div>
  );
}

