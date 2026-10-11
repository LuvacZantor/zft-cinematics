# ZFT Cinematics Changelog

## v0.1.0 — First stable release

Baseline: accepted `v0.1.0-dev.26` functionality, with version strings and release documentation updated. No functional changes to camera interaction or scene transitions in this promotion.

### Included

- Native scene activation fade/wipe workflow, configurable default and one-shot choices.
- Transition image/video/logo and randomized-folder splash presentations.
- Persistent narration overlay, chat cards, and slash commands.
- Per-user Smooth Camera: wheel zoom, direct right-dragging, optional throw/coast, easing and duration settings.
- 500 ms Smooth Camera default for users without previously saved preferences.
- Removed temporary camera debug output and preference-panel diagnostic information.

### Deferred

Director Camera broadcast/presets, spotlight and automated framing, camera paths, advanced effects, OBS Recording Display, audio cues, scene preloading, and V14 validation. See ROADMAP.md.

### Verification caveats

Features were developed and tested in Foundry V13, including live validation of direct right-dragging and throw behavior. Full GM/player regression and V14 verification remain outstanding.
