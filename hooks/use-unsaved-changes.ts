"use client";

import { useRouter } from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";

export function useUnsavedChanges(isDirty: boolean) {
  const router = useRouter();
  const [showModal, setShowModal] = useState(false);
  const pendingHrefRef = useRef<string | null>(null);
  const ignoreCloseForConfirmRef = useRef(false);

  const cancelNavigation = useCallback(() => {
    pendingHrefRef.current = null;
    setShowModal(false);
  }, []);

  const confirmNavigation = useCallback(() => {
    ignoreCloseForConfirmRef.current = true;
    const href = pendingHrefRef.current;
    pendingHrefRef.current = null;
    setShowModal(false);
    if (href) {
      router.push(href);
    }
    window.requestAnimationFrame(() => {
      ignoreCloseForConfirmRef.current = false;
    });
  }, [router]);

  const onModalOpenChange = useCallback((open: boolean) => {
    if (!open && !ignoreCloseForConfirmRef.current) {
      pendingHrefRef.current = null;
      setShowModal(false);
    }
  }, []);

  const handleNavigate = useCallback(
    (href: string) => {
      if (isDirty) {
        pendingHrefRef.current = href;
        setShowModal(true);
        return;
      }
      router.push(href);
    },
    [isDirty, router],
  );

  useEffect(() => {
    if (!isDirty) {
      return;
    }
    const onBeforeUnload = (event: BeforeUnloadEvent) => {
      event.preventDefault();
      event.returnValue = "";
    };
    window.addEventListener("beforeunload", onBeforeUnload);
    return () => window.removeEventListener("beforeunload", onBeforeUnload);
  }, [isDirty]);

  useEffect(() => {
    if (!isDirty) {
      return;
    }

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
      const hrefAttr = anchor.getAttribute("href");
      if (!hrefAttr || hrefAttr.startsWith("#") || hrefAttr.startsWith("mailto:") || hrefAttr.startsWith("tel:")) {
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
      const nextPath = `${nextUrl.pathname}${nextUrl.search}`;
      const currentPath = `${window.location.pathname}${window.location.search}`;
      if (nextPath === currentPath) {
        return;
      }
      event.preventDefault();
      event.stopPropagation();
      pendingHrefRef.current = nextPath;
      setShowModal(true);
    };

    document.addEventListener("click", onClick, true);
    return () => document.removeEventListener("click", onClick, true);
  }, [isDirty]);

  return {
    showModal,
    confirmNavigation,
    cancelNavigation,
    onModalOpenChange,
    handleNavigate,
  };
}
