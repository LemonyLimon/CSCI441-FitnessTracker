# Accessibility UI (client)

This document describes user-facing accessibility behavior in the React client: themes, text scaling, and how they relate to the API.

## Themes (`data-app-theme`)

The app applies a theme by setting `data-app-theme` on the document root (`<html>`). CSS variables in `client/src/styles/app-themes.css` define foreground, background, borders, focus rings, and semantic colors (errors, success).

Preset theme ids include `standard` and several high-contrast presets (`hc_black`, `hc_charcoal`, `hc_blue`, `hc_yellow`). Theme choice is also reflected in the **`uiHighContrast`** boolean on the user record: any non-`standard` theme is treated as high contrast for server persistence.

The selected theme id may be stored in **browser `localStorage`** (per signed-in `userId`) so the UI can restore the visual preset on the next visit. Server state and local storage can diverge; see PR review notes in [`docs/plans/frontend-accessibility-updates-proposal.md`](plans/frontend-accessibility-updates-proposal.md).

## Text size

Text size is controlled via **`uiTextSize`** on the user profile, updated through `PATCH /api/me/preferences`. The client maps legacy API value `normal` to the `standard` scale. Accepted API values include `standard`, `medium`, `large`, `xl`, and `normal` (legacy). Root font size is scaled from the default for readability.

## Preferences API

See [`docs/api-overview.md`](api-overview.md) for `PATCH /api/me/preferences` JSON fields (`uiHighContrast`, `uiTextSize`).

## Typography

The app loads **Lexend** from Google Fonts (see `client/index.html`). For air-gapped or privacy-sensitive environments, self-hosting or system font fallback can be considered in a future change.
