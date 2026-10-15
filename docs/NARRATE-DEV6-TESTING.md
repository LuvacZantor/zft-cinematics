# Narrate dev.6 | V13 test checklist

## Changed

- Graphics Library: thumbnail gallery of tracked uploaded images, filename search, insert-without-reupload, Keep checkbox, last-used / seven-day review state.
- Editor keyboard: Enter = new paragraph; Shift+Enter = soft line break; HTML Source Enter = newline. Clicking Narrate is the only submission action.

## GM test

1. Open **ZFT Tools > Narrate**, click into the editor, type a line, press Enter, and type a second line. Confirm the dialog stays open and a second paragraph appears.
2. Type another line using Shift+Enter. Confirm the line breaks within the same paragraph.
3. Switch to HTML Source and press Enter. Confirm a newline is inserted, not a narration broadcast.
4. Paste or upload a small PNG. Reopen Narrate and choose **Graphics Library**. Verify the thumbnail appears.
5. Search for part of the filename, click **Insert**, and confirm the same image appears at the cursor. No new upload is made.
6. Use 50% size and left/right/center alignment; confirm the player overlay reflects the formatting.
7. Return to the library, toggle **Keep** and select Save Keep Choices. Reopen and confirm it persists.
8. Open a library with older unkept tracked images. They should be labelled for review after seven days of non-use; **nothing is automatically deleted**.
9. Click **Narrate** explicitly and check player clients receive the overlay. Repeat with **Post narration to chat** both off and on.
10. Test basic scene Fade/Wipe, splash media, and Smooth Camera to detect regressions.

## Boundaries

- Only Narrate-managed uploads appear in this gallery. Other Foundry assets are available through the separate File Picker.
- Library entries refer to existing files; missing files can show unavailable thumbnails.
- Seven-day review is an advisory status, not an automated deletion.
- Foundry V13 Build 351 targeted, V14 unverified.
- Source changes are local only; no GitHub branch changes.
