# ZFT Cinematics v0.2.0-dev.5 — Narrate QA checklist

Target: Foundry VTT V13 Build 351. Local Chromium and simulated game-state checks passed; actual Foundry V13 GM/player behavior is not yet verified. V14 is not validated.

## New editor features

1. Open ZFT Tools > Narrate. Verify HTML Source, Upload Image, Foundry Image Picker, image size/alignment tools, Post to Chat, and Managed Graphics. The full-size Narrate and Cancel buttons should remain accessible.
2. Enter HTML such as `<h2>The Gate</h2><p><b>Darkness</b> falls over the ruins.</p>` via HTML Source and toggle back. It should render heading and bold, then present on the player overlay. Test unsafe `<script>` and `<img src="https://example.com/a.png">`; both must be dropped. Supported graphics must use server-relative Foundry image paths.
3. Paste a PNG from clipboard, drag and drop a JPG/WebP/GIF, and click Upload Image to select a file. Test an image larger than 8 MB and an SVG: they should be rejected with a warning. Check that files appear in `Data/worlds/<world-id>/zft-cinematics/narration/` and are visible on another player browser. V13/hosting permission is required to upload.
4. Select a previously uploaded image using the native Foundry File Picker. The image is referenced in place, never copied or included in Narrate cleanup.
5. Click an inline image, choose 25%/50%/75%/100% and left/center/right alignment, then Narrate. Check that both GM and player see the same positioning.
6. Open Managed Graphics. Check tracked count, size, and optional Keep flag. Eligible unreferenced files older than seven days are marked for **manual review only**. No deletion is attempted.

## Chat and backward compatibility

7. Leave Post to Chat unchecked (default). Narrate as GM and verify the overlay appears to GM and player with **no new public ChatMessage**. Close narration and confirm the overlay clears.
8. Check Post to Chat. Narrate again and verify one chat card, preserving the same formatted image and fonts. Reopen Narrate and ensure the check is remembered.
9. Call `game.modules.get('zft-cinematics').api.narration.narrate('Legacy API text')`; ensure the legacy public chat behavior remains unchanged. The `/narrate hello`, `/narrate-close` and toolbar controls should still work.
10. If player Narrate role is enabled, request screen-only narration. A private GM request chat message is still required for authorization and should not appear publicly.
11. Test timed dismissal, replacement before expiration, browser refresh/reconnect, Markdown paste, custom Foundry fonts, large text scrolling, and all four display types.

## Unchanged features / limitations

- Native scene Fade/Wipe, media/logo splash, Smooth Camera settings, and ZFT Tools integration are unchanged except version labels.
- Uploads are limited to the active world's asset folder; no writes occur under `Data/modules/`.
- Automatic deletion was **not implemented** because Foundry V13 has no documented module file-deletion API. Use server-side file management after reviewing candidates. Unknown/unused references outside Narrate are not scanned by the module.
- Client/module asset availability, uploads, and GM/player synchronization must be verified live.
