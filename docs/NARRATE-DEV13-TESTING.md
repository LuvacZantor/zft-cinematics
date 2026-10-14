# Narrate dev.13 - Preview click fix

## Defect

The dev.12 QA invoked `Dialog.buttons.preview.callback` directly instead of the
actual Foundry V13 dialog button. A legacy Dialog may close on submit, invoking
the `close` hook which removes the preview immediately. This is consistent with
reports that Preview does not render, but requires confirmation in live Foundry.

## Fix

- Preview is now a real `type="button"` attached to the existing Dialog footer
  when available, or shown below the composition as a fallback.
- Clicking Preview does not enter the legacy Dialog submission lifecycle.
- GM-only local preview overlay remains independent of `narrationState`, chat,
  expiry timers, and player sockets.
- Back returns to the intact rich editor; Publish is unchanged.

## Foundry V13 live test

1. Open Narrate, enter formatted text and a library image.
2. Click Preview (GM Only). Verify the editor is hidden, a preview appears,
   and no player sees anything.
3. Click Back to Editor, change formatting, and Preview again.
4. From Preview, use Save to Library and verify the preview returns afterward.
5. Publish and confirm the player receives the narration exactly once.
6. Close and retest direct Publish without preview.
7. Verify the GM-only Preview control is absent on a non-GM client.

This remains a local test build; do not treat browser tests as live V13 verification.
