"use client";

import { motion } from "motion/react";
import { usePrefersReducedMotion } from "@/lib/use-prefers-reduced-motion";

const pageVariants = {
  initial: {
    opacity: 0,
    y: 8,
  },
  animate: {
    opacity: 1,
    y: 0,
  },
  exit: {
    opacity: 0,
    y: -8,
  },
};

const pageTransition = {
  type: "tween" as const,
  ease: "easeInOut" as const,
  duration: 0.2,
};

export default function AppTemplate({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const reduceMotion = usePrefersReducedMotion();

  if (reduceMotion) {
    return <div>{children}</div>;
  }

  return (
    <motion.div
      initial="initial"
      animate="animate"
      exit="exit"
      variants={pageVariants}
      transition={pageTransition}
    >
      {children}
    </motion.div>
  );
}

