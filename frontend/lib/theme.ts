"use client";

import { createTheme } from "@mui/material/styles";

export const theme = createTheme({
  palette: {
    background: {
      default: "#F5F3EF",
      paper: "#FFFFFF",
    },
    primary: {
      main: "#3D6B4F",
      dark: "#2D5039",
      light: "#EBF2EE",
      contrastText: "#FFFFFF",
    },
    text: {
      primary: "#1A1916",
      secondary: "#7A766E",
    },
    divider: "#E4DFD7",
  },
  typography: {
    fontFamily: '"Inter", system-ui, sans-serif',
  },
  shape: {
    borderRadius: 12,
  },
  components: {
    MuiCssBaseline: {
      styleOverrides: {
        body: {
          backgroundColor: "#F5F3EF",
        },
        "*::-webkit-scrollbar": { width: "4px" },
        "*::-webkit-scrollbar-track": { background: "transparent" },
        "*::-webkit-scrollbar-thumb": {
          background: "#E4DFD7",
          borderRadius: "2px",
        },
      },
    },
  },
});
