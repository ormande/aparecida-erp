"use client";

import { usePathname } from "next/navigation";
import { useEffect, useRef, useState } from "react";

export function RouteProgress() {
  const pathname = usePathname();
  const [width, setWidth] = useState(0);
  const [visible, setVisible] = useState(false);
  const pathnameRef = useRef(pathname);
  const isFirstPath = useRef(true);

  useEffect(() => {
    if (isFirstPath.current) {
      isFirstPath.current = false;
      pathnameRef.current = pathname;
      return;
    }
    if (pathnameRef.current === pathname) {
      return;
    }
    pathnameRef.current = pathname;
    setVisible(true);
    setWidth(100);
    const done = window.setTimeout(() => {
      setVisible(false);
      setWidth(0);
    }, 280);
    return () => window.clearTimeout(done);
  }, [pathname]);

  useEffect(() => {
    const onClick = (event: MouseEvent) => {
      if (event.defaultPrevented || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey || event.button !== 0) {
        return;
      }
      const el = event.target;
      if (!(el instanceof Element)) {
        return;
      }
      const anchor = el.closest("a[href]");
      if (!anchor || !(anchor instanceof HTMLAnchorElement)) {
        return;
      }
      if (anchor.target === "_blank" || anchor.hasAttribute("download")) {
        return;
      }
      const href = anchor.getAttribute("href");
      if (!href || href.startsWith("#") || href.startsWith("mailto:") || href.startsWith("tel:")) {
        return;
      }
      let nextUrl: URL;
      try {
        nextUrl = new URL(anchor.href);
      } catch {
        return;
      }
      if (nextUrl.origin !== window.location.origin) {
        return;
      }
      if (nextUrl.pathname === window.location.pathname && nextUrl.search === window.location.search) {
        return;
      }
      setVisible(true);
      setWidth(12);
      window.requestAnimationFrame(() => {
        setWidth(72);
      });
    };

    document.addEventListener("click", onClick, true);
    return () => document.removeEventListener("click", onClick, true);
  }, []);

  return (
    <div
      className="pointer-events-none fixed inset-x-0 top-0 z-[100] h-[2px] overflow-hidden"
      aria-hidden
    >
      <div
        className="h-full ease-out"
        style={{
          width: `${width}%`,
          backgroundColor: "var(--color-gold)",
          opacity: visible || width > 0 ? 1 : 0,
          transition: "width 320ms ease-out, opacity 160ms ease-out",
        }}
      />
    </div>
  );
}
