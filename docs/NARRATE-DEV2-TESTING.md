# ZFT Cinematics | Narrate v0.2.0-dev.2 Test Plan

## Scope
- Dialog width up to 960px, resizable; emerald/dark styling; large editing area; footer controls always visible.
- Rich formatting: font family, size, bold, italic, underline, align left/center/right, clear formatting.
- Formatting preserved in shared overlay and narration chat card.
- Existing Phase 1 styles, manual/timed dismissal, slash commands and one-argument API continue working.
- No changes to scene transition logic or Smooth Camera logic beyond version-string synchronization.

## GM-side test (Foundry V13 Build 351)
1. Open **ZFT Tools → Narrate**; confirm editor is wider, draggable and resizable, with **Narrate** and **Cancel** visible at the bottom. Resize smaller and larger; long text must scroll inside the editor, not hide the footer.
2. Enter 3 paragraphs. Select phrases and apply **Bold**, **Italic**, **Underline**, **Georgia**, **Courier New**, **Large** and **Extra large**. Align paragraphs left, center and right. Confirm changes are visible in the editor.
3. Copy styled HTML from another page and paste it. Only the text should appear; no original HTML formatting or images should carry over.
4. Change Presentation Type among Narration, Location Title, Announcement, and Subtitle. Confirm optional Title appears only for Location Title/Announcement.
5. Choose Timed Dismissal for 5 seconds and verify the duration field appears. Choose Manual again and verify it disappears.
6. Click **Narrate**, verify the selected fonts/sizes/bold/italic/underline/alignment appear on BOTH GM and player overlay. Check chat card retains safe formatting. Only one narration card should be created.
7. While a very long formatted passage is displayed, verify the player overlay can scroll and nothing is clipped.
8. Manually close, then test a timed narration. Refresh one browser during an active timer, and after expiry. The narration should not resurrect.
9. Replace a timed narration with a manual one before expiry. The older timer must not close the replacement.

## Regression tests
10. As GM test `/narrate sample`, `/narration`, `/narrate-close`, and legacy `game.modules.get('zft-cinematics').api.narration.narrate('API test')`. Literal `<b>` typed through plain text command/API must display literally, not execute as HTML.
11. If player narration role is enabled, narrate from the player client; it should share through the active GM, keep supported formatting, and remain GM-dismissed.
12. Activate an inactive scene with Fade and Wipe; inspect transition overlays. Exercise Smooth Camera wheel zoom and right-drag, ensuring no regression.
13. In the browser console check for `[ZFT] ❌` and document error/reproduction steps if found.

## Locally verified (not a substitute for Foundry tests)
- HTML sanitizer retained supported font/size/bold/alignment and removed script, image, event attributes and arbitrary inline styles.
- Chromium Rich Text toolbar formatting and shared output worked.
- GM/player flag forwarding was re-validated through a simulated active GM.
- The Narrate dialog footer remained within window bounds at 1440×900 in the Chromium mock.
- Baseline Scene Transition/Smooth Camera files unchanged beyond version strings.

## Rollback
Restore the previous accepted version, refresh all browsers and restart Foundry if the manifest remains cached.
