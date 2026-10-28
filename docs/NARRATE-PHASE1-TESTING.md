# ZFT Cinematics Narrate | 0.2.0-dev.1 (Phase 1)

## Status
Locally authored and syntax-tested; NOT live-tested in Foundry. Build uses a pinned `feature/narrate` source commit `47b5bdb9a0e41b8e85727e3ccff7af32fe827e1f` plus modified `scripts/narration.js`, `styles/narration.css` and synced version metadata. No remote branch has been changed.

## Scope
- Existing Narrate dialog supports Narration, Location Title, Announcement, Subtitle.
- Long text scrolls rather than being clipped.
- Title (optional) for Location Title / Announcement.
- GM chooses manual close or automatic dismissal (3–300 seconds).
- Shared state survives reload; already-expired narration stays hidden and is cleared when a GM is available.
- Existing slash commands, API `narrate('text')`, chat cards and GM/player permission checks remain.

## Test sequence (Foundry V13 Build 351)
1. Back up your test world's module and settings. Do NOT install an unverified build on production.
2. Extract generated `zft-cinematics-v0.2.0-dev.1.zip` into test Foundry Data/modules. Ensure `module.json` is at `modules/zft-cinematics/module.json`. Enable ZFT Tools and Cinematics; hard-refresh GM and player browser clients.
3. As GM, click ZFT Tools > Narrate. Select each presentation type. Verify GM and player overlays match. Check that the subtitle appears toward the bottom of the display.
4. Narrate a long paragraph and a very long unbroken string. Check text remains scrollable and is not clipped. Repeat with browser window narrowed.
5. Manually close a narration; check GM and player overlays disappear and there is a single chat card.
6. Set timed close to 5 seconds; verify both clients dismiss. Refresh the player while timer is active and after expiration. Confirm no expired overlay reappears.
7. Start a 5-second narration, then replace it after 2 seconds with manual narration. After 5+ seconds verify the older timer did NOT close the new narration.
8. Test `/narrate`, `/narration`, `/narrate Some text`, `/narrate-close`; verify old one-argument module API still works from console: `game.modules.get('zft-cinematics').api.narration.narrate('API check')`.
9. If Player role narration is enabled, submit a narration as player with an active GM and verify it displays once, respects selected type and duration, and cannot be closed by the player.
10. Activate another scene using existing Fade/Wipe controls while narration is active; verify the transition and persistent narration remain functional.
11. Test existing Smooth Camera and default transition splash settings for regression. These files are otherwise unchanged from source, apart from synchronized version identifiers.

## Console expectations
- `[ZFT] 🎙️ v0.2.0-dev.1 | Cinematics Narration ... Ready`
- `[ZFT] 🎙️ v0.2.0-dev.1 | Cinematics Narration ... Narration overlay and chat card shared`
- No `[ZFT] ❌` narration errors.

## Known verification gaps
- No live GM/player Foundry testing was available during generation.
- The older Narrate dialog uses Foundry V13 `Dialog`; V14 remains unverified.
- Unavailable/disconnected GM can delay clearing the shared world setting for an expired timer; all refreshed clients still hide already-expired content.
- Foundry file references and exact baseline of the source are pinned; if the repository branch has advanced, review before integrating this test build.

## Rollback
Restore the previous `zft-cinematics` module folder and refresh browsers.
