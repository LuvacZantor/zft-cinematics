# ZFT Cinematics

GM-controlled cinematic scene transitions for Foundry VTT, with toolbar integration through ZFT Tools.

## Development build: v0.1.0-dev.26

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

1. Enable **ZFT Tools v0.1.0-dev.7**, **ZFT Cinematics v0.1.0-dev.26**, and **libWrapper**. Hard-refresh your browser (Ctrl+Shift+R). Restart Foundry only if the module changes are not recognized.
2. Open Settings from the right Cinematics column, enable Automatic Transitions and save **Fade**. Activate a different scene with Foundry's own **Activate** action (not just privately View). The map should fade out to black and reveal the new scene, without a Cinematics prompt.
3. Click **Wipe Left** on the right toolbar, then activate the next scene normally. Both halves should wipe. Activate another scene: the saved Fade must return.
4. Right-click an inactive scene: the extra **ZFT Cinematics: Transition Here** option must be absent; Foundry native **Activate** must remain. Test another one-time effect using native Activate.
5. Save a different default and reload; verify persistence. Repeat with a player client if possible.
6. Turn Automatic Transitions off; native Activate should proceed without cinematic effects, but a queued one-shot effect must still run on the next native Activate.

**Diagnostic log:** At scene activation, look for `[ZFT] 🎬 v0.1.0-dev.26 🎯 | Native scene activation captured`. If that message is absent, ensure libWrapper is enabled and that your action actually **activates** a scene rather than only privately viewing it.

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
7. If only the card appears, copy the `[ZFT] 🎙️ v0.1.0-dev.26` console messages so we can identify whether the state failed, the overlay failed to build, or CSS still suppressed it.

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


## Dev 17 | Smooth Camera Phase 1

This build adds **local, opt-out camera smoothing** on Foundry V13. No camera position
is sent to other users; Director Camera, token following, and combat following are future phases.

- **ZFT Tools → Smooth Camera** is available to GMs and players and saves each user's
  client-only settings. It does not affect transition or narration settings.
- **Smooth wheel zoom:** Wraps Foundry's native wheel zoom handler to preserve its
  existing zoom increments, bounds, and cursor-focus behavior; interpolates the
  resulting viewport rather than applying an abrupt camera jump. Fast wheel turns
  can re-target an in-progress zoom.
- **Smooth pan:** Native right-mouse dragging remains responsive; optionally
  adds a small, capped easing glide at the end of a fast drag. Does not change
  token dragging or other canvas interaction.
- **Client settings:** Enable, smooth zoom, glide after right drag, duration
  100–1000 ms (default 500), easing Linear / Ease Out / Ease In-Out.
- **World setting:** ZFT Tools → Cinematics Defaults → Allow Smooth Camera.
  Defaults enabled; GM may disable this for all clients.
- **Conflict handling:** Automatically suspends smoothing when aeris-smooth-camera
  or ez-glide is active, rather than driving the same camera twice.
- Uses the existing libWrapper module for non-invasive wrapping of V13's
  native wheel and right-drag event handlers. If libWrapper is inactive, normal
  Foundry camera controls continue, with smoothing disabled.
- Camera motion is cancelled when the scene tears down, right-drag begins,
  or settings are disabled. No new socket action or world-state persistence.
- Existing fade/wipe timing, splash presentation, Narration, and the scene
  context-menu removal are unchanged.

### Dev 17 live test (V13 Build 351)

1. With ZFT Tools Dev 7, Cinematics Dev 17 and libWrapper active, refresh the
   browser. If Foundry cached the module manifest from Dev 16, exit to Setup and
   re-enter the world once, then hard-refresh.
2. GM and player: ZFT Tools → Smooth Camera opens a per-user settings dialog.
3. Turn smooth zoom on, use the wheel repeatedly near a point on the canvas.
   Expected: smooth transitions without snapping; zoom targets the mouse area.
   Set duration to 100 and 1000 to compare.
4. Turn smooth zoom off. Expected: ordinary Foundry wheel zoom.
5. Turn glide on, right-drag rapidly and release. Expected: native 1:1 drag
   while held and a short controlled glide on release. Disable for native stop.
6. Test Linear, Ease Out, and Ease In/Out. Each is local to that player.
7. GM: disable Allow Smooth Camera under Cinematics Defaults. Both clients
   should immediately revert to normal camera behavior.
8. Activate scenes; test Fade/Wipe, Narrate and the sidebar. They must be
   unchanged. Test switch while zoom is animating: no lingering motion.

**Warning:** Disable other camera-smoothing modules while testing. This build
has automated checks but does not claim live Foundry compatibility yet.


## Dev 18 | Smooth Camera right-drag response and player toolbar

- Fixed Smooth Camera not appearing in ZFT Tools for non-GM clients. The
  per-client preferences action now registers for GMs and players, while GM
  transition/scene controls remain GM-only.
- Smooth Pan now interpolates right-drag movement **during** dragging, instead
  of a barely noticeable inertia effect only after release. On release it
  catches up to the exact selected position without momentum or overshoot.
- The native Foundry drag handler still chooses the target camera position;
  Cinematics smooths only the displayed viewport. There are no network or
  world-data camera writes.
- Camera duration controls tracking response; easing controls wheel animations
  and the short final catch-up after right-drag release.
- Smooth Camera icon is sky blue when idle and emerald on hover/active, even
  when ZFT Tools' general silver styling loads after Cinematics CSS.
- Keeps the existing world/client setting keys. No settings reset required.
- All transition, presentation, and Narration files and behavior are preserved.

### Test in Foundry V13

1. Replace Dev 17 with Dev 18; restart Foundry to ensure the updated manifest
   and scripts load, then hard-refresh both GM and player browsers.
2. As GM and as player, open ZFT Tools. Smooth Camera should appear as a sky-blue
   video/camera icon; its preferences dialog must open from both clients.
3. Right-drag the scene at 350 ms with Smooth Pan enabled. The view should
   follow smoothly while the button is held, then settle without overshoot.
4. Disable Smooth Pan: right-drag becomes native, without smoothing.
5. Compare 100 ms versus 800 ms (larger = more visible smoothing).
6. Test mouse-wheel zoom, switching between Token and ZFT control groups,
   Fade/Wipe, Narrate, and a scene activation. Report any console errors.
7. If libWrapper is disabled, Smooth Camera remains inactive and logs a warning;
   scene transition handling remains separate.


## Dev 19 | Fix smooth-camera initialization and make runtime visible

- Install libWrapper camera hooks during Foundry `setup` instead of first
  registering at `ready`. V13 may have already captured the original right-drag
  callbacks by `ready`, so Dev 18's settings could appear while input bypassed it.
- Keep an idempotent `ready` registration fallback if `setup` could not register.
- The per-client dialog now reports whether smoothing is active and how many
  right-drag start/move events actually reached Cinematics since the page loaded.
  If the move count stays zero after a right-drag, do not assume it is working.
- The Movement Style selector now also affects in-drag tracking responsiveness.
  The native cursor target is retained; release settles at that exact location.
- Correct an obsolete `samples` variable in the canvas teardown callback.
- Show incompatible enabled camera modules and missing libWrapper directly in
  Camera Settings instead of leaving enabled-looking controls silently inert.
- Narration, transitions, splash handling, camera key names and player icon
  remain unchanged from Dev 18.

### Focused Foundry V13 test

1. Replace Dev 18 with Dev 19. Restart Foundry (input callbacks may be bound at
   scene initialization), then refresh GM/player browser sessions.
2. As GM or player, open **ZFT Tools → Smooth Camera**, check **Camera status**.
   It should say hooks installed/smoothing enabled, with no conflicting modules.
3. Close the dialog, hold right mouse button and drag on the map, then reopen
   Smooth Camera. **Right-drag events observed** must be greater than zero.
4. Compare 100 ms and 800 ms while right-dragging. Compare Linear vs Ease Out
   vs Ease In/Out with the same duration (try 800 ms to make it obvious).
5. Turn Smooth Pan off: verify dragging becomes native again. Check zoom and
   switching scenes, a Narrate overlay, and the Cinematics Fade controls.
6. If right-drag moves stay at zero, share the status line and console output
   containing `[ZFT] 🎥 v0.1.0-dev.26`. That establishes hook bypass instead
   of making another blind tweak to animation speeds.


## Dev 20 | Inertial right-drag panning

- While holding right mouse button, pan follows the native Foundry target with
  a one-way smooth convergence. Holding still gently settles without bounce.
- Release *while moving* to coast further in the same direction and gradually
  decelerate. Release after pausing to finish at the selected position with no
  extra momentum.
- Added client setting **Coast after releasing right-click**, enabled by default.
  Disabling smooth pan also disables release coast and returns to native dragging.
- Duration affects both follow responsiveness and the inertia distance.
  Movement Style affects pan tracking and how strongly the release decelerates.
- Scene-change cleanup, GM/player toolbar, narration, fade/wipe, splash media
  and synchronized transitions are preserved. No GitHub changes.

### Quick test

1. Install Dev 20 and re-enter the Foundry world to register the new client
   setting; hard-refresh the browser.
2. Smooth Camera → set 350 ms, Smooth Pan ON, Coast ON. Right-drag,
   release while still moving. Expect a short coast and slow stop.
3. Right-drag, stop moving but KEEP HOLDING for a moment, then release.
   Expect no additional coast, and no spring/bounce.
4. Switch Coast OFF and repeat. Compare at 150 and 650 ms.
5. Disable Smooth Pan entirely. Expected: native right-drag behavior.
6. Verify GM and player Smooth Camera buttons remain accessible and that
   Narrate, scene transition effects, and the sidebar are unaffected.


## Dev 21 | Photoshop-style hand-tool panning (removes spring)

- Right-drag is native Foundry V13 direct movement, with no camera interpolation
  while the mouse button is held. Stop moving while held and the camera stops
  immediately at the last location, without catch-up, bounce, or snap-back.
- Releasing while moving (a Photoshop-style "throw") coasts along the latest
  real dragging direction with friction, then stops. Holding still before
  releasing avoids a throw.
- Per-client Coast/Throw checkboxes remain. The existing
  `cameraSmoothPan` key now means "Enable right-drag throw" rather than
  enabling the removed spring-follow algorithm. Turn it off to restore pure
  native pan including native stop-on-release.
- Easing style only applies to animated mouse-wheel zoom. Duration controls
  wheel animation and maximum coast length; it does not change native drag.
- Another right-drag cancels coast immediately. Scene teardown cancels it.
- Camera pan still uses Foundry's supported `canvas.pan` and normal bounds.
- Dev 20 spring-target and return-to-target logic have been removed entirely.
- All prior Cinematics transitions, Narration, ZFT Tools controls, and
  per-user settings remain unchanged. No GitHub changes.

### Live V13 smoke test

1. Install Dev 21 and refresh the browser (re-enter the world or restart Foundry
   if scripts are cached).
2. Right-drag slowly while holding the mouse. The canvas should stay directly
   under your pointer, without spring or delayed tracking.
3. Keep holding right-click, but stop moving. The view must stop immediately.
4. Flick/drag quickly and release *while still moving*. The canvas should coast
   a short distance in that direction, then gently stop.
5. Pause for ~0.2s before release: no extra coast.
6. Turn OFF Coast or the main right-drag throw checkbox: native drag and stop
   should behave exactly like stock Foundry. Verify Smooth Wheel Zoom still works.
7. Repeat on a player account if possible. Verify narration and scene transitions.


## Dev 22 | Right-drag throw input sampling fix

- Use real browser pointer/mouse gesture samples for velocity, independent of
  whether Foundry has updated the canvas pivot inside its drag callback.
- Keep direct native Photoshop-style right dragging with zero spring.
- Keep release-only momentum, finite friction, boundaries, client settings,
  scene-change cancellation, and smooth mouse-wheel zoom.
- Added a Last right-drag release diagnostic for next live test: result,
  velocity, travel, and frames, plus native drop-event count.
- No changes to narration, fades/wipes, splash media, or ZFT Tools.

Test: enable Coast and Throw; make a quick right-drag flick, releasing
while moving. Reopen Smooth Camera and check Last right-drag release.
Then hold right-click still for 0.2 seconds before release: no coast expected.


## Dev 23 | Browser right-release fallback

- Preserve direct, native, spring-free right-dragging and smooth mouse-wheel zoom.
- Capture browser-level mouseup/pointerup as a fallback for V13 right-drag
  workflows that bypass the private native Drop callback.
- Delay the release throw until native input cleanup finishes to avoid immediate cancellation.
- Never double-process mouseup plus native drop.
- Add source/velocity diagnostics to console and to the camera settings dialog.
- No changes to other Cinematics features or to ZFT Tools.


## Dev 24 | Smooth Camera default duration

- Changed the default Smooth Camera duration from 350 ms to 500 ms for new client preferences.
- Duration affects smooth mouse-wheel zoom animation and the maximum right-drag coast time, not movement while holding the right mouse button.
- Easing affects wheel zoom only; coasting uses friction.
- Existing saved client preferences are respected and are not overwritten.
- No changes to the working Dev 23 direct drag and release detection.


## Dev 25 | Retire Smooth Camera drag/throw diagnostics

- Removed native right-drag capture and release console messages, including per-release speed/result objects.
- Removed test counters and the Last right-drag release diagnostic from Smooth Camera preferences.
- Retained a simple Camera status message, plus warnings for conflicting or missing dependencies and errors for initialization failures.
- No changes to Photoshop-style direct drag, release momentum, smooth wheel zoom, settings, narration, or scene transitions.
- Next planned milestone: Director Camera (GM-to-player camera control).


## Dev 26 | Final Smooth Camera diagnostics cleanup

- Removed the remaining Camera status diagnostic row from the player-facing Smooth Camera preferences window.
- Drag-event counters and throw diagnostics were already removed in Dev 25; routine drag/throw console logging remains disabled.
- Aligned the Narration script's visible version identifier with the module version.
- No changes to native right-drag movement, throw momentum, wheel zoom, narration behavior, or scene transitions.
