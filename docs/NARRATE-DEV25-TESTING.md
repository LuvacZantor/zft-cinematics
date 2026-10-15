# ZFT Cinematics v0.2.0-dev.25 — Foundry V13 live test

Target: **Foundry VTT V13 Build 351**; V14 has not been verified.

## Fast install

1. Keep a copy of the working dev.24 module folder. Preserve all ZFT Narration Library `v0.1.0-dev.3` data and assets.
2. Replace only Cinematics files with `zft-cinematics-v0.2.0-dev.25.zip`.
3. **Ctrl+F5** on both GM and player browsers to load updated JS. No server restart by default.
4. Use a long narration with a looping soundtrack, a GM client, and a separate player client.

## Pass / Fail / Not Tested checklist

1. **No auto start:** Publish long content; wait 3+ seconds. GM/player remain at top, neither starts scrolling.
2. **Manual Start:** GM selects Start Scroll; both GM and following player progress automatically.
3. **Scroll controls:** GM can Pause/Resume, adjust live speed, and move Position slider; following player tracks changes without resetting unexpectedly.
4. **Player override:** Player interrupts GM scrolling locally, then presses Follow GM to rejoin.
5. **Restart:** GM Restart returns GM/following player to the top and begins scrolling (even from paused).
6. **Back to Editor:** With long narration scrolling and looped audio playing, GM clicks Back to Editor on published view. Player overlay closes; GM/player music stops immediately, and scrolling stops. GM editor opens with the same text/appearance/audio settings.
7. **Republish:** GM publishes edited version; it opens afresh at top, not auto-scrolling, with its soundtrack using the selected start/loop settings.
8. **Preview:** GM Preview remains GM-only and stationary until GM Start; Back to Editor during Preview does not publish or close a separate live narration.
9. **Normal Close:** Close Narration still dismisses the player overlay and honors normal audio fade-out (when configured).
10. **Other regressions:** Audio Pause/Resume preserves timestamp, volume and mute still work, Save/Load restores passage settings, fades and textures remain correct.

## Notes

- Back to Editor immediately stops *published* audio through the shared world state; the player receives that state via Foundry's usual settings synchronization. A delayed/disconnected client cannot be guaranteed instantaneous receipt.
- Narration's visual exit transition may take its configured fade duration, but the overlay is deactivated immediately.
- When diagnosing a client failure, confirm both browsers were hard-refreshed.
- These procedures are **live tests to perform**, not a claim that the build has already passed Foundry V13.

## Live acceptance result (2026-10-15)

The owner tested **ZFT Cinematics v0.2.0-dev.25** on Foundry V13 and reported **9 PASS, 0 FAIL, 0 NOT TESTED**. Confirmed:

1. No automatic GM/player scrolling after publishing.
2. GM Start Scroll advances both GM and player clients.
3. GM Pause/Resume, speed adjustments, and Restart continue to work.
4. Players can interrupt and rejoin Follow GM.
5. With looping audio, published Back to Editor closes the player's narration and stops soundtrack playback on both clients.
6. Editor retains the original text, appearance, soundtrack, and scrolling settings.
7. Republishing starts at the top and waits for explicit GM Start.
8. GM-only Preview and its Back to Editor do not broadcast narration.
9. Normal Close Narration, audio Pause/Resume, fade effects, textures, and Save/Load continue working.

No failures were reported. These live results cover the listed V13 scenarios only. **V14 remains unverified.** Do not interpret acceptance as authorization to modify `main`, publish a GitHub Release, or update the separate narration-library repository.
