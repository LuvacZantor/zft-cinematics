# ZFT Cinematics | Narrate Editor Development Build

Version: **v0.2.0-dev.10** (test build, not a stable release).  
Target: **Foundry VTT V13 Build 351**. V14 not verified.  
Baseline: `feature/narrate` at commit `47b5bdb9a0e41b8e85727e3ccff7af32fe827e1f`, plus local Narrate editor enhancements. No repository changes made.

## Features introduced in Dev 2

Open the existing **ZFT Tools → Narrate** action. The old 520-pixel text dialog is replaced with a wider (up to 960 px), resizable, dark editor with emerald accents. The large writing area is scrollable independently; the Narrate and Cancel buttons remain visible in the dialog footer.

The formatting toolbar applies to selected text or subsequently typed text:

- Font family: loaded Foundry world fonts, including custom fonts configured in Foundry (Dev 3)
- Font size: Very small, Small, Normal, Large, Extra large, Huge
- Bold, italic, underline, and clear formatting
- Left, center, right paragraph alignment

The formatting is transmitted to all viewers and retained in the narration chat card. Paste accepts plain text, safe rich HTML, supported Markdown, and image uploads. Shared markup is restricted to an approved set of tags and classes. Foundry-registered fonts are used when available, with a readable fallback when a font cannot load on a client.

Presentation Type and Dismissal are at the top; optional Title appears for Location Title and Announcement, and the duration field appears when Timed Dismissal is chosen (3–300 seconds).

## Retained features

- Four narration presentations: Narration, Location Title, Announcement, Subtitle
- Persistent synchronized narration overlays, chat cards, GM-controlled close, optional timed expiry
- Legacy `/narrate`, `/narration`, `/narrate-close`, `/narration-close` commands and `narrate('text')` API
- Native scene activation fade and directional wipes, scene splash/presentation modes, and shared ZFT Tools controls
- Local Smooth Camera wheel zoom, right-drag, throw/coast, and existing settings

## Install in test Foundry

1. Back up the existing test module folder and world settings. Do not test unverified builds in production.
2. Extract the ZIP to your Foundry Data `modules` directory, replacing the existing `zft-cinematics` folder. The manifest must be at `Data/modules/zft-cinematics/module.json`.
3. Enable ZFT Tools and ZFT Cinematics. An active libWrapper remains necessary for automatic native scene transitions.
4. Hard-refresh GM/player clients. If the manifest or assets are stale, restart Foundry.
5. Follow `docs/NARRATE-DEV10-TESTING.md` inside this ZIP.

Disable the previous standalone Narrate Only module to avoid duplicate listeners. To roll back, restore the last accepted module folder and refresh.

## Validation

JavaScript syntax, ZIP contents/manifest, and Chromium editor simulations passed locally. Real V13 GM/player validation, Foundry-specific Dialog sizing, and V14 support are **not yet confirmed**. No remote branches, tags or releases were changed.

## License

MIT. See `LICENSE`.

## Narrate editor polish in Dev 3

- Font picker uses the current world’s loaded Foundry font families (including fonts configured in Foundry).
- Editor controls, native dropdown lists and Narrate/Cancel buttons use scoped dark/emerald styling.
- Shared narration and chat apply registered font families; unknown or unsupported fonts are discarded.
- Other Cinematics features remain unchanged.

### Narrate editor changes in dev.4

- Paste Markdown headings (up to ###), **bold**, *italics*, and __bold__ as safe rich text. Clipboard HTML is never trusted. Unsupported Markdown stays literal.
- Compact normal Narration text and paragraph gaps; more prominent emerald Close Narration button.
- GM-local editor preferences persist: presentation, dismissal and duration, last selected Foundry font/size, alignment, and window dimensions/position where provided by the Foundry dialog.
- The editor always opens with empty narrative text unless explicitly supplied through the narration API.
- Existing scene transition and Smooth Camera behavior remain unchanged.

See `docs/NARRATE-DEV4-TESTING.md` for regression checks and remaining live V13 requirements.

## Narrate dev.5 test additions

- The Narrate toolbar now includes HTML Source (code icon), Upload Graphic, and a Foundry File Picker for existing images. HTML/clipboard markup is limited to safe presentation tags; scripts and external/data-image URLs are discarded.
- Images from local files can be inserted via paste, drag and drop, or upload. GM uploads use the current world\'s `worlds/<world-id>/zft-cinematics/narration/` directory. Only PNG, JPG, WebP and GIF up to 8 MB are accepted.
- Click an illustration to adjust its width (25%, 50%, 75%, 100%) or alignment. The same safe image path and presentation classes appear on connected player clients.
- `Post narration to chat sidebar` is a GM editor preference, off by default. The existing `narrate(text)` API and slash commands still create chat entries unless the caller opts out explicitly. Player requests still require an authenticated chat message (whispered to connected GMs when chat reporting is disabled), so this setting does not suppress the GM\'s private request channel.
- `Managed Graphics` lists only Narrate-uploaded files, their sizes, and their seven-day review/retention status. **It never deletes files:** Foundry V13 provides no supported in-session file deletion API. No automatic cleanup occurs in this build. Manually delete eligible files through server file administration after verifying they are unreferenced.
- This is a development build. V13 live GM/player testing is required; V14 compatibility is not claimed.

See `docs/NARRATE-DEV5-TESTING.md`.

### Narrate dev.6: Graphics Library and Enter behavior

- **Graphics Library** in the Narrate editor lists previously uploaded images as thumbnails. Search by filename; Insert reuses the existing server file without reuploading it.
- **Keep** protects tracked images from cleanup review. Reusing an image refreshes its last-used date. Graphics over seven days since last use are **review candidates**, not automatically deleted.
- **Enter** creates a paragraph and **Shift+Enter** inserts a line break. Narration is submitted only by clicking **Narrate**; Enter also inserts a normal newline in HTML Source mode.
- Existing scene transitions, splash media, and Smooth Camera are unchanged. V13 GM/player live verification remains pending.

### Narrate dev.7: Editor toolbar organization

- Text formatting (font, size, bold, italic, underline, alignment, clear format, HTML source) is in the first toolbar row.
- Image actions (Upload, Browse, Graphics Library, size, alignment, Remove) are in a dedicated second row.
- Size, alignment, and Remove remain disabled until an image in the editor is selected. Remove only removes the image from the current narration and never deletes a server file.
- Both rows wrap gracefully at narrower window widths. The Graphics Library is in the image toolbar instead of the editor heading.
- Scene transitions, splash media, Smooth Camera, graphics storage, narration synchronization, and Enter/Shift+Enter behavior remain unchanged.
- Foundry V13 live GM/player testing required; V14 is not verified.


## Dev.8 shared narration storage

Install ZFT Narration Library as an optional companion module to enable compendium Save/Load and shared graphics in `Data/assets/zft-narration-library/graphics/`. See `docs/NARRATE-DEV8-TESTING.md`. Do not overwrite a live library compendium when installing updates.


## Dev.9 portable graphics and reference-aware maintenance

**This section supersedes the earlier image paths documented for dev.5 and dev.8.** The ZFT Narration Library `0.1.0-dev.3` must be enabled and its compendium unlocked before new graphics can be uploaded. New Narrate uploads now use `Data/modules/zft-narration-library/assets/graphics/`, and file references start `modules/zft-narration-library/assets/graphics/`. The library's `flags.canUpload` explicitly allows the upload. If the library is disabled, uploads fail with a warning rather than creating new world-specific graphics.

The compendium also holds one internal JournalEntry that tracks Keep status and timestamps shared between worlds; saved Narrate entries are scanned whenever Graphics Library is opened so referenced graphics remain protected, irrespective of age. When saving older world/`Data/assets` images, Cinematics copies them into the portable directory and replaces the saved paths. A manual **Migrate Legacy Graphics** action also updates existing compendium passages, preserving original files. Failed migrations are reported.

Graphics Library & Maintenance displays reference counts and missing library images. Unreferenced, not-Keep graphics older than seven days can be selected for a **manual cleanup list**; no API-backed deletion and no automatic deletion. Do not manually delete files while Foundry is running. External graphics chosen with Foundry File Picker that aren't managed by Narrate remain external references and may require manual migration.

See `docs/NARRATE-DEV9-TESTING.md` for backup, test, and rollback instructions. V13 live testing and V14 compatibility verification are still required.


## Dev.10 Narration Library controls and folder organization

- The first time a GM opens a world with Cinematics and ZFT Narration Library enabled, Cinematics unlocks `ZFT Narrations` and records a **world-scoped** initialization flag. Future launches respect the current lock state. The GM-only **Locked / Unlocked** action in Narrate explicitly changes the compendium lock through Foundry's `pack.configure` API. Locked packs remain loadable but cannot be saved, updated, or used for new graphics uploads.
- Save to Library uses a compact, dark-styled dialog with readable inputs and a **Save in folder** selector plus **+ Folder** creation. Re-saving a loaded passage keeps its existing folder unless the GM changes it.
- Load Saved has native compendium folder browsing, nested folders, folder creation/rename, move passage, global search, and sort by name (A–Z/Z–A), recently updated, oldest, or Foundry manual order. Nothing is broadcast until the GM clicks Narrate.
- These controls use the library's existing `JournalEntry` compendium and native `Folder` documents, **not** world Journal copies or a new compendium. No changes to the library module `dev.3` are needed.
- Dialog styles are separated from the main editor, correcting black-on-black input text, excessive height and unintended horizontal scrolling. Graphics migration, manual cleanup, scene transitions, and Smooth Camera are unchanged.

See `docs/NARRATE-DEV10-TESTING.md` for live Foundry V13 verification. Local browser simulations do not establish compatibility with V14.
