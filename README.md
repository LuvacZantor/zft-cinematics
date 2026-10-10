# ZFT Cinematics

GM-controlled cinematic scene transitions for Foundry VTT, with toolbar integration through ZFT Tools.

## Development build: v0.1.0-dev.16

Target: Foundry VTT V13 Build 351 (live validation pending). V14 not yet verified.

### Changes in Dev 9

- Adopts ZFT Arcane Emerald (`#28E887`) accents in Cinematics UI.
- A queued one-shot effect now shows emerald highlighted selection on the ZFT toolbar until it is consumed or canceled.
- All previous Dev 8 transition behavior is preserved.

### Features carried forward from Dev 8

- Fixes normal Foundry **Activate** scene changes using a native `Scene.activate()` wrapper via the existing libWrapper module. This replaces the unreliable `preUpdateScene` interception.
- The saved automatic Fade is still enabled by default; scene activation fades the outgoing scene to black, activates the destination, and reveals the destination (with synchronized player overlays).
- ZFT Tools' right-hand column now has six Cinematics actions: **Settings** and quick **Fade**, **Wipe Left**, **Wipe Right**, **Wipe Up**, **Wipe Down**.
- Click a quick effect, then activate any scene through normal Foundry controls to apply it *once*. The saved default stays untouched. Click the same quick effect again to cancel the choice.
- Settings still holds the permanent defaults, automatic toggle, duration and splash media browser.
- Keeps the two-phase wipes, scene activation integration, and cleanup watchdog. The redundant ZFT scene right-click action is removed in Dev 16.

### Test steps (V13)

1. Enable **ZFT Tools v0.1.0-dev.7**, **ZFT Cinematics v0.1.0-dev.16**, and **libWrapper**. Hard-refresh your browser (Ctrl+Shift+R). Restart Foundry only if the module changes are not recognized.
2. Open Settings from the right Cinematics column, enable Automatic Transitions and save **Fade**. Activate a different scene with Foundry's own **Activate** action (not just privately View). The map should fade out to black and reveal the new scene, without a Cinematics prompt.
3. Click **Wipe Left** on the right toolbar, then activate the next scene normally. Both halves should wipe. Activate another scene: the saved Fade must return.
4. Right-click an inactive scene: the extra **ZFT Cinematics: Transition Here** option must be absent; Foundry native **Activate** must remain. Test another one-time effect using native Activate.
5. Save a different default and reload; verify persistence. Repeat with a player client if possible.
6. Turn Automatic Transitions off; native Activate should proceed without cinematic effects, but a queued one-shot effect must still run on the next native Activate.

**Diagnostic log:** At scene activation, look for `[ZFT] 🎬 v0.1.0-dev.16 🎯 | Native scene activation captured`. If that message is absent, ensure libWrapper is enabled and that your action actually **activates** a scene rather than only privately viewing it.

### Technical notes

- No hard dependency on libWrapper was added. Native auto-activation integration requires it to be installed and enabled; without libWrapper, native activation proceeds without a cinematic effect. The module API remains accessible for programmatic use.
- This is a test build. Foundry V13 live validation is still required; V14 is unverified.
- No GitHub writes or release promotions occur without separate approval.

### Compatibility and dependencies

- Foundry VTT V13 target; V14 pending testing.
- Requires `zft-tools` v0.1.0-dev.7 for the GM canvas control. Automatically triggered native transitions additionally require an active libWrapper.
- No automatic GitHub promotion; test builds are local until authorized.


## Dev 11 | Narration is part of Cinematics

Narration is now built into ZFT Cinematics. Disable **zft-narrate-only** before testing
this build to avoid two slash-command listeners, duplicate overlays, or duplicate
Narrate buttons. No settings or state migration is performed. Cinematics starts with
its own new narration settings and state. Old standalone narration cards are not
restyled or converted; the standalone module can be uninstalled after testing.

- **ZFT Tools → Narrate** (gold book icon, GM only) opens the narration editor.
- `/narrate` or `/narration` opens the editor; `/narrate <text>` and
  `/narration <text>` post a narration card and show an overlay to all clients.
- `/narrate-close` or `/narration-close` closes the persistent overlay (GM only).
- GM **Close Narration** button is available on the overlay.
- Foundry settings under Cinematics: **Narration: Minimum Role** (GM by default),
  and **Narration: Chat Speaker** (default Narrator).
- Non-GM slash-command narration, when permitted by role, is relayed through a Foundry-authenticated chat message to one active GM; no additional module dependency is required.
- The Cinematics API now exposes
  `game.modules.get('zft-cinematics').api.narration` with `openDialog()`,
  `narrate(message)`, and `close()`.
- Narration is stored in the `zft-cinematics.narrationState` world setting, so
  active narration survives browser refreshes.
- The existing scene-transition overlay sits above narration. When a scene is
  revealed, any still-active narration appears again without being cleared.

### Test in Foundry V13

1. Disable `zft-narrate-only` in Manage Modules. Enable ZFT Cinematics Dev 11.
2. Hard-refresh (Ctrl+Shift+R); re-enter the world if module selection was changed.
3. As GM: click ZFT Tools → Narrate, submit text, and verify the styled chat card
   and overlay appear on both GM and player clients.
4. Hard-refresh a player browser; narration should remain visible.
5. Close narration via the GM overlay or `/narrate-close`; both clients should clear.
6. Verify `/narrate <text>` and `/narration` entry points.
7. While narration is displayed, switch scenes through the existing Cinematics
   transition flow. The narration should remain active and return on reveal.
8. Switch between ZFT Tools and Token Controls; no console errors.

Live confirmation of native automatic Scene.activate transitions is still outstanding.


## Dev 12 | Corrected narration overlay visibility and publish ordering

- Applies the confirmed failure-path improvement from the supplied `zantors-narrate-only-v1.0.6-dev.1` corrected standalone source directly inside Cinematics.
- Saves the authoritative world narration state **before** writing a GM narration chat card; failed state saves no longer leave a misleading chat-only narration.
- Explicitly renders the initiating client's overlay following a successful settings update. Connected clients remain synchronized through the settings `onChange` callback.
- Logs the computed `display`, `visibility`, `opacity`, and `zIndex` for an active narration to distinguish stacking problems from shared-setting failures.
- Puts the narration overlay above normal Foundry interface layers (`z-index: 100000`), while Cinematics scene transitions remain above it (`z-index: 100010`).
- Preserves the existing GM-only close control, player-role narration request flow, slash commands, chat styling, persistence, scene-effect logic, and toolbar position.
- No dependency on the standalone Narrate Only module; **disable both** `zantors-narrate-only` and `zft-narrate-only` when testing this integrated version.

### Focused smoke test

1. With ZFT Tools Dev 7 and Cinematics Dev 12 enabled, disable both standalone Narrate Only variants and hard-refresh (Ctrl+Shift+R).
2. As GM, use ZFT Tools → Narrate. Expected: narration overlay covers the current scene and a chat card is posted. Console logs `Persistent narration overlay rendered` with visible computed styles.
3. Close narration using the overlay button, and repeat using `/narrate-close`.
4. Test `/narrate A dragon approaches` and refresh the browser while the overlay is active. Overlay should persist.
5. Check a player client sees the same overlay; close on GM and confirm both dismiss.
6. With narration active, test a normal scene transition; its cover should obscure narration during the transition and reveal the narration again afterward.
7. If only the card appears, copy the `[ZFT] 🎙️ v0.1.0-dev.16` console messages so we can identify whether the state failed, the overlay failed to build, or CSS still suppressed it.

**Note:** Non-GM narration still uses a chat request that a connected GM authorizes before saving world state. Until this flow is separately validated in a live player session, the absence of a GM makes it unavailable. This change fixes the GM-initiated chat-without-overlay regression without modifying that authorization protocol.


## Dev 14 | Narrate button amber color priority

- Based strictly on the working Dev 12 build. No Dev 13 layout workaround is included.
- The Narrate button's idle amber CSS now outranks ZFT Tools Dev 7's general silver icon styling regardless of stylesheet load order. Hover/active remain emerald.
- No changes to narration overlay behavior, chat messages, scene transitions, or ZFT Tools.
- Test with a hard refresh (Ctrl+Shift+R) after replacing the files. Restart or exit to Foundry Setup only if updated styles are still not loading.

## Dev 15 | Transition presentation options

Built directly from the working Dev 14 source. Narration, toolbar, fade/wipe animations,
Scene.activate interception and remote reveal choreography are unchanged.

New Settings under **ZFT Tools → Cinematics**:

- Presentation: single image/video, random folder, centered logo on black,
  or plain black.
- Display: full-screen cover (crop) or contain (whole file on black).
- Independent logo path and optional centered logo overlay on image/video.
- Random folder picker (Foundry Data source). Supported: PNG, JPG/JPEG, WebP,
  WebM; top-level folder files only. The GM selects once per scene transition;
  every client receives the same media path over the existing Cinematics socket.
  A list is cached for five minutes; Refresh Media List forces a rescan.
  Consecutive repeats are avoided when more than one file is available.
- Missing/unreadable media falls back to black without blocking activation.
- The **Single** mode remains the default, retaining existing world splash paths
  and destination scene `zft-cinematics.splash` flags.
- Quick Fade/Wipes affect only the animation. They do not overwrite
  presentation settings.

### Dev 15 Foundry V13 test

1. Install the complete Dev 15 ZIP, exit to Foundry Setup and re-enter the world
   (new world settings are registered at init), then Ctrl+Shift+R.
2. With the existing single-splash mode, activate a new scene normally. The
   original splash media should still show and the overlay should fade/wipe.
3. Choose Black Screen in Cinematics Settings; save; transition. Expect only black.
4. Choose Centered Logo, browse an image, save, transition. Expect uncropped logo
   centered on black, visible to GM and player.
5. Choose Random Folder, browse a Data directory of images/WebM videos and
   use Refresh List. Transition twice; avoid repeating the immediately previous
   file if the folder contains more than one supported file. Test on GM and player.
6. Choose Fit Whole Media and optionally Logo Overlay. Test both options.
7. Ensure Narrate overlay, its chat card, and icon still behave as in Dev 14.

Tested locally with syntax/package checks; full live GM/player validation pending.


## Dev 16 | Remove redundant Scene context-menu action

- Removed **ZFT Cinematics: Transition Here** from the Foundry Scenes right-click menu.
- Removed the scene-menu-only helper and context-menu hook.
- Native **Activate** continues to drive automatic transitions, and quick Fade/Wipe actions still apply to the next scene activation.
- When automatic transitions are off, a queued quick effect still applies once on native Activate.
- All effect animations, narration, splash presentation, settings, and player synchronization remain unchanged.
- Kept the public transition API for existing programmatic callers; no unrelated feature was removed.

### Dev 16 V13 test

1. Enable Cinematics and libWrapper, then refresh the browser (Ctrl+Shift+R).
2. Right-click an inactive scene. Expect **no** ZFT Cinematics context-menu entry; native **Activate** remains.
3. Activate a scene normally. Expect the configured fade/wipe and presentation.
4. Choose a one-shot Wipe, then activate another scene. Expect that Wipe once, followed by the saved default on the subsequent activation.
5. Open Cinematics Settings and Narrate. Both should behave as in Dev 15.
