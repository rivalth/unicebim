"use client";

import { motion } from "motion/react";
import type { ReactNode } from "react";
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
  const reduceMotion = usePrefersReducedMotion();

  if (reduceMotion) {
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

