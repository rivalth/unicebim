"use client";

import { motion } from "motion/react";
import * as React from "react";
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
  const [mounted, setMounted] = React.useState(false);
  const reduceMotion = usePrefersReducedMotion();

  React.useEffect(() => {
    setMounted(true);
  }, []);

  // During SSR and initial hydration, render without animation to prevent flash
  if (!mounted || reduceMotion) {
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

