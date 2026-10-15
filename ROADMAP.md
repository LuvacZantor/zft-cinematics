# ZFT Cinematics Roadmap

Last reviewed: 2026-10-15
Development baseline: **v0.2.0-dev.25** on `develop` (validated locally in live Foundry V13 on 2026-10-15).
Target: **Foundry VTT V13 Build 351**; V14 has **not** been validated.
Companion for shared Narrate content: **ZFT Narration Library v0.1.0-dev.3** (separate module/repository).
Release status: development baseline only; `main` has not been promoted and no stable tag/Release exists. See the release decision below.

> Planning document, not a blanket feature commitment. Distinguish implemented functionality, the specific live-tested V13 scenarios, and untested or future work. Preserve the working dev.20 code and avoid unnecessary changes to already-passing scrolling and fade behavior.

## 1. Scene Transitions

### Implemented
- [x] Automatic transition on native scene activation (requires active libWrapper for native interception)
- [x] Fade to black and reveal
- [x] Directional wipes: left, right, up, down
- [x] One-shot fade/wipe choices in ZFT Tools; then return to saved default
- [x] Configurable world defaults and duration
- [x] GM/player transition synchronization
- [x] Remove redundant scene right-click transition action

### Planned / candidate effects
- [ ] Optional crossfade/dissolve between scenes
- [ ] Diagonal wipes
- [ ] Radial/clock wipe
- [ ] Iris/circular reveal or close
- [ ] Expanded scene-specific effect and timing overrides (verify supported settings before implementation)

## 2. Transition Media and Presentation

### Implemented
- [x] Solid black presentation
- [x] Single image/video splash (including WebM)
- [x] Random media from a selected folder, with no immediate repeat when possible
- [x] One GM media choice shared across clients for each transition
- [x] Centered logo on black
- [x] Full-screen cover or uncropped/contained media
- [x] Separate optional logo overlay on media
- [x] Media selection kept independent of fade/wipe choice
- [x] Existing destination-scene splash media flag support
- [x] Missing-media fallback to black

### Future
- [ ] More comprehensive per-scene transition-media configuration
- [ ] Manually presented cinematic splash/title screens, without activating a scene (deferred)
- [ ] Transition audio or music cues (deferred; avoid timing complications)
- [ ] Scene/media preloading (deferred; only if a real performance need arises)

## 3. Narration — Dev.25 accepted development baseline

### Implemented in Cinematics

- [x] Incorporate Narrate Only into ZFT Cinematics; GM editor under ZFT Tools; legacy slash commands and narration API retained
- [x] Four presentation types: Narration, Location Title, Announcement, Subtitle
- [x] Rich editor: registered/custom Foundry fonts, sizing, bold/italic/underline, alignment, safe HTML/Markdown paste, images, and separate image controls
- [x] GM-only Preview, Back to Editor, explicit Publish, and Save from Preview/published view
- [x] Back to Editor after publishing without dismissing the currently visible player narration; return to the live presentation or republish changed content
- [x] Narration-only entry/exit effects (including Fade In, Fade In / Out, Dissolve, and Fade Through Black), independent of scene transitions
- [x] GM action toolbar kept outside the narration card, fixed near the bottom of the viewport; player view never includes GM buttons
- [x] Internal scrolling of long narrations, independent player automatic scrolling and Pause/Resume, and Slow/Normal/Fast plus expanded presets and custom 1–120 px/sec speed
- [x] Optional Follow GM scrolling: GM manual and initiated automatic movement sent to following player clients; players can interrupt and rejoin independently
- [x] Text color and selection highlighting; card and backdrop colors; image/texture backgrounds with Tile/Cover/Contain, tint, and darkness controls
- [x] Dedicated clickable background-image picker separate from Graphics Library maintenance
- [x] Explicit Save as Default, Restore Default, and Reset to Original appearance controls; default appearance scoped to current world
- [x] Saved individual narration appearance, speed, and settings; loaded presentation reproduces saved styling
- [x] Persistent narration state, player overlays/chat cards, GM close, optional timed dismissal, and coordination with scene-transition overlay

### Shared saved passages and graphics (separate ZFT Narration Library module)

- [x] Save/Load passages through the library's editable JournalEntry compendium, with folder navigation, search, naming, overwrite confirmation, and folder management
- [x] Delete one or multiple saved passages with confirmation; do **not** delete associated graphics automatically
- [x] Keep reusable graphics under the Narration Library module assets folder so they are available to different Foundry worlds on the same User Data install
- [x] Graphics Library with reference tracking, Keep protection, temporary/draft protection, and a seven-day cleanup eligibility window
- [x] Cleanup is **manual**, not automatic filesystem deletion; unused graphics require review and appropriate server-side removal
- [x] Library GM ownership and compendium lock/unlock workflow
- [x] Library `v0.1.0-dev.3` is the installed/tested companion version; it is **not** bundled or updated by a Cinematics-only ZIP

**Data safety:** Back up the entire `Data/modules/zft-narration-library/` directory, including its `packs/` database and `assets/graphics/`, before replacing the library module. It is a **mutable data store**, not disposable module code. Do not delete it or assume routine reinstall/update preserves its saved content.

### Dev.21–dev.25 additions and behavior changes

- [x] Dev.21: attach one optional MP3/OGG/WAV soundtrack per narration, with selection/upload into the companion library's `assets/audio/`; auto/manual audio start, loop, volume, fade, and GM/player controls; Save/Load stores sound settings.
- [x] Dev.22: audio **Pause → Resume** preserves playback position, while **Stop → Play** restarts. Improvements to browser manual scroll interruption and speed persistence.
- [x] Dev.23: live GM scrolling-speed updates drive following players smoothly, even with different viewport heights; preserve player override and rejoin.
- [x] Dev.24: replace separate Independent/Follow GM editor modes with **one GM-directed scrolling workflow** and a grouped GM panel (Start/Pause/Resume, Restart, speed and position). Existing saved passages remain loadable.
- [x] Dev.25: remove narration auto-start; narration stays at the top until the GM explicitly chooses **Start Scroll**. GM manual, live speed, position seeking, and Restart remain available.
- [x] Dev.25: **Back to Editor after Publish** ends the active presentation, closes the player narration, immediately stops its soundtrack on GM/player clients, stops scrolling, and preserves the GM's editable draft. Preview Back to Editor remains GM-only. Normal Close still uses configured sound fade-out.
- [x] Dev.25: shared audio can be paused/resumed and looped. Player mute and volume remain local. Uploads are retained in library storage; audio file cleanup is not automated.

### Live V13 acceptance — 2026-10-14, dev.20

**9/9 tests passed, 0 failed, 0 skipped** in the user's Foundry V13 environment:

1. Click-to-select background thumbnail and Use as Background
2. Compact appearance controls and separation of image selection from graphics maintenance
3. Selected text colors and highlights display on player clients
4. Card background, uploaded texture, darkness, and tint display on player clients
5. Save as Default survives closing/reopening Narrate; Restore and Reset work
6. Save/Load restores appearance and publishes correctly
7. GM manual scrolling, player override, and Follow GM work
8. Fade In, Dissolve, and Fade Out work on player clients
9. Back to Editor, Preview, and Save/Load work

This is acceptance of the **development baseline and those scenarios**, not proof that every permission path, presentation combination, or V14 API has been tested. No known failures remain from the dev.20 checklist. Previous reports of broken scrolling/fades were resolved by refreshing a stale player client; preserve the working dev.17-origin scroll/fade logic.

### Live V13 acceptance — 2026-10-15, dev.25

**9/9 PASS, 0 FAIL, 0 NOT TESTED**, user-confirmed on live Foundry V13 Build 351:

1. A long published narration **does not automatically scroll** on GM or player client.
2. GM's Start Scroll advances the text on both GM and following player clients.
3. GM Pause, Resume, speed changes, and Restart continue working.
4. Players can interrupt their local scrolling and rejoin Follow GM.
5. With looping soundtrack, Back to Editor closes the player narration and stops audio on **both** GM and player clients.
6. Back to Editor restores the draft's text, formatting, soundtrack, and scrolling settings.
7. Republishing begins at the top and waits for explicit GM Start.
8. GM-only Preview and its Back to Editor stay private and do not broadcast.
9. Normal Close Narration, audio Pause/Resume, fades, textures, and Save/Load still work.

**No remaining corrective issues reported for dev.25.** `docs/NARRATE-DEV25-TESTING.md` records the exact test procedure and owner acceptance. This validation does not establish Foundry V14 support.

### Narration notes and remaining validation

- After replacing module JavaScript/CSS, hard-refresh **both GM and player browsers** (`Ctrl+F5`) before diagnosing client-side regressions
- Dev.24/25 groups GM scroll controls in one panel outside the narration card; player override/rejoin remains separate. Avoid moving controls unless specifically requested
- Narration scrolling never auto-starts. GM Start/Restart controls synchronized movement. Timed dismissal is separate and **does not wait** for anyone to finish reading; prefer Manual (GM closes) for long passages
- Continue regression testing when Narrate changes: GM/player broadcast, manual Follow GM, interruption/rejoin, fades, formatting, saved content, and image protections
- [ ] Validate Foundry V14 separately
- [ ] Review untested player authorization, disconnection/rejoin, and less common narration combinations as needed

### Release decision and promotion checklist

The owner has asked to update **all files on `develop`** to dev.25 and has raised possible promotion to `main`, but has **not yet authorized a specific stable-version/main merge, tag, or GitHub Release**. Do not interpret this develop sync as approval to publish.

Before any stable promotion:

1. Confirm the intended stable release number for the accepted dev.25 code, e.g. `0.2.0` if that is the approved target.
2. Prepare stable `module.json`, version logs, README/release notes, and installable ZIP, keeping the code behavior identical to the live-validated baseline.
3. Consider the module's required `zft-tools` integration and recommended ZFT Narration Library `v0.1.0-dev.3`; do not modify or erase shared library compendium or uploaded graphics/audio.
4. Confirm Foundry V13 scope; V14 compatibility is unverified and must not be claimed.
5. Obtain **separate, explicit permission** for the `main` update, release tag and GitHub Release publication as applicable.
6. Preserve `main` history; no force-pushes.

### Deferred narration presentation

- [ ] **Cinematic Crawl:** Star Wars-inspired perspective crawl on a starfield, with configurable styling and speed; investigate Pause/Resume and optional Follow GM progress synchronization. Separate future feature, **not automatically the next build**.


## 4. Smooth Camera (Phase 1)

### Working in local/live testing
- [x] Smooth mouse-wheel zoom
- [x] Native-feeling direct right-click drag, without spring or bounce
- [x] Throw/coast on moving release with friction-based deceleration
- [x] Stop without throw when mouse movement pauses before release
- [x] Interrupt coast with a new drag
- [x] Per-client settings, configurable easing and animation duration
- [x] Default duration 500 ms for new client settings
- [x] ZFT Tools camera settings access for players and GM
- [x] Remove verbose temporary camera diagnostic logs and counters

### Validation
- [ ] Revalidate Smooth Camera separately as needed after narration updates, including conflicts with other camera modules; the dev.20 **Narrate** acceptance checklist did not re-test all camera behavior

## 5. Director Camera (Phase 2) — Next when needed, currently deferred

- [ ] GM sends current camera center and zoom to connected players
- [ ] Animate recipients smoothly to that view, independent of their individual smoothing preferences
- [ ] Restore normal player control after animation (default)
- [ ] Named camera presets saved per scene
- [ ] Recall, preview, edit, and broadcast presets
- [ ] Optional temporary view lock / GM release
- [ ] Smooth animations between saved camera positions

## 6. Spotlight and Automatic Framing

- [ ] Focus players on a specific canvas coordinate
- [ ] Focus on a selected token or character
- [ ] Focus on a group of tokens, with suitable framing and padding
- [ ] GM-controlled synchronized spotlight without permanent control loss
- [ ] Restore previous player viewpoint when appropriate
- [ ] Automatic framing of party/player characters (future)
- [ ] Optional token follow, group follow, GM follow, and combat follow (future; avoid surprise camera grabs)

## 7. Camera Paths and Cinematic Sequences — Future storytelling tools

- [ ] Define a multi-stop route using saved camera presets
- [ ] Animate pans and zooms along the path
- [ ] Configure per-leg durations/easing and pauses at stops
- [ ] Optional narration cues synchronized with camera movement
- [ ] Manual interrupt / skip / return control
- [ ] Keep authoring optional and lightweight; no mandatory per-session preparation

## 8. Recording Display / OBS Presentation Mode — Future

- [ ] Dedicated recording/observer account or client with different camera behavior
- [ ] Recording camera follows GM on demand or per scene
- [ ] Independent recording camera not forced to match GM viewpoint
- [ ] Automatically frame player characters or action for recording
- [ ] Smooth recording camera tracking/transitions
- [ ] OBS-friendly presentation that does not disrupt interactive GM or player clients

## 9. Technical and Quality Work

- [ ] Maintain stable socket synchronization and safe behavior for disconnected players
- [ ] Ensure camera animation can be interrupted safely
- [ ] Avoid conflict with existing smooth-camera and pointer/ping modules
- [ ] Verify dependencies and graceful fallback where features require libWrapper
- [ ] Test V13 GM/player combinations; separately validate V14
- [ ] Keep changes scoped, maintain clear versions, document feature acceptance before promoting to main

## Separate Module: ZFT Canvas Tools (proposed)

These are **not** Cinematics deliverables:
- Hold-to-point cursor and shared pings
- Temporary markers, arrows, paths, and annotations
- Quick GM attention pings or location pulls
- Future integration can call Cinematics' camera API rather than implement a second cinematic camera controller

## Discussed but not in scope

- Critical-hit/fumble visual presentations: leave to dedicated feature modules unless scope is explicitly revisited.
- Replacing PnP's whole pointer/ping system in Cinematics: rejected in favor of a potential standalone Canvas Tools module.

## Immediate decision

Keep **v0.2.0-dev.25 on `develop`** as the last user-validated Narrate development baseline. Do not start a new build from a bug report or planning discussion alone; the owner must explicitly authorize a build. Preserve passing features in any subsequent build. The next developmental prerelease would ordinarily be `0.2.0-dev.26`, only when a meaningful change set is approved. The Cinematic Crawl, Director Camera, and other future cinematic ideas remain deferred unless selected for an explicitly authorized build.

## Repository workflow

This roadmap tracks `develop` planning only. **No remote repository writes** (including documentation commits) without a fresh, task-specific authorization. Approval to build a local ZIP is not approval to commit/push; approval to push `develop` is not approval to change `main`. Promotion to `main`, tags, and Releases each require separate owner approval and appropriate live verification.

**New-chat handoff:** Work from `LuvacZantor/zft-cinematics` branch `develop` at the documented `v0.2.0-dev.25` baseline or later. Treat `v0.2.0-dev.25` as the accepted Foundry V13 Narrate baseline (9/9 live tests passed), with ZFT Narration Library `v0.1.0-dev.3` as its separate companion. Read the current `module.json`, this roadmap, and the repository's relevant documentation before making changes. Keep all other Cinematics systems intact. When providing a Foundry test checklist, offer **Pass / Fail / Not Tested** selections and a way to submit the results back to the conversation.
