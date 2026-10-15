# ZFT Cinematics Changelog

## v0.2.0 — Stable release (2026-10-15)

Promoted from **v0.2.0-dev.25**, whose Narrate workflow passed **9/9 live Foundry V13 acceptance tests**. Promotion modifies the release version and documentation; no presentation, camera, audio, or scene-transition behavior was intentionally changed.

### Narrate additions since v0.1.0

- Shared rich-text editor with four presentation types, Foundry fonts, formatting, safe graphics, background appearance options, and GM-only Preview/Publish/editor workflow.
- Companion ZFT Narration Library (`v0.1.0`): shared saved passages, folders, graphics maintenance safeguards, and uploaded media references.
- GM-controlled manual-start synchronized narration scrolling: grouped Start/Pause/Resume, Restart, live speed and position controls, and independent player override/rejoin.
- Optional soundtrack per presentation, media selection/upload, looping, volume, fades, Pause/Resume without losing the playback position, and local player sound controls.
- Back to Editor after publishing now closes players' overlays, immediately stops GM/player soundtrack and scrolling, and preserves the GM draft; preview stays private.
- Existing scene transitions, presentation media, and Smooth Camera remain available.

### Acceptance and limitations

- **9/9 PASS**, live Foundry V13 Build 351, 2026-10-15, for the published dev.25 Narrate regression checklist (`docs/NARRATE-DEV25-TESTING.md`).
- Foundry V14 is **not** validated. This acceptance is not a full live re-test of every existing camera or scene-effect variant.
- ZFT Tools is required; the separate ZFT Narration Library is recommended. Protect its editable `packs/`, graphics and audio data; the Cinematics update never requires deleting it.
- Deferred: Cinematic Crawl, Director Camera, Spotlight/Automatic Framing, Camera Paths, advanced transitions, and OBS recording view. See `ROADMAP.md` on GitHub.

## v0.1.0 — First stable release

The original stable release provided native scene activation fade/wipes, customizable transition splash image/video/logo media, narration overlay and chat cards, and configurable local Smooth Camera panning/zooming with optional throw/coast. The 500 ms default applies to clients without a saved smoothing preference. Additional camera direction/recording features and V14 validation were deferred.
