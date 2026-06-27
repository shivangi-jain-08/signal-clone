"use client";
import { useEffect, useRef } from "react";

export function useIntersectionObserver(
  callback: IntersectionObserverCallback,
  options?: IntersectionObserverInit,
) {
  const observerRef = useRef<IntersectionObserver | null>(null);

  const ref = useRef<Element | null>(null);

  const setRef = (node: Element | null) => {
    if (ref.current) {
      observerRef.current?.unobserve(ref.current);
    }
    ref.current = node;
    if (node) {
      observerRef.current = new IntersectionObserver(callback, options);
      observerRef.current.observe(node);
    }
  };

  useEffect(() => {
    return () => {
      observerRef.current?.disconnect();
    };
  }, []);

  return setRef;
}
