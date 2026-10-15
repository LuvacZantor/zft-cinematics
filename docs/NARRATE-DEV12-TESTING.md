# ZFT Cinematics v0.2.0-dev.12: Foundry V13 live test checklist

Local development ZIP, not a release. GitHub is unchanged. Keep ZFT Narration Library v0.1.0-dev.3 enabled.

## GM Preview and Publish

1. Open Narrate. Prepare a rich-text passage with multiple paragraphs, inline formatting, and an image. Select a timed dismissal and optionally enable Post to Chat.
2. Click **Preview (GM Only)**. Confirm the editor window hides and the actual overlay styling appears with a clear **GM Preview** indicator. Check another player client: **nothing** should appear there and **no** chat card should be created. Wait longer than the selected timed dismissal: the preview must not expire.
3. Click **Back to Editor**. Confirm the complete draft, formatting and graphics remain editable. Change the text and click Preview again; the updated version should render.
4. From Preview click **Save to Library**. Verify Save As comes to the front with the folder tree and can save or update a passage; after closing it, Preview returns. Cancel Save As and confirm Preview still returns.
5. Click **Publish** from Preview. Verify the GM preview disappears, all player clients see the narration, and only the selected chat option creates a chat card. For timed dismissal, verify it closes on schedule.
6. Publish a second passage **directly from the editor** without preview. It must work without any mandatory extra step. Enter or Shift+Enter in the editor must *never* publish.
7. While a GM-published narration is on screen, click **Save to Library** beside **Close Narration**. Confirm Save As opens in front, preserves the formatted content, and returns to the published overlay on Cancel or Save. Saving must not post the narration again.
8. Click **Close Narration**. Verify it closes for GM and players and no stale preview/editor window remains.
9. Repeat preview using an image-only draft and a previously saved passage. Verify preview with rich HTML and graphics is identical to the published overlay styling.

## Graphics safety

1. Open Graphics Library. Protected and not-yet-eligible graphics display a **red prohibition icon** beside a disabled cleanup checkbox, with the original hover reason.
2. Eligible graphics remain selectable; Review Selected Cleanup lists paths only. No files are automatically deleted.
3. Verify upload, Keep, retention, and the seven-day protection reference count are unchanged.

## Regression boundary

- Scene transitions, splash media, Smooth Camera, and world/player narration API must remain functional.
- Browser-level tests for Preview/Back/Publish/Save, graphics, folders, and legacy v0.2.0-dev.9 behaviors passed. Live Foundry V13 Build 351 testing remains necessary; V14 has not been verified.
