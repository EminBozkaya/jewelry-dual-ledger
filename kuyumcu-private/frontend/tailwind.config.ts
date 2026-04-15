import type { Config } from "tailwindcss";

export default {
  theme: {
    extend: {
      fontSize: {
        xs: ["14px", { lineHeight: "1.43" }], // was 12px
        sm: ["16px", { lineHeight: "1.5" }], // was 14px
        base: ["18px", { lineHeight: "1.5" }], // was 16px
        lg: ["20px", { lineHeight: "1.5" }], // was 18px
        xl: ["24px", { lineHeight: "1.33" }], // was 20px
        "2xl": ["30px", { lineHeight: "1.33" }], // was 24px
        "3xl": ["36px", { lineHeight: "1.33" }], // was 30px
        "4xl": ["48px", { lineHeight: "1.25" }],
        "5xl": ["60px", { lineHeight: "1" }],
        "6xl": ["72px", { lineHeight: "1" }],
      },
    },
  },
} satisfies Config;
