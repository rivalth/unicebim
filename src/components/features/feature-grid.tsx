"use client";

import { StaggerChildren } from "@/components/animations/stagger-children";
import { FeatureCard } from "./feature-card";
import { features } from "./features-data";

export function FeatureGrid() {
  return (
    <StaggerChildren className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3" staggerDelay={0.1}>
      {features.map((feature, index) => (
        <FeatureCard key={index} {...feature} index={index} />
      ))}
    </StaggerChildren>
  );
}

