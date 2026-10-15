# ZFT Cinematics Narrate | v0.2.0-dev.22 | Foundry V13 test checklist

Development-only corrective build based on dev.21. **Validated baseline before dev.21:** dev.20, accepted 9/9 in live Foundry V13 Build 351. The dev.21 player scrolling and audio Pause/Resume issues require confirmation on real Foundry V13 clients. **V14 is not verified.**

## Installation and setup

1. Back up the last accepted ZFT Cinematics folder, and the **entire** `Data/modules/zft-narration-library/` folder including the compendium `packs/` and `assets/graphics/` and `assets/audio/` contents. Keep `zft-narration-library v0.1.0-dev.3` installed. It is **mutable data**, not a disposable module installation.
2. Install only the Cinematics dev.22 ZIP into `Data/modules/zft-cinematics/`. Do not delete or overwrite the Narration Library module.
3. Restart Foundry V13 Build 351. **Ctrl+F5 in both the GM and player browser**, otherwise stale player JavaScript can masquerade as a bug.
4. With two browsers logged in as GM and player, use a long passage that overflows the narration card. Select **Follow GM**, manual close, and attach a short looping soundtrack.
5. Complete Pass / Fail / Not Tested for each case, with notes and F12 Console errors on failures.

## Targeted tests

| # | Action | Expected behavior |
|---|---|---|
| 1 | In Follow GM mode, publish and manually scroll as GM | Player follows GM at corresponding progress; neither starts auto-scrolling by itself |
| 2 | Press GM Resume Scroll; while moving, change speed via the slider, +/− and number field | Speed adjusts immediately, without jumping backward or starting over; the player keeps following |
| 3 | While moving, trigger a rerender by returning to the published view, if practical | The chosen live speed remains in effect for the same narration; neither scroll jumps to the beginning |
| 4 | On player, use mouse wheel or drag the scroll bar | Player takes manual control; GM movement does not pull the player back |
| 5 | Player clicks Follow GM | Player catches up to the current GM position and follows subsequent GM movement |
| 6 | GM presses Pause Scroll and Resume Scroll after rejoin | Following players stop and resume following while respecting manual overrides |
| 7 | With a looping soundtrack already playing, let it advance, then GM clicks Pause Audio | GM and player sound stops at the current position (not at zero) |
| 8 | GM clicks Play Audio again after Pause | Sound continues from the paused timestamp, not from the beginning, on both clients |
| 9 | GM clicks Stop Audio, then Play Audio | Playback restarts from the beginning; player and GM both receive the reset |
| 10 | Test GM audio volume and player mute/local volume | Master volume updates the listeners; local player mute remains independent |
| 11 | Publish with manual soundtrack start and then close/reopen or replace narration | No sound until GM Play; correct audio fade-out and no lingering track after closure/replacement |
| 12 | Save and load a narration with soundtrack, custom scroll speed, styling and graphics | Values restore, and published player appearance, fades, Preview and Back to Editor still work |

## Important expected distinctions

- **Pause Audio → Play Audio:** resume the *same position*; **Stop Audio → Play Audio:** restart at zero.
- **Player Pause Follow / user scroll:** disables following for only that player, until they press **Follow GM** again.
- The GM scroll-speed control changes the **current client playback**, and following player movement is driven through socket progress updates. It does not republish the narration.
- The player-side Pause/Resume/Follow GM button location remains the same as dev.20/21.
- Browser media policies can block auto playback until an interaction; that is separate from the audio-resume regression.
- Report exact GM/player browser actions and F12 Console output for any failure. Test-browser simulations are not live V13 acceptance tests.

No remote GitHub changes are part of this test ZIP; repository `develop` remains on the last explicitly accepted version until a separate push approval is given.
