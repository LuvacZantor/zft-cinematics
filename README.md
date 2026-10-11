# ZFT Cinematics

Cinematic scene transitions, narration, and optional smooth local camera controls for Foundry VTT.

## Stable release: v0.1.0

Designed for Foundry VTT V13 Build 351. Foundry V14 has not been separately verified. Features have been exercised in live V13 development testing; complete cross-client and compatibility testing is ongoing.

### Scene transitions and presentation

- Automatic fade and directional wipe on native scene activation.
- GM one-shot choices through ZFT Tools: Fade, Wipe Left, Wipe Right, Wipe Up, Wipe Down. The saved default returns afterward.
- Transition splash presentations: black, centered logo, single image/video, random media from a folder (without immediate repetition where possible), full-screen media framing, and optional brand/logo overlay.
- GM/player synchronized overlays, configurable defaults and duration, and supported destination-scene overrides.

### Narration

- Narrate action in ZFT Tools, full-screen persistent overlay, and narration chat cards.
- Commands: `/narrate`, `/narration`, `/narrate-close`, `/narration-close`.
- GM-controlled close; narration persists across browser refresh and remains coordinated with scene transitions.
- Disable the previous standalone Narrate Only module to prevent duplicate listeners.

### Smooth Camera

- Optional per-client smooth mouse-wheel zoom and Photoshop-style direct right-drag pan.
- Optional release throw/coast with friction-based stop, without spring-back.
- Configurable duration (default **500 ms** for new client settings), wheel easing, and per-user controls.
- Duration affects wheel zoom and maximum throw time; easing affects wheel zoom only. Holding right-drag tracks natively and directly.
- No routine drag/throw diagnostic logging or counters in the settings UI.

## Requirements and compatibility

- Foundry VTT V13 Build 351 target; V14 not verified.
- [ZFT Tools](https://github.com/LuvacZantor/zft-tools) must be installed and enabled (integration validated against its Dev 7 line).
- An active **libWrapper** is needed to intercept Foundry's normal Scene Activate workflow for automatic transitions. Without it, normal Foundry scene activation is preserved without automatic Cinematics effects.
- Existing local Smooth Camera preferences are preserved when upgrading; the new 500 ms default does not overwrite saved choices.

## Installation

Extract the distribution so that `module.json` is at `Data/modules/zft-cinematics/module.json`. Enable ZFT Tools and ZFT Cinematics in the world, enable libWrapper for automatic native transitions, and hard-refresh the browser. Restart Foundry if a changed manifest or module assets are not loaded.

## Brief verification checklist

1. GM: select an automatic Fade, activate another scene using Foundry's native **Activate**; verify GM and player cover/reveal.
2. GM: choose a one-shot Wipe and activate a different scene; confirm next activation resumes the saved default.
3. GM/player: show narration, refresh the player browser, and dismiss narration; verify overlay and chat-card behavior.
4. GM/player: use smooth wheel zoom, native right-drag, fast drag/release throw, and pause-before-release; verify no spring or unwanted momentum. Disable Smooth Camera to compare with native controls.
5. Confirm no unexpected warnings or conflicts with other camera modules; V14 support should be tested separately.

See [CHANGELOG.md](CHANGELOG.md), [ROADMAP.md](ROADMAP.md), and [development history](docs/DEVELOPMENT_HISTORY.md).

## Licensing

MIT. See `LICENSE` in the repository.
