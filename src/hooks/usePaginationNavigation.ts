import { useEffect, useState } from "react";

interface UsePaginationNavigationProps {
  currentPage: number;
  totalPages: number;
  onPageChange: (page: number) => void;
  targetRef: React.RefObject<HTMLElement>;
  enabled?: boolean;
}

export const usePaginationNavigation = ({
  currentPage,
  totalPages,
  onPageChange,
  targetRef,
  enabled = true,
}: UsePaginationNavigationProps) => {
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!enabled) return;
      if (
        e.target instanceof HTMLInputElement ||
        e.target instanceof HTMLTextAreaElement
      )
        return;
      if (e.key === "ArrowLeft" && currentPage > 1) {
        onPageChange(currentPage - 1);
      }
      if (e.key === "ArrowRight" && currentPage < totalPages) {
        onPageChange(currentPage + 1);
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [currentPage, totalPages, onPageChange, enabled]);

  const [touchStart, setTouchStart] = useState<number | null>(null);
  const [touchEnd, setTouchEnd] = useState<number | null>(null);
  const minSwipeDistance = 50;

  useEffect(() => {
    const targetElement = targetRef.current;
    if (!targetElement || !enabled) return;

    const onTouchStart = (e: TouchEvent) => {
      setTouchEnd(null);
      setTouchStart(e.targetTouches[0].clientX);
    };
    const onTouchMove = (e: TouchEvent) =>
      setTouchEnd(e.targetTouches[0].clientX);
    const onTouchEnd = () => {
      if (!touchStart || !touchEnd) return;
      const distance = touchStart - touchEnd;
      const isLeftSwipe = distance > minSwipeDistance;
      const isRightSwipe = distance < -minSwipeDistance;
      if (isLeftSwipe && currentPage < totalPages) {
        onPageChange(currentPage + 1);
      }
      if (isRightSwipe && currentPage > 1) {
        onPageChange(currentPage - 1);
      }
      setTouchStart(null);
      setTouchEnd(null);
    };

    targetElement.addEventListener("touchstart", onTouchStart, {
      passive: true,
    });
    targetElement.addEventListener("touchmove", onTouchMove, { passive: true });
    targetElement.addEventListener("touchend", onTouchEnd);

    return () => {
      if (targetElement) {
        targetElement.removeEventListener("touchstart", onTouchStart);
        targetElement.removeEventListener("touchmove", onTouchMove);
        targetElement.removeEventListener("touchend", onTouchEnd);
      }
    };
  }, [
    touchStart,
    touchEnd,
    targetRef,
    currentPage,
    totalPages,
    onPageChange,
    enabled,
  ]);
};
