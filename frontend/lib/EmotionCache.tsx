"use client";

import { useState } from "react";
import { useServerInsertedHTML } from "next/navigation";
import createCache from "@emotion/cache";
import { CacheProvider } from "@emotion/react";

export function EmotionCacheProvider({ children }: { children: React.ReactNode }) {
  const [cache] = useState(() => {
    const c = createCache({ key: "mui" });
    c.compat = true;
    return c;
  });

  useServerInsertedHTML(() => {
    const entries = (cache as any).inserted;
    if (!entries || Object.keys(entries).length === 0) return null;

    const names: string[] = [];
    let styles = "";

    for (const [name, style] of Object.entries(entries)) {
      if (typeof style === "string") {
        names.push(name);
        styles += style;
      }
    }

    if (styles === "") return null;

    return (
      <style
        key={cache.key}
        data-emotion={`${cache.key} ${names.join(" ")}`}
        dangerouslySetInnerHTML={{ __html: styles }}
      />
    );
  });

  return <CacheProvider value={cache}>{children}</CacheProvider>;
}
