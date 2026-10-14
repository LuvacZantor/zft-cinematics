# ZFT Cinematics v0.2.0-dev.11 — Live Foundry V13 test checklist

This is a LOCAL development test build. No GitHub changes are included.

1. Back up the current module and the separate `zft-narration-library` folder. Stop Foundry, install this ZIP over `zft-cinematics`, and restart. The library module remains unchanged at dev.3.
2. Open Narrate as GM. Verify small **Load**, **Save**, and **Locked / Unlocked** controls appear beside **Storytelling Editor**, with no extra Saved Narration toolbar. Verify the editor area has more vertical space.
3. **Load**: confirm folder tree, global search and sorts work. With only one saved passage, verify it occupies a *single compact row*, displays its name properly, and Move is a small icon-only button. Click to load: nothing is broadcast.
4. **Save**: confirm it opens the same folder browser. Select a folder, create a nested folder, rename it, pick the destination and name a new narration. Save and verify the content, formatting, settings and folder survive reopening.
5. In Save As, select an existing passage and click **Update Narration**. Cancel the overwrite prompt: existing document must be unchanged and the dialog remain open. Confirm overwrite: the existing ID should be updated (no duplicate).
6. Select a different folder or edit the passage name: the selection must clear and **Save New Narration** must be offered. A same-name collision in a folder must refuse to create a duplicate until the user selects the entry or changes its name.
7. Save to **Unfiled**; verify **All Narrations** is view-only as a destination. Search must remain global.
8. Open **Graphics Library**. Every card should show a **Select for cleanup** control and its protection reason. On protected/new graphics the checkbox should be disabled. With no eligible images selected, **Review Selected Cleanup (0)** must be disabled. Eligible selections should enable it and update count. Review generates a manual path list; nothing on disk is deleted.
9. Confirm no **Migrate Legacy Graphics** button. Existing world images referenced in a newly saved narration should still be copied to the portable library.
10. Verify Enter and Shift+Enter in editor, HTML Source mode, image upload/Keep, player broadcast, and other Cinematics tools behave as before.

V13 browser-level simulation and static syntax checks are not a substitute for live Foundry testing. V14 remains unverified.
