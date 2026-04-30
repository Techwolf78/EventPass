/**
 * EventPass Modern Theme - Enhanced UI Design System
 * Colors, typography, spacing, and component styles
 */

import { Platform } from 'react-native';

// Primary Colors
const PRIMARY = '#6366f1';
const PRIMARY_LIGHT = '#818cf8';
const PRIMARY_DARK = '#4f46e5';
const SECONDARY = '#06b6d4';
const ACCENT = '#f43f5e';

// Neutral Colors
const TEXT_PRIMARY = '#1f2937';
const TEXT_SECONDARY = '#6b7280';
const TEXT_LIGHT = '#d1d5db';
const BACKGROUND = '#ffffff';
const BACKGROUND_ALT = '#f9fafb';
const BORDER = '#e5e7eb';

// Status Colors
const SUCCESS = '#10b981';
const WARNING = '#f59e0b';
const ERROR = '#ef4444';
const INFO = '#3b82f6';

const tintColorLight = PRIMARY;
const tintColorDark = '#fff';

export const Colors = {
  light: {
    text: TEXT_PRIMARY,
    background: BACKGROUND,
    tint: PRIMARY,
    icon: TEXT_SECONDARY,
    tabIconDefault: TEXT_SECONDARY,
    tabIconSelected: PRIMARY,
    
    // Extended palette
    primary: PRIMARY,
    primaryLight: PRIMARY_LIGHT,
    primaryDark: PRIMARY_DARK,
    secondary: SECONDARY,
    accent: ACCENT,
    success: SUCCESS,
    warning: WARNING,
    error: ERROR,
    info: INFO,
    textSecondary: TEXT_SECONDARY,
    border: BORDER,
    backgroundAlt: BACKGROUND_ALT,
  },
  dark: {
    text: '#ECEDEE',
    background: '#151718',
    tint: tintColorDark,
    icon: '#9BA1A6',
    tabIconDefault: '#9BA1A6',
    tabIconSelected: tintColorDark,
    
    primary: PRIMARY,
    primaryLight: PRIMARY_LIGHT,
    primaryDark: PRIMARY_DARK,
    secondary: SECONDARY,
    accent: ACCENT,
    success: SUCCESS,
    warning: WARNING,
    error: ERROR,
    info: INFO,
    textSecondary: '#a1a1a1',
    border: '#333333',
    backgroundAlt: '#252525',
  },
};

export const Fonts = Platform.select({
  ios: {
    /** iOS `UIFontDescriptorSystemDesignDefault` */
    sans: 'system-ui',
    /** iOS `UIFontDescriptorSystemDesignSerif` */
    serif: 'ui-serif',
    /** iOS `UIFontDescriptorSystemDesignRounded` */
    rounded: 'ui-rounded',
    /** iOS `UIFontDescriptorSystemDesignMonospaced` */
    mono: 'ui-monospace',
  },
  default: {
    sans: 'normal',
    serif: 'serif',
    rounded: 'normal',
    mono: 'monospace',
  },
  web: {
    sans: "system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif",
    serif: "Georgia, 'Times New Roman', serif",
    rounded: "'SF Pro Rounded', 'Hiragino Maru Gothic ProN', Meiryo, 'MS PGothic', sans-serif",
    mono: "SFMono-Regular, Menlo, Monaco, Consolas, 'Liberation Mono', 'Courier New', monospace",
  },
});
