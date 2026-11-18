'use client';

import { useEffect } from 'react';
import { usePathname } from 'next/navigation';

export function ServiceWorkerRegistrar() {
  const pathname = usePathname();

  useEffect(() => {
    if (typeof window === 'undefined' || !('serviceWorker' in navigator)) return;

    const warmCurrentPageAssets = async () => {
      if (!navigator.onLine) return;
      try {
        const reg = await navigator.serviceWorker.ready;
        const sw = reg.active || navigator.serviceWorker.controller;
        if (!sw) return;

        const urls = new Set<string>();
        urls.add(window.location.href);
        urls.add(window.location.origin + window.location.pathname);

        document.querySelectorAll('script[src]').forEach((el) => {
          const src = (el as HTMLScriptElement).src;
          if (src && src.startsWith(window.location.origin)) urls.add(src);
        });
        document.querySelectorAll('link[rel="stylesheet"][href]').forEach((el) => {
          const href = (el as HTMLLinkElement).href;
          if (href && href.startsWith(window.location.origin)) urls.add(href);
        });

        sw.postMessage({
          type: 'WARM_OFFLINE_CACHE',
          urls: Array.from(urls),
        });
      } catch {
        // Ignore SW warm errors
      }
    };

    navigator.serviceWorker
      .register('/sw.js', { scope: '/' })
      .then(() => {
        warmCurrentPageAssets();
      })
      .catch(() => {
        // Ignore registration error in unsupported environments
      });
  }, [pathname]);

  return null;
}
