# ZFT Cinematics 0.2.0-dev.10 | Foundry V13 Build 351 tests

ZFT Narration Library **0.1.0-dev.3** remains unchanged. This build updates Cinematics only. Keep a backup of `Data/modules/zft-narration-library/`, especially `packs/narrations/` and `assets/graphics/`. Never delete the library while updating Cinematics.

## Install
1. Stop Foundry to replace module files safely. Back up the `zft-cinematics` directory.
2. Extract the new ZIP so `Data/modules/zft-cinematics/module.json` reports `0.2.0-dev.10`. **No Library reinstall is required.**
3. Start Foundry, enable both modules, join as GM.

## Smoke tests
1. In a world that has **never initialized** the new lock setting, start as GM and verify the library becomes unlocked after `ready`. Verify the Lock / Unlock button in Narrate shows **Unlocked**. On previously used worlds, the first dev.10 load is also treated as first initialization.
2. Click **Locked** (the button should then show Locked); close and reopen Narrate and refresh the world. It must remain locked. Loading saved entries must work; saving and uploading while locked must warn. Click **Locked** to unlock manually and confirm saving works.
3. Save a passage: name field has visible white text and a focused caret. The Save dialog is compact; text is not black-on-black. Click + Folder, create a campaign folder. Use that folder, then save.
4. Load Saved: see the folder tree, choose a folder to filter. Search for a passage in a **different** folder: search must find it globally. Clear search: folder filter returns. Sort A–Z, Z–A, Recently Updated, Oldest First; choose Manual to use Foundry's entry sort order.
5. From Load Saved, create a subfolder, rename it, and Move an existing passage there. Reload the dialog to verify folder assignment persists and no duplicate passage was created.
6. Load a passage, edit it, save it again, and verify the **current folder is preserved** unless changed explicitly. Verify content, typography, embedded images and dismissal settings round-trip.
7. Repeat visibility in another world sharing the same User Data directory. Folder structure should carry across worlds with the library compendium. Lock state may be configured per world.
8. Regression: Paste/upload images inside module folder, Keep and reference protection, image alignment, legacy migration (copies originals), overlay synchronization, Narrate-only Enter behavior, scene transitions, and Smooth Camera.

## Constraints
- Folders are native Foundry compendium `Folder` documents; create/rename/move require GM access and an unlocked pack. No folder deletion is offered.
- Compendium and graphics remain backed up/deployed together as `Data/modules/zft-narration-library/`. Ordinary module updates must not replace those mutable data files.
- Library cleanup still produces a **manual review list**, with no server-side deletion.
- Tested by local browser simulation, JSON and JavaScript syntax only. **Live Foundry V13 and separate V14 tests remain necessary**.
- GitHub branches, releases and tags were not touched.
