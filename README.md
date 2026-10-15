# ZFT Cinematics

Stable release: **v0.2.0** (promoted from the user-accepted `v0.2.0-dev.25`).  
Target: **Foundry VTT V13 Build 351**. Foundry V14 is **not verified**.  
Repository: https://github.com/LuvacZantor/zft-cinematics

ZFT Cinematics brings scene-transition effects, cinematic media, a shared Narrate presentation/editor, and Smooth Camera controls into the ZFT Tools toolbar.

## Requirements and companion content

- **ZFT Tools** is required for the integrated toolbar.
- **libWrapper** must be installed and active for automatic interception of native Foundry scene activation; without it, that automatic transition path cannot be used.
- **ZFT Narration Library v0.1.0** is recommended for shared saved passages and media. It is a **separate content-bearing module**. Its installed compendium and uploaded media must not be deleted or overwritten during updates.
- Disable any older standalone Narrate Only modules to avoid duplicated commands, listeners, and overlays.

## Features

### Cinematic scene changes

- Native scene-activation transitions: Fade and directional wipes, saved automatic effect and one-shot effects from the GM toolbar.
- Presentation media: images, video, randomized media folder, logo on black, and black-screen fallbacks, including contain/cover presentation choices.
- Supports persistent GM/player narration overlays alongside scene transitions.

### Narrate editor and presentation

- GM-authored Narration, Location Title, Announcement, and Subtitle presentations, with formatted text, custom Foundry font families, graphics, and optional narration chat cards.
- Shared saved passages organized in the ZFT Narration Library compendium, with Save/Load, folder management, appearance presets, and protected graphics library/cleanup review.
- Independent GM Preview (no player broadcast), publishing, fade/closing effects, and editable drafts.
- **GM-directed scrolling:** newly published long narration stays at the top until the GM selects **Start Scroll**. A single GM scroll control panel groups Start/Pause/Resume, Restart, live speed (1–120 px/sec), and narration position. GM manual scrollbar movement and scroll-speed changes synchronize to following players. Players can temporarily interrupt and rejoin **Follow GM**.
- **Back to Editor after Publish** ends the active presentation: player overlays close and audio stops on GM/player clients, while the GM draft and settings remain available for editing. Preview's Back to Editor stays GM-only. Normal Close continues to use its configured fade behavior.
- Optional soundtrack per narration: MP3, OGG, or WAV, playback/loop, master volume, audio fade, auto- or manual audio start, GM Pause/Resume/Stop, and local player mute/volume. Audio can be uploaded to the companion library's dedicated media storage; Stop then Play begins anew, while Pause then Resume retains playback position.
- Legacy `/narrate`, `/narration`, `/narrate-close` and `/narration-close` entry points remain available.

### Smooth Camera

- Per-client configurable pan/zoom smoothing, wheel zoom, right-drag panning, and optional throw/coast behavior.
- **Director Camera** broadcasts, spotlight/framing, camera paths, and OBS recording presentation are future/deferred work, not included in v0.2.0.

## Installation / updating

1. Keep a backup of the existing Cinematics module and your Foundry world settings before installing.
2. Extract `zft-cinematics-v0.2.0.zip` under the Foundry **User Data** `modules/` directory, with **one** `zft-cinematics/` folder and the manifest at `Data/modules/zft-cinematics/module.json`.
3. Replace **only ZFT Cinematics** files. **Do not delete, replace, reinstall, or overwrite** `Data/modules/zft-narration-library/packs/` or the companion's graphics/audio directories; those contain user data. Updating Cinematics does not require reinstalling the library.
4. Hard-refresh (`Ctrl+F5`) both GM and player browsers. If Foundry still shows an old module version after the manifest change, return to Setup or restart Foundry to reload package metadata. A server restart is not the default for routine JS/CSS updates.
5. Enable ZFT Tools, ZFT Cinematics, and (for saved passage/media features) ZFT Narration Library in the world. Enable libWrapper to use automatic native scene transitions.

Rollback: restore the last accepted Cinematics folder and refresh clients; preserve the Narration Library's mutable content separately.

## Validation and scope

**Foundry V13 live acceptance on 2026-10-15: 9 PASS / 0 FAIL / 0 NOT TESTED** on `v0.2.0-dev.25`, covering explicit GM scroll start, synchronized speed/pause/restart, player override/rejoin, Back to Editor shared close and music stop, preserved drafts, republishing, private Preview, and narration fades/audio/textures/Save/Load. The stable v0.2.0 promotion changes version strings and documentation only; the accepted runtime behavior is retained.

This acceptance specifically covers the Narrate behavior above; it is **not** a fresh full regression of every scene transition and Smooth Camera combination. Foundry V14 has not been tested. See `docs/NARRATE-DEV25-TESTING.md` for the acceptance checklist, `CHANGELOG.md` for release notes, and the GitHub `ROADMAP.md` for future features.

## License

MIT. See `LICENSE`.
