# ZFT Cinematics dev.9 + Narration Library dev.3: test procedure

**Scope:** Foundry V13 Build 351 development world first. Neither ZIP is a stable release. DO NOT use production for first tests. No changes to GitHub.

## Installation / backups

1. Stop Foundry and back up **the complete** `Data/modules/zft-narration-library/` folder, including `packs/narrations/` (LevelDB) and `assets/graphics/`. Also back up older `Data/assets/zft-narration-library/graphics/` and `Data/worlds/<world-id>/zft-cinematics/narration/` if planning to migrate content.
2. Manually **overlay**, not delete/reinstall, Narration Library `v0.1.0-dev.3` onto `Data/modules/zft-narration-library/`. Its `module.json` must have `flags.canUpload: true`; folder `assets/graphics/` must exist. **Never erase existing compendium DB files.**
3. Overlay Cinematics `v0.2.0-dev.9` onto `Data/modules/zft-cinematics/`.
4. Start Foundry ONCE and enable both modules in the development world. Under Compendiums, confirm `ZFT Narrations`; as GM unlock it before saves/uploads. Cinematics recommends (does not require) the library.

## Test cases

1. **Upload:** In Narrate paste an image or click Upload. Save a passage. Inspect the image's `src` in HTML Source: `modules/zft-narration-library/assets/graphics/narrate-...png`. No new `worlds/<world-id>/zft-cinematics/narration/` files should appear.
2. **Shared worlds:** With both modules enabled in a second world sharing the same Foundry User Data directory, load the saved narration and confirm its image renders. Check Graphics Library shows the file and Keep status. Separate installations still require copying/synchronizing the *whole library module folder* with Foundry stopped.
3. **Protect references:** Save a passage containing an image. Its thumbnail status must show `Saved narration` and a reference count of 1. Save another passage that uses it; count becomes 2. An image referenced by any saved passage is never marked cleanup eligible, even if old.
4. **Keep & age:** Upload an unreferenced graphic; click Keep in Graphics Library, save choices, reopen and verify. Unkeep and confirm it becomes a candidate only after seven days since last use, not immediately. Unknown-age untracked graphics are never silently eligible.
5. **Maintenance:** Select a genuinely eligible file and click Review Selected Cleanup. Confirm the preview shows file paths and DOES NOT delete anything. Images referenced by saved passage, Keep, live display, chats or current draft cannot be selected for review.
6. **Migration:** With an existing saved narration referencing `worlds/<world-id>/zft-cinematics/narration/<file>` or the previous `assets/zft-narration-library/graphics/<file>`, click **Migrate Legacy Graphics** and confirm. Verify compendium references now point to `modules/zft-narration-library/assets/graphics/`. Verify the old files still exist. On failure, consult console log for errors and confirm the originals and affected saved pages remain intact.
7. **Save old draft:** Load an older draft with world-specific uploaded images, Save to Library, then reload and confirm its graphic now points to the portable path.
8. **Missing path:** Temporarily use a deliberately invalid *module-library* image path in a throwaway saved entry; Graphics Library must report it under Missing Images. Remove this test entry after checking.
9. **Regression:** Enter adds paragraph, Shift+Enter inserts break, HTML Source Enter adds newline, Narrate button sends, Send-to-chat defaults off, images resize/align/remove from draft, player overlay sync, native scene transitions and Smooth Camera remain operational.
10. **Locked pack:** Relock compendium; loading/reusing remains possible but new uploads and metadata edits must warn rather than silently create untracked assets.

## Caveats

- Foundry V13's browser client does not expose a supported arbitrary-file deletion API. Cleanup is advisory/manual; never claim files were deleted.
- This build does not migrate or pack arbitrary graphics from unrelated Foundry File Picker locations. If saved narration uses external file paths, those remain external unless separately imported.
- Because this is a mutable module containing LevelDB files, do not use a destructive Foundry package update or reinstall; preserve the entire directory. Lock against ordinary updates.
- Do not copy live LevelDB compendium data between servers. Stop the relevant process(es), back up, then copy the whole library module folder.
- V13 functionality above must still be tested in the actual Foundry environment; V14 remains unverified.
