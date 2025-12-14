"use client";

import type { LucideIcon } from "lucide-react";
import { motion } from "motion/react";
import { usePrefersReducedMotion } from "@/lib/use-prefers-reduced-motion";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";

export interface FeatureCardProps {
  icon: LucideIcon;
  title: string;
  description: string;
  className?: string;
  index?: number;
}

const cardVariants = {
  hidden: { opacity: 0, y: 20 },
  visible: {
    opacity: 1,
    y: 0,
    transition: {
      duration: 0.5,
      ease: [0.16, 1, 0.3, 1],
    },
  },
};

export function FeatureCard({
  icon: Icon,
  title,
  description,
  className,
  index = 0,
}: FeatureCardProps) {
  const reduceMotion = usePrefersReducedMotion();

  if (reduceMotion) {
    return (
      <Card className={cn("h-full transition-all hover:shadow-md hover:scale-[1.02]", className)}>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Icon className="size-5 text-primary" aria-hidden="true" />
            {title}
          </CardTitle>
          <CardDescription>{description}</CardDescription>
        </CardHeader>
        <CardContent className="text-sm text-muted-foreground">
          {/* Additional content can be added here if needed */}
        </CardContent>
      </Card>
    );
  }

  return (
    <motion.div
      variants={cardVariants}
      initial="hidden"
      animate="visible"
      transition={{
        delay: index * 0.1,
        duration: 0.5,
        ease: [0.16, 1, 0.3, 1],
      }}
      whileHover={{ scale: 1.02, y: -4 }}
      className={cn(className)}
    >
      <Card className="h-full">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <motion.div
              initial={{ scale: 0, rotate: -180 }}
              animate={{ scale: 1, rotate: 0 }}
              transition={{
                delay: index * 0.1 + 0.2,
                duration: 0.5,
                ease: [0.16, 1, 0.3, 1],
              }}
            >
              <Icon className="size-5 text-primary" aria-hidden="true" />
            </motion.div>
            {title}
          </CardTitle>
          <CardDescription>{description}</CardDescription>
        </CardHeader>
        <CardContent className="text-sm text-muted-foreground">
          {/* Additional content can be added here if needed */}
        </CardContent>
      </Card>
    </motion.div>
  );
}

