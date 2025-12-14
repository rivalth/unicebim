"use client";

import * as React from "react";
import { motion } from "motion/react";

import { cn } from "@/lib/utils";

type MotionDivProps = React.ComponentProps<typeof motion.div>;

const cardVariants = {
  hidden: {
    opacity: 0,
    scale: 0.95,
    y: 8,
  },
  visible: {
    opacity: 1,
    scale: 1,
    y: 0,
  },
} satisfies NonNullable<MotionDivProps["variants"]>;

type CardProps = Omit<MotionDivProps, "variants"> & {
  variants?: NonNullable<MotionDivProps["variants"]>;
};

function Card({ className, variants = cardVariants, initial = "hidden", animate = "visible", ...props }: CardProps) {
  return (
    <motion.div
      data-slot="card"
      className={cn("rounded-xl border bg-card text-card-foreground shadow", className)}
      variants={variants}
      initial={initial}
      animate={animate}
      transition={{
        type: "tween",
        ease: "easeOut",
        duration: 0.3,
      }}
      {...props}
    />
  );
}

function CardHeader({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="card-header"
      className={cn("flex flex-col space-y-1.5 p-6", className)}
      {...props}
    />
  );
}

function CardTitle({ className, ...props }: React.ComponentProps<"h3">) {
  return (
    <h3
      data-slot="card-title"
      className={cn("text-lg font-semibold leading-none tracking-tight", className)}
      {...props}
    />
  );
}

function CardDescription({ className, ...props }: React.ComponentProps<"p">) {
  return (
    <p
      data-slot="card-description"
      className={cn("text-sm text-muted-foreground", className)}
      {...props}
    />
  );
}

function CardContent({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div data-slot="card-content" className={cn("p-6 pt-0", className)} {...props} />
  );
}

function CardFooter({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="card-footer"
      className={cn("flex items-center p-6 pt-0", className)}
      {...props}
    />
  );
}

export { Card, CardHeader, CardFooter, CardTitle, CardDescription, CardContent };


