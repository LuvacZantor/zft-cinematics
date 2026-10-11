# ZFT Cinematics Roadmap

Last reviewed: 2026-10-10
Development baseline: v0.1.0-dev.26 (development build)
Target: Foundry VTT V13 Build 351; V14 validation pending.

> Planning document, not a feature commitment. Status reflects implementation or discussed design, not a claim of complete GM/player live verification. Keep production stable; implement optional enhancements only when there is a useful table need.

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

## 3. Narration

### Implemented
- [x] Incorporate Narrate Only functionality into ZFT Cinematics
- [x] GM narration editor and ZFT Tools button
- [x] Full-screen narration overlay and chat card
- [x] Slash commands to display and dismiss narration
- [x] Configurable minimum role and chat speaker
- [x] Narration state persistence through refresh
- [x] GM close control
- [x] Narration layer coordinated with transition overlay

### Validation
- [ ] Confirm all player-role authorization and cross-client scenarios in live V13 testing

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
- [ ] Final GM/player test of Dev 26; ensure other camera modules do not fight the behavior

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

Pause feature growth if desired. Dev 26 is the current development baseline. Director Camera is the next logical development phase when there is a clear storytelling use case; save the broader ideas here without making them obligations.

## Repository workflow

This roadmap tracks `develop` planning only. Promotion to `main`, tags, and Releases requires separate approval and live verification.
