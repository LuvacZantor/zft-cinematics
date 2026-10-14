# ZFT Cinematics Narrate dev.8: library integration (V13 test)

- Requires separate **ZFT Narration Library v0.1.0-dev.1** installed and enabled in each participating world (optional dependency; Cinematics works without it).
- New Narrate Save and Load controls use `zft-narration-library.narrations` directly. Nothing is automatically posted to players.
- Save New creates a JournalEntry in the compendium; loading and saving again updates the original. The GM must unlock the compendium before saving. No world copies.
- Saved entries include HTML, presentation/dismissal preferences, default font/size/alignment, and chat checkbox. Text is sanitized on save and load.
- New pasted/uploaded image files go to `Data/assets/zft-narration-library/graphics/` if the library is enabled; otherwise continue writing to the original world directory. The Graphics Library lists images in this shared folder even when uploaded from another world.
- Existing world-based graphics and tracked metadata remain untouched; they have **not** been migrated and will not be portable to other worlds until deliberately copied/relinked.
- No delete, bulk wipe, export, or migration command in this build; add after V13 save/load validation. Other Cinematics functionality unchanged.

## Test steps
1. Shut down Foundry. Install both ZIPs in `Data/modules/` with no extra nested folder; restart once and enable both modules in a test world.
2. Confirm the **ZFT Narrations** Journal compendium exists. If it does not, stop and report Foundry console errors. (Empty module compendium bootstrapping still needs a live test.)
3. As GM, unlock the compendium in its context menu. Open **Narrate** and enter formatted text. Click **Save**, give it a name. Confirm a JournalEntry appears in the compendium and can be reopened.
4. Reopen Narrate, click **Load**, select the saved name. Confirm the full formatting and type/duration returned without broadcasting. Edit then Save to update the original entry, not create another.
5. Paste or upload a graphic. Confirm its path begins `assets/zft-narration-library/graphics/`, then open a second world **sharing the same Foundry User Data directory**, enable both modules and confirm the entry loads and graphic resolves. For separate installations, compendium and asset data must be synchronized explicitly.
6. Test Enter, Shift+Enter, chat checkbox, image resize/alignment, and ordinary scene transitions.
7. Lock the compendium when finished editing. **Do not update/reinstall the content module after writing entries without backing up its `packs/` directory**.

This is local/static testing only, not live Foundry V13 verification. No GitHub changes.
