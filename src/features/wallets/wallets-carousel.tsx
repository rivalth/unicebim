"use client";

import * as React from "react";
import Link from "next/link";
import { Plus, Wallet, ChevronLeft, ChevronRight } from "lucide-react";
import { Card } from "@/components/ui/card";
import { formatTRY } from "@/lib/money";
import AddWalletDialog from "./add-wallet-dialog";
import { cn } from "@/lib/utils";

type Wallet = {
  id: string;
  name: string;
  balance: number;
  is_default: boolean;
};

type Props = {
  wallets: Wallet[];
};

export default function WalletsCarousel({ wallets }: Props) {
  const [isDialogOpen, setIsDialogOpen] = React.useState(false);
  const scrollContainerRef = React.useRef<HTMLDivElement>(null);
  const [isDragging, setIsDragging] = React.useState(false);
  const [startX, setStartX] = React.useState(0);
  const [scrollLeft, setScrollLeft] = React.useState(0);
  const [hasMoved, setHasMoved] = React.useState(false);
  const [canScrollLeft, setCanScrollLeft] = React.useState(false);
  const [canScrollRight, setCanScrollRight] = React.useState(false);

  const checkScrollability = React.useCallback(() => {
    if (!scrollContainerRef.current) return;
    const { scrollLeft, scrollWidth, clientWidth } = scrollContainerRef.current;
    setCanScrollLeft(scrollLeft > 0);
    setCanScrollRight(scrollLeft < scrollWidth - clientWidth - 1); // -1 for rounding errors
  }, []);

  React.useEffect(() => {
    checkScrollability();
    const container = scrollContainerRef.current;
    if (!container) return;

    container.addEventListener("scroll", checkScrollability);
    window.addEventListener("resize", checkScrollability);

    return () => {
      container.removeEventListener("scroll", checkScrollability);
      window.removeEventListener("resize", checkScrollability);
    };
  }, [checkScrollability, wallets.length]);

  const handleMouseDown = (e: React.MouseEvent) => {
    if (!scrollContainerRef.current) return;
    setIsDragging(true);
    setHasMoved(false);
    setStartX(e.pageX - scrollContainerRef.current.offsetLeft);
    setScrollLeft(scrollContainerRef.current.scrollLeft);
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isDragging || !scrollContainerRef.current) return;
    e.preventDefault();
    const x = e.pageX - scrollContainerRef.current.offsetLeft;
    const walk = (x - startX) * 1; // Scroll speed multiplier 1 = slow, 2 = fast
    
    // Check if user has moved significantly (more than 5px)
    if (Math.abs(walk) > 5) {
      setHasMoved(true);
    }
    
    scrollContainerRef.current.scrollLeft = scrollLeft - walk;
  };

  const handleMouseUp = () => {
    setIsDragging(false);
    setHasMoved(false);
  };

  const handleMouseLeave = () => {
    setIsDragging(false);
    setHasMoved(false);
  };

  const handleTouchStart = (e: React.TouchEvent) => {
    if (!scrollContainerRef.current) return;
    setIsDragging(true);
    setHasMoved(false);
    setStartX(e.touches[0].pageX - scrollContainerRef.current.offsetLeft);
    setScrollLeft(scrollContainerRef.current.scrollLeft);
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (!isDragging || !scrollContainerRef.current) return;
    const x = e.touches[0].pageX - scrollContainerRef.current.offsetLeft;
    const walk = (x - startX) * 1; // Scroll speed multiplier 1 = slow, 2 = fast
    
    // Check if user has moved significantly (more than 5px)
    if (Math.abs(walk) > 5) {
      setHasMoved(true);
    }
    
    scrollContainerRef.current.scrollLeft = scrollLeft - walk;
  };

  const handleTouchEnd = () => {
    setIsDragging(false);
    setHasMoved(false);
  };

  const scrollTo = (direction: "left" | "right") => {
    if (!scrollContainerRef.current) return;
    const container = scrollContainerRef.current;
    const scrollAmount = container.clientWidth * 0.5; // Scroll 50% of container width
    const targetScroll = direction === "left" 
      ? container.scrollLeft - scrollAmount 
      : container.scrollLeft + scrollAmount;
    
    container.scrollTo({
      left: targetScroll,
      behavior: "smooth",
    });
  };

  return (
    <>
      <div className="relative -mx-4 sm:-mx-6">
        {/* Left scroll indicator */}
        {canScrollLeft && (
          <button
            onClick={() => scrollTo("left")}
            className="absolute left-2 sm:left-4 top-1/2 -translate-y-1/2 z-10 rounded-full bg-background/80 backdrop-blur-sm border shadow-lg p-2 animate-pulse hover:bg-background/90 hover:scale-110 transition-all active:scale-95"
            aria-label="Sola kaydır"
          >
            <ChevronLeft className="size-5 sm:size-6 text-primary" />
          </button>
        )}

        {/* Right scroll indicator */}
        {canScrollRight && (
          <button
            onClick={() => scrollTo("right")}
            className="absolute right-2 sm:right-4 top-1/2 -translate-y-1/2 z-10 rounded-full bg-background/80 backdrop-blur-sm border shadow-lg p-2 animate-pulse hover:bg-background/90 hover:scale-110 transition-all active:scale-95"
            aria-label="Sağa kaydır"
          >
            <ChevronRight className="size-5 sm:size-6 text-primary" />
          </button>
        )}

        <div
          ref={scrollContainerRef}
          className="flex gap-4 overflow-x-auto pb-4 px-4 sm:px-6 [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none] select-none"
          style={{
            WebkitOverflowScrolling: "touch",
            cursor: isDragging ? "grabbing" : "grab",
          }}
          onMouseDown={handleMouseDown}
          onMouseMove={handleMouseMove}
          onMouseUp={handleMouseUp}
          onMouseLeave={handleMouseLeave}
          onTouchStart={handleTouchStart}
          onTouchMove={handleTouchMove}
          onTouchEnd={handleTouchEnd}
          onScroll={checkScrollability}
        >
          {wallets.map((wallet) => (
            <Link
              key={wallet.id}
              href={`/wallets/${wallet.id}`}
              onClick={(e) => {
                // Prevent navigation if user was dragging
                if (hasMoved) {
                  e.preventDefault();
                }
              }}
              className="min-w-[280px] sm:min-w-[320px] flex-shrink-0"
            >
              <Card className="h-full border-2 bg-gradient-to-br from-card to-card/95 transition-all hover:border-primary/50 hover:shadow-md">
                <div className="p-4 sm:p-6">
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex-1 min-w-0 flex items-center justify-between">
                      <div className="flex items-center gap-2 mb-1">
                        <Wallet className="size-4 sm:size-5 text-muted-foreground flex-shrink-0" />
                        <h3 className="font-semibold text-sm sm:text-base truncate">{wallet.name}</h3>
                      </div>
                      <div className="flex items-center gap-2">
                        {wallet.is_default && (
                          <span className="text-[10px] text-muted-foreground bg-primary/10 px-2 py-1 rounded-full">varsayılan</span>
                        )}
                      </div>
                    </div>
                  </div>
                  <div className="mt-4">
                    <p className="text-xs sm:text-sm text-muted-foreground mb-1">Bakiye</p>
                    <p className="text-2xl sm:text-3xl font-bold">{formatTRY(wallet.balance)}</p>
                  </div>
                </div>
              </Card>
            </Link>
          ))}

          {/* Add New Wallet Card */}
          <Card
            className={cn(
              "min-w-[280px] sm:min-w-[320px] flex-shrink-0 border-2 border-dashed",
              "bg-gradient-to-br from-muted/30 to-muted/20",
              "hover:from-muted/40 hover:to-muted/30 transition-colors",
              "cursor-pointer"
            )}
            onClick={() => {
              // Only open dialog if user didn't drag (moved less than 5px)
              if (!hasMoved) {
                setIsDialogOpen(true);
              }
            }}
          >
            <div className="p-4 sm:p-6 h-full flex flex-col items-center justify-center min-h-[140px] sm:min-h-[160px]">
              <div className="flex flex-col items-center gap-3 text-center">
                <div className="rounded-full bg-primary/10 p-3">
                  <Plus className="size-6 sm:size-7 text-primary" />
                </div>
                <div>
                  <h3 className="font-semibold text-sm sm:text-base mb-1">Yeni Cüzdan Ekle</h3>
                  <p className="text-xs text-muted-foreground">
                    Yeni bir cüzdan oluştur
                  </p>
                </div>
              </div>
            </div>
          </Card>
        </div>
      </div>

      

      <AddWalletDialog open={isDialogOpen} onOpenChange={setIsDialogOpen} />
    </>
  );
}

