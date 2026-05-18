// Centralized theme tokens for CollegeConnect
export const COLORS = {
  // Brand
  primary: "#4F46E5",
  primaryLight: "#EEF2FF",

  // Background / surfaces
  background: "#FFFFFF",
  surface: "#FFFFFF",

  // Text
  text: "#111827",
  textSecondary: "#6B7280",
  textMuted: "#9CA3AF",

  // Borders
  border: "#E5E7EB",
  borderLight: "#F3F4F6",

  // Status
  success: "#059669",
  successLight: "#ECFDF5",
  warning: "#D97706",
  warningLight: "#FFFBEB",
  danger: "#DC2626",
  dangerLight: "#FEF2F2",

  // Accent
  violet: "#7C3AED",
  violetLight: "#F5F3FF",

  // Shadows
  shadow: "#111827",

  // Attendance status mapping
  attendancePresent: "#059669",
  attendanceAbsent: "#9CA3AF",

  // Role colors (scalable)
  roleStudent: "#0EA5A4",
  roleFaculty: "#4F46E5",
  roleAdmin: "#7C3AED",
} as const;

export const SPACING = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  xxl: 28,
} as const;

export const RADIUS = {
  sm: 6,
  md: 10,
  lg: 12,
  pill: 999,
} as const;

export const TYPOGRAPHY = {
  h1: 28,
  h2: 22,
  h3: 18,
  body: 16,
  small: 13,
  xs: 12,
} as const;

export const FONT_WEIGHT = {
  regular: "400" as const,
  medium: "500" as const,
  semibold: "600" as const,
  bold: "700" as const,
} as const;

export const SHADOWS = {
  small: {
    shadowColor: COLORS.shadow,
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06,
    shadowRadius: 4,
    elevation: 1,
  },
  medium: {
    shadowColor: COLORS.shadow,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 3,
  },
} as const;

// Default theme object for easy imports
export const THEME = {
  COLORS,
  SPACING,
  RADIUS,
  TYPOGRAPHY,
  FONT_WEIGHT,
  SHADOWS,
} as const;

export type Theme = typeof THEME;
/**
 * Below are the colors that are used in the app. The colors are defined in the light and dark mode.
 * There are many other ways to style your app. For example, [Nativewind](https://www.nativewind.dev/), [Tamagui](https://tamagui.dev/), [unistyles](https://reactnativeunistyles.vercel.app), etc.
 */

import { Platform } from "react-native";

const tintColorLight = "#0a7ea4";
const tintColorDark = "#fff";

export const Colors = {
  light: {
    text: "#11181C",
    background: "#fff",
    tint: tintColorLight,
    icon: "#687076",
    tabIconDefault: "#687076",
    tabIconSelected: tintColorLight,
  },
  dark: {
    text: "#ECEDEE",
    background: "#151718",
    tint: tintColorDark,
    icon: "#9BA1A6",
    tabIconDefault: "#9BA1A6",
    tabIconSelected: tintColorDark,
  },
};

export const Fonts = Platform.select({
  ios: {
    /** iOS `UIFontDescriptorSystemDesignDefault` */
    sans: "system-ui",
    /** iOS `UIFontDescriptorSystemDesignSerif` */
    serif: "ui-serif",
    /** iOS `UIFontDescriptorSystemDesignRounded` */
    rounded: "ui-rounded",
    /** iOS `UIFontDescriptorSystemDesignMonospaced` */
    mono: "ui-monospace",
  },
  default: {
    sans: "normal",
    serif: "serif",
    rounded: "normal",
    mono: "monospace",
  },
  web: {
    sans: "system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif",
    serif: "Georgia, 'Times New Roman', serif",
    rounded:
      "'SF Pro Rounded', 'Hiragino Maru Gothic ProN', Meiryo, 'MS PGothic', sans-serif",
    mono: "SFMono-Regular, Menlo, Monaco, Consolas, 'Liberation Mono', 'Courier New', monospace",
  },
});
