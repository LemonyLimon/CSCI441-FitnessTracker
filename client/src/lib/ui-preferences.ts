/** Visual theme presets (WCAG-oriented high-contrast + standard). */
export type UiThemeId =
  | 'standard'
  | 'hc_black'
  | 'hc_charcoal'
  | 'hc_blue'
  | 'hc_yellow';

/** Root rem scale; maps to API `uiTextSize` strings. */
export type UiTextSizeId = 'standard' | 'medium' | 'large' | 'xl';

export const UI_THEME_IDS: readonly UiThemeId[] = [
  'standard',
  'hc_black',
  'hc_charcoal',
  'hc_blue',
  'hc_yellow',
] as const;

export const UI_TEXT_SIZE_IDS: readonly UiTextSizeId[] = [
  'standard',
  'medium',
  'large',
  'xl',
] as const;

/** 'html { font-size }` - 16 / 20 / 26 / 34 px from default 16px root. */
export const ROOT_FONT_SIZE_PERCENT: Record<UiTextSizeId, string> = {
  standard: '100%',
  medium: '125%',
  large: '162.5%',
  xl: '212.5%',
};

const THEME_STORAGE_PREFIX = 'wtmini.uiTheme.';

export function themeStorageKey(userId: number): string {
  return `${THEME_STORAGE_PREFIX}${userId}`;
}

export function readStoredTheme(userId: number): UiThemeId | null {
  try {
    const raw = localStorage.getItem(themeStorageKey(userId));
    if (!raw) return null;
    if ((UI_THEME_IDS as readonly string[]).includes(raw)) {
      return raw as UiThemeId;
    }
  } catch {
    /* ignore */
  }
  return null;
}

export function writeStoredTheme(userId: number, theme: UiThemeId): void {
  try {
    localStorage.setItem(themeStorageKey(userId), theme);
  } catch {
    /* ignore */
  }
}

export function clearStoredTheme(userId: number): void {
  try {
    localStorage.removeItem(themeStorageKey(userId));
  } catch {
    /* ignore */
  }
}

/** API may return legacy `normal` / `large`. */
export function normalizeUiTextSize(value: string): UiTextSizeId {
  if (value === 'normal') return 'standard';
  if ((UI_TEXT_SIZE_IDS as readonly string[]).includes(value)) {
    return value as UiTextSizeId;
  }
  return 'standard';
}

/** Value persisted on `users.uiTextSize`. */
export function apiTextSizeFromUi(id: UiTextSizeId): string {
  return id;
}

export function themeIsHighContrast(theme: UiThemeId): boolean {
  return theme !== 'standard';
}

export function themeLabel(theme: UiThemeId): string {
  switch (theme) {
    case 'standard':
      return 'Standard';
    case 'hc_black':
      return 'HC Black';
    case 'hc_charcoal':
      return 'HC Charcoal';
    case 'hc_blue':
      return 'HC Blue';
    case 'hc_yellow':
      return 'HC Yellow';
    default:
      return theme;
  }
}

export function textSizeLabel(id: UiTextSizeId): string {
  switch (id) {
    case 'standard':
      return 'Standard (16px)';
    case 'medium':
      return 'Medium (20px)';
    case 'large':
      return 'Large (26px)';
    case 'xl':
      return 'XL (34px)';
    default:
      return id;
  }
}
