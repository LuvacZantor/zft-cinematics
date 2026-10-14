# ZFT Cinematics v0.2.0-dev.19 — Live Foundry V13 checklist

The original dev.18 ZIP has been superseded. This build keeps its new **Back to Editor**, coloring, highlighting, and appearance/texture features, but **restores the dev.17 GM scroll handler/controller and fade/transition code**. The changes in the original dev.18 package to scroll synchronization and animation playback were based on browser cache issues, not a verified underlying bug.

## Install

1. Back up `Data/modules/zft-cinematics` and the complete `Data/modules/zft-narration-library` folder (`packs/` and `assets/graphics/`) before any upgrade.
2. Replace **only** the `zft-cinematics` module folder with this package. Keep `zft-narration-library v0.1.0-dev.3` and its compendium data untouched.
3. Restart Foundry if required, then **Ctrl+F5 on both GM and player browsers**, including second-browser/incognito player sessions. Confirm both clients loaded v0.2.0-dev.19.
4. Use a long, manually dismissed passage to test Follow GM; avoid timed dismissal while testing scrolling.

## Report

For each item, mark PASS / FAIL / NOT TESTED; if FAIL, include which client failed and the browser F12 Console error if available.

| ID | Test | Expected | Result |
| --- | --- | --- | --- |
| 01 | Follow GM: publish long passage | No automatic scrolling; both start at top | PASS / FAIL / NOT TESTED |
| 02 | GM manually scrolls | Player follows; may take independent control and rejoin | PASS / FAIL / NOT TESTED |
| 03 | GM Resume/Pause auto-scroll | Player follows GM; individual overrides remain independent | PASS / FAIL / NOT TESTED |
| 04 | Fade In and Dissolve in player browser | Same working transition behavior as dev.17 | PASS / FAIL / NOT TESTED |
| 05 | Fade In/Out; GM closes | Same working transition behavior as dev.17 | PASS / FAIL / NOT TESTED |
| 06 | Publish → Back to Editor | Original narration remains visible to player | PASS / FAIL / NOT TESTED |
| 07 | Return to Published / Republish | Return keeps live narration; republish updates it | PASS / FAIL / NOT TESTED |
| 08 | Font color / highlight | GM Preview and player display both show formatting | PASS / FAIL / NOT TESTED |
| 09 | Card and full-screen backdrop colors | Match Preview and Publish | PASS / FAIL / NOT TESTED |
| 10 | Upload/select texture, Tile/Cover/Contain and darkness/tint | Text stays legible and texture is visible to players | PASS / FAIL / NOT TESTED |
| 11 | Save and Load narration | Background and formatted text restored; references protected | PASS / FAIL / NOT TESTED |
| 12 | Delete a disposable saved passage | Entry removed; asset files not auto-deleted | PASS / FAIL / NOT TESTED |
| 13 | Preview, Subtitle, image, long text | Old behavior and GM toolbar placement unchanged | PASS / FAIL / NOT TESTED |

The Star Wars-style cinematic crawl is not included; it remains on the roadmap. No GitHub changes were made.
