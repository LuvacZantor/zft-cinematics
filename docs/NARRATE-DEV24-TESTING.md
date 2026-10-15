# ZFT Cinematics v0.2.0-dev.24 — Foundry V13 live test

Target: Foundry VTT V13 Build 351. V14 not verified.

## Install efficiently

1. Back up the working `Data/modules/zft-cinematics/` directory. The separate ZFT Narration Library module contains mutable saved content; **do not delete or overwrite its packs/assets**.
2. Copy/extract `zft-cinematics-v0.2.0-dev.24.zip` over the existing Cinematics folder, preserving the `zft-cinematics/` folder structure.
3. Hard-refresh both GM and player browsers with **Ctrl+F5**. No Foundry server restart is normally needed for this Narrate JavaScript/CSS change. If client resources or module metadata are stale, troubleshoot caching before concluding there's a code regression.
4. Use a passage sufficiently long that the narration card has a vertical scrollbar. Use one GM client and at least one separate player client.

## Expected behavior and Pass / Fail / Not Tested checklist

1. **One mode**: Narrate editor no longer shows Independent / Follow GM selection. An old saved passage continues loading correctly.
2. **Automatic startup**: Publish a long narration. GM and following player begin at the top; GM auto-scroll starts after approximately 1.8 seconds, and the player follows.
3. **Grouped GM controls**: GM sees Start/Pause/Resume, Restart, +/- speed, speed slider and numeric speed, plus a Position slider in a **single** control group outside the card. Controls do not alter the player's card.
4. **Live speed**: While running, change from 10 to 90 px/sec. The GM and player speed up without losing progress; lower it again and verify both slow down.
5. **GM Pause/Resume**: Pausing freezes following players; resuming continues from the same position.
6. **GM position**: Move the Position slider to around 35%. Scrolling pauses and following players jump to the corresponding *relative* location; Resume continues. Different player viewport sizes may wrap text differently.
7. **GM Restart**: Restart returns GM and following players to the top and restarts automatic movement.
8. **Player independence**: Use the player's mouse wheel, scrollbar, or Pause Follow to take control. GM changes should no longer move that player until Follow GM is clicked again.
9. **Preview**: GM Preview uses the same controls locally but does **not** show the preview to players or change the published narration.
10. **Audio regression**: Looped soundtrack continues working. Pause/Resume preserves playback time; Stop/Play starts from the beginning. Player mute/volume remain local.
11. **Content regression**: Text colors, highlights, backgrounds, transitions, saved graphics and audio, Save/Load, and Back to Editor remain functional.
12. **Short content**: Narrations that fit within the card do not show unnecessary scrolling controls.

## Notes

- GM scrolling is authoritative only for players who are currently following; a player can override it locally and rejoin at any time.
- Reduced-motion browser preference can prevent automatic scrolling until the GM starts it manually.
- Audio is separate from scrolling. Pausing scroll does not pause audio.
- Timed narration dismissal is independent of reading progress. Use manual dismissal for longer passages.
- The old Independent-mode value is normalized at runtime; the module does **not** bulk-rewrite saved passages or their companion compendium.
- If issues arise, report the failing test number, GM or player client, behavior and F12 Console errors. Do not rebuild or push until explicitly authorized.
