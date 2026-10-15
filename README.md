# ZFT Cinematics | Narrate Editor Development Build

Version: **v0.2.0-dev.25** (validated development build; not yet a stable release).  
Target: **Foundry VTT V13 Build 351**. V14 not verified.  
GitHub: `LuvacZantor/zft-cinematics` branch `develop`. The tested dev.25 code and these notes are the accepted development baseline. `main`, tags, and GitHub Releases require separate approval.  
Companion: **ZFT Narration Library v0.1.0-dev.3** (separate, data-bearing module; preserve its `packs/` and `assets/` directories).

**Current behavior (dev.25):** All nine live Foundry V13 acceptance tests passed on 2026-10-15. The GM explicitly starts narration scrolling; there is no auto-start timer or Independent/Follow GM editor selector. The GM's unified scroll panel controls the followers, who can interrupt and rejoin. **Back to Editor after publishing closes the narration and stops music on player and GM clients**, while retaining the GM's editable draft. Earlier version-by-version sections below are historical, and later behavior supersedes older descriptions.

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
5. See `docs/NARRATE-DEV25-TESTING.md` for the latest accepted behavior and live V13 regression checklist.

Disable the previous standalone Narrate Only module to avoid duplicate listeners. To roll back, restore the last accepted module folder and refresh.

## Validation

The owner confirmed **9 PASS / 0 FAIL / 0 NOT TESTED** in live Foundry V13 testing of dev.25 on 2026-10-15, covering: no auto-start; GM Start; Pause/Resume, speed, and Restart; player interrupt/rejoin; Back to Editor closing player narration and stopping audio on all clients; preserved editor draft; republishing from the top; private Preview; normal Close, audio Pause/Resume, fades, textures, and Save/Load. V14 remains unverified. The individual testing document remains at `docs/NARRATE-DEV25-TESTING.md`. This is not yet a stable/main release.

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

The compendium also holds one internal JournalEntry that tracks Keep status and timestamps shared between worlds; saved Narrate entries are scanned whenever Graphics Library is opened so referenced graphics remain protected, irrespective of age. When saving older world/`Data/assets` images, Cinematics copies them into the portable directory and replaces the saved paths. Older world-based graphics still referenced by newly saved narration are copied into the library. There is no bulk migration control in dev.11; original files are never deleted.

Graphics Library & Maintenance displays reference counts and missing library images. Unreferenced, not-Keep graphics older than seven days can be selected for a **manual cleanup list**; no API-backed deletion and no automatic deletion. Do not manually delete files while Foundry is running. External graphics chosen with Foundry File Picker that aren't managed by Narrate remain external references and may require manual migration.

See `docs/NARRATE-DEV9-TESTING.md` for backup, test, and rollback instructions. V13 live testing and V14 compatibility verification are still required.


## Dev.10 Narration Library controls and folder organization

- The first time a GM opens a world with Cinematics and ZFT Narration Library enabled, Cinematics unlocks `ZFT Narrations` and records a **world-scoped** initialization flag. Future launches respect the current lock state. The GM-only **Locked / Unlocked** action in Narrate explicitly changes the compendium lock through Foundry's `pack.configure` API. Locked packs remain loadable but cannot be saved, updated, or used for new graphics uploads.
- Save to Library opens a full folder-navigation view with the same tree as Load, plus a passage name and explicit new/overwrite selection. Re-saving a loaded passage starts with its existing folder.
- Load Saved has native compendium folder browsing, nested folders, folder creation/rename, move passage, global search, and sort by name (A–Z/Z–A), recently updated, oldest, or Foundry manual order. Nothing is broadcast until the GM clicks Narrate.
- These controls use the library's existing `JournalEntry` compendium and native `Folder` documents, **not** world Journal copies or a new compendium. No changes to the library module `dev.3` are needed.
- Dialog styles are separated from the main editor to correct unreadable input text and excessive dialog height. Scene transitions and Smooth Camera are unchanged.

See `docs/NARRATE-DEV10-TESTING.md` for live Foundry V13 verification. Local browser simulations do not establish compatibility with V14.

## Narrate dev.11 local development

- Save As and Load Saved share the same native compendium folder browser, global search, sorting, folder creation/renaming and contextual move controls.
- Saving requires a chosen folder or explicit Unfiled location. Selecting a saved passage and clicking Update requires overwrite confirmation; a new name creates a new passage. Failed saves remain in the Save As dialog for correction.
- Small Save/Load/Lock controls live beside Storytelling Editor, restoring composition space.
- Graphics Library shows cleanup review selectors on all images; protected or too-new images cannot be selected. Review Selected is disabled unless there are eligible selections. Review remains non-destructive.
- Bulk legacy graphics migration control was removed. An older Narrate image included in a newly saved passage is still copied into portable library storage automatically.


## Narrate dev.12: GM Preview and explicit Publish

- **Preview (GM Only)** renders a local-only narration overlay with the real content and styling. It does **not** update the world narration state, issue a socket/chat message, or start a timed-dismissal countdown.
- **Back to Editor** restores the existing editor DOM and draft, preserving unsaved formatting; **Close Preview** does the same.
- **Save to Library** in Preview uses the existing folder-navigation Save As dialog. The preview is temporarily hidden while the Save As dialog is open, then restored.
- **Publish** from Preview shares that passage with connected players, preserving the chosen chat/expiry settings. The editor also offers direct Publish without preview. Only an explicit Publish action broadcasts narration; Enter never publishes.
- After publishing, GM overlay controls include **Save to Library** beside **Close Narration**. Save As operates locally without re-broadcasting. The current GM's full draft metadata is reused, with a safe fallback for narrations published by other clients/macros.
- Graphics cleanup has a red prohibition icon on protected or not-yet-eligible cleanup selectors; all existing seven-day and saved-reference protections remain intact.
- See `docs/NARRATE-DEV12-TESTING.md` for live Foundry V13 verification. V14 is not yet verified.

## Narrate dev.14: Detached GM Preview and Publish controls

- The content card in **GM Preview** contains only the actual narrated content. The GM Preview label, Back to Editor, Save to Library, Publish, and Close Preview are in a separate floating toolbar.
- Published narration uses the **same card geometry** for players and GM. On the GM client only, Save to Library and Close Narration are in a separate floating toolbar; player clients see no toolbar.
- The toolbar follows the card when it changes size or the window resizes. If a bottom-positioned Subtitle leaves no room below, the controls move above the card where space allows. The toolbar never participates in sizing or centering the content card.
- This is a local development/test build. Live Foundry V13 validation is still required. No changes to Narration Library content or module are required.

## Narrate dev.15: fixed-bottom GM tray and interruptible auto-scroll

- GM Preview and published GM action controls stay at the **bottom center, 20px above the viewport edge**, not positioned by the narration card. Player clients never see GM actions.
- Long passages stay within a height-limited narration card and scroll **inside the card**; short passages display without a scroll control.
- If the passage overflows the card, it remains stationary until the GM explicitly clicks Start Scroll. The selected speed accompanies saved library entries; older entries default to Normal.
- Scroll position, Pause, Resume, and Restart are **per viewer**. Mouse wheel, touch/swipe, scrollbar interaction, or keyboard navigation takes manual control. Automation stays stopped until that viewer chooses Resume. Users with reduced-motion preference start in manual mode.
- **Timed dismissal remains the existing shared timer.** For long narration, use Manual (GM closes); scrolling or pausing does not defer a timed dismissal.
- See `docs/NARRATE-DEV15-TESTING.md` for complete test checklist. Local tests are not live Foundry V13 certification. V14 unverified.


### v0.2.0-dev.20 development notes

- Restore the editor after publishing without altering the current player narration until Publish Again.
- Font color, text highlight, background colors, texture upload/selection and darkness/opacity settings in Narrate.
- Appearance persists in the external ZFT Narration Library compendium and protects saved background graphics from manual cleanup selection.
- Follow GM scrolling uses the unchanged, live-verified dev.17 socket handler and controller. The experimental dev.18 synchronization cache and heartbeat were removed.
- Narration entrance/exit effects use the unchanged, live-verified dev.17 CSS animation and dismissal lifecycle. Experimental dev.18 Web Animations were removed.
- The original fixed Pause/Resume control location is unchanged.
- See `docs/NARRATE-DEV19-TESTING.md` for live Foundry test expectations.


## Narrate dev.21: live speed and optional per-post soundtrack

- GM Preview and published narration now provide a live 1–120 px/second speed slider, +/-5 quick steps, and numeric entry. Speed changes apply without resetting or restarting the current scroll. Follow GM followers receive the GM's next progress update; independent viewers continue at their own speed. The preexisting Pause/Resume location does not change.
- The Narrate editor includes a collapsible Soundtrack section for one optional MP3, OGG, or WAV per saved passage. Choose audio from the shared Audio Library, browse a Foundry-served audio path, or upload an audio file up to 25 MB. Uploaded audio resides in `Data/modules/zft-narration-library/assets/audio/`. The existing library module `v0.1.0-dev.3` can supply storage through `flags.canUpload`, and **must not be removed or overwritten destructively**.
- Each narration can use loop on/off, 0–100 master volume, audio fade on/off (0.25–5 seconds), and automatic start on Publish or manual GM start. Preview is GM-local. A soundtrack attached to a saved passage is restored when loading the entry. A new blank draft defaults to no soundtrack.
- When published, GM Play/Pause/Stop and volume updates are shared through transient socket messages, independent of the established scroll state. Players can mute or adjust their own local volume. If a browser blocks autoplay, the player can click Play Audio to unlock it. Closing or replacing a narration fades/stops the old local soundtrack. No automatic audio-file deletion is implemented; background graphics cleanup never targets audio files.
- Audio shared from the library is reusable in Foundry worlds using the same User Data directory. An externally chosen file path is not automatically copied into the library. For portable assets, use Narrate's Audio Upload.
- Browser/audio autoplay behavior differs by client and must be tested in live V13; sound settings, player scroll speed, and playback states are not proof of V14 compatibility.
- See `docs/NARRATE-DEV21-TESTING.md` for the GM/player acceptance checklist.


## Narrate dev.22: follow-scroll and audio transport corrections

- Fix: live GM scroll-speed changes are no longer overwritten by an unrelated rerender of the same published passage. The slider, quick steps and numeric speed controls continue from the current scroll position.
- Fix: a player dragging the browser's native scrollbar now reliably takes manual control, even when that browser does not dispatch a pointerdown event to the scroll container. The Follow GM button restores synchronization on demand.
- Fix: GM Pause Audio followed by Play Audio resumes the same soundtrack from its paused playback position on GM/player clients. Stop Audio followed by Play Audio still restarts from the beginning; the socket payload now signals restart only after Stop.
- Preserve: all dev.21 audio upload, selection, looping, local player volume/mute, saved passages, narration appearance, fades, Preview, and Back to Editor features. The original scroll control position is unchanged.
- Live Foundry V13 verification is pending. See `docs/NARRATE-DEV22-TESTING.md` for the targeted GM/player checklist.


## Narrate dev.23: live Follow GM speed playback

- Following clients now animate between the GM's frequent normalized scroll packets at the current transmitted speed, rather than relying solely on socket arrivals to advance text.
- The GM's scrollable content height is included in progress packets so different-sized player viewports follow the same relative position and rate.
- Delayed native scroll events from socket/animation-driven updates no longer falsely cancel Follow GM; player wheel, touch, keyboard, or scrollbar actions still interrupt normally.
- Follow GM remains optional; independent auto-scroll, player rejoin, GM manual scrolling, and existing GM/player Pause/Resume behavior are retained.
- Audio playback, upload, looping, volume, and pause timestamp handling from dev.22 are unchanged.
- Install by replacing module files and hard-refreshing GM and player browser clients first. A server restart is **not the default** for this JavaScript-only behavior change.

See `docs/NARRATE-DEV23-TESTING.md` for the two-client test procedure.

## Narrate dev.24: one GM-directed scrolling experience (historical baseline)

- Narrate no longer presents Independent / Follow GM as separate editor modes. Older saved narrations load in the single Follow GM model without rewriting their library entries.
- Long posts remain stationary until the GM presses Start Scroll (or Restart). Following players track the GM's live position and speed.
- GM controls are consolidated in a single scroll panel outside the narration card: Start/Pause/Resume, Restart, speed slider, numeric speed and +/-5 steps, and a position slider that pauses scrolling while seeking.
- Player Pause Follow / Follow GM override button remains in its previous screen position, and player wheel/drag/touch/key input still interrupts locally.
- Audio remains separate; previously validated audio, formatting, fades, backgrounds, shared library and non-Narrate systems are preserved.

**Dev.24 installation:** Replace module files and hard-refresh GM and player browsers (`Ctrl+F5`); no server restart by default.


## Narrate dev.25: explicit GM Start and Back to Editor ends Publish

- No automatic scrolling timer. Newly published and Preview passages open at the top and remain stationary until the GM clicks **Start Scroll**. Restart explicitly returns following players to the top and begins movement.
- The existing GM scroll panel (Start/Pause/Resume, Restart, speed, position), player override/rejoin, manual scroll synchronization, and live speed controls remain unchanged.
- **Back to Editor** on a published narration now closes the active world narration for all players, stops the published soundtrack immediately on GM and player clients, and stops narration scrolling. The GM draft and all saved styling/audio settings are retained for editing and republishing. If the world close operation fails, the editor does not open and the live presentation is left active.
- **Back to Editor** from GM-only Preview remains local and never changes the published narration.
- **Return to Published** is removed; after returning to edit, there is no longer an active prior post to return to.
- The normal **Close Narration** action preserves its existing transition and soundtrack fade-out behavior; the instant stop applies to **Back to Editor** only. Audio Pause/Resume and Stop/Play remain unchanged otherwise.
- For installation, replace the files and **Ctrl+F5 both GM and player clients**. A Foundry server restart is not normally necessary for this JS update. Keep the ZFT Narration Library folder and content unchanged.

See `docs/NARRATE-DEV25-TESTING.md` for the test checklist and recorded 9/9 passing live V13 acceptance. V14 remains unverified.
