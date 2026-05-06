import {
  UI_THEME_IDS,
  UI_TEXT_SIZE_IDS,
  type UiThemeId,
  type UiTextSizeId,
  textSizeLabel,
  themeLabel,
} from '@/lib/ui-preferences';

type PreferencesCardProps = {
  theme: UiThemeId;
  textSize: UiTextSizeId;
  onThemeChange: (theme: UiThemeId) => void;
  onTextSizeChange: (size: UiTextSizeId) => void;
};

function segmentLabelClass(selected: boolean): string {
  const base =
    'flex min-h-[2.75rem] min-w-0 flex-1 cursor-pointer items-center justify-center rounded-lg border-2 px-2 py-2 text-center text-sm font-medium leading-snug transition-colors focus-within:outline-none focus-within:ring-2 focus-within:ring-[color:var(--app-focus-ring)] focus-within:ring-offset-2 focus-within:ring-offset-[color:var(--app-bg)] sm:min-w-[7.5rem] sm:px-3 sm:text-base';
  return selected
    ? `${base} border-[color:var(--app-accent)] bg-[color:var(--app-accent)] text-[color:var(--app-accent-fg)]`
    : `${base} border-[color:var(--app-border)] bg-transparent text-[color:var(--app-fg)] hover:border-[color:var(--app-accent)]`;
}

export function PreferencesCard({
  theme,
  textSize,
  onThemeChange,
  onTextSizeChange,
}: PreferencesCardProps) {
  return (
    <section
      aria-labelledby="preferences-heading"
      className="min-w-0 rounded-xl border border-[color:var(--app-border)] bg-[color:var(--app-surface)] p-4 shadow-sm sm:p-6">
      <h2
        id="preferences-heading"
        className="text-xl font-medium text-[color:var(--app-fg)]">
        Preferences
      </h2>
      <p className="mt-1 max-w-prose break-words text-[color:var(--app-fg-muted)]">
        Theme and text size are tuned for WCAG 2.1 AAA contrast. Field errors on
        high-contrast themes use magenta or orange for maximum visibility.
      </p>

      <fieldset className="preferences-segment-group m-0 min-w-0 border-0 p-0">
        <legend className="mt-6 font-medium text-[color:var(--app-fg)]">
          Theme
        </legend>
        <div className="mt-2 flex min-w-0 flex-wrap gap-2">
          {UI_THEME_IDS.map((id) => (
            <label key={id} className={segmentLabelClass(theme === id)}>
              <input
                type="radio"
                name="pref-ui-theme"
                value={id}
                checked={theme === id}
                onChange={() => onThemeChange(id)}
                className="sr-only"
              />
              <span>{themeLabel(id)}</span>
            </label>
          ))}
        </div>
      </fieldset>

      <fieldset className="preferences-segment-group m-0 min-w-0 border-0 p-0">
        <legend className="mt-6 font-medium text-[color:var(--app-fg)]">
          Font size
        </legend>
        <div className="mt-2 flex min-w-0 flex-wrap gap-2">
          {UI_TEXT_SIZE_IDS.map((id) => (
            <label key={id} className={segmentLabelClass(textSize === id)}>
              <input
                type="radio"
                name="pref-ui-text-size"
                value={id}
                checked={textSize === id}
                onChange={() => onTextSizeChange(id)}
                className="sr-only"
              />
              <span>{textSizeLabel(id)}</span>
            </label>
          ))}
        </div>
      </fieldset>
    </section>
  );
}
