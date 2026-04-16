"use client";

import { ThemeProvider, CssBaseline } from "@mui/material";
import { EmotionCacheProvider } from "@/lib/EmotionCache";
import { theme } from "@/lib/theme";

export function ThemeRegistry({ children }: { children: React.ReactNode }) {
  return (
    <EmotionCacheProvider>
      <ThemeProvider theme={theme}>
        <CssBaseline />
        {children}
      </ThemeProvider>
    </EmotionCacheProvider>
  );
}
