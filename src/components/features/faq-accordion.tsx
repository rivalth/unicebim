"use client";

import { motion } from "motion/react";
import { useInView } from "motion/react";
import { useRef } from "react";
import { usePrefersReducedMotion } from "@/lib/use-prefers-reduced-motion";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { cn } from "@/lib/utils";

export interface FAQItem {
  question: string;
  answer: string;
}

export interface FAQAccordionProps {
  items: FAQItem[];
  className?: string;
}

function FAQItemAnimated({
  item,
  index,
  value,
}: {
  item: FAQItem;
  index: number;
  value: string;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const isInView = useInView(ref, { once: true, margin: "-50px" });
  const reduceMotion = usePrefersReducedMotion();

  if (reduceMotion) {
    return (
      <AccordionItem ref={ref} value={value}>
        <AccordionTrigger className="text-left">{item.question}</AccordionTrigger>
        <AccordionContent className="text-muted-foreground">{item.answer}</AccordionContent>
      </AccordionItem>
    );
  }

  return (
    <motion.div
      ref={ref}
      initial={{ opacity: 0, y: 20 }}
      animate={isInView ? { opacity: 1, y: 0 } : { opacity: 0, y: 20 }}
      transition={{
        duration: 0.5,
        delay: index * 0.1,
        ease: [0.16, 1, 0.3, 1],
      }}
    >
      <AccordionItem value={value}>
        <AccordionTrigger className="text-left transition-all hover:text-primary">
          {item.question}
        </AccordionTrigger>
        <AccordionContent className="text-muted-foreground">{item.answer}</AccordionContent>
      </AccordionItem>
    </motion.div>
  );
}

export function FAQAccordion({ items, className }: FAQAccordionProps) {
  return (
    <Accordion type="single" collapsible className={cn("space-y-2", className)}>
      {items.map((item, index) => (
        <FAQItemAnimated
          key={index}
          item={item}
          index={index}
          value={`item-${index}`}
        />
      ))}
    </Accordion>
  );
}

