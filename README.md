# ZFT Cinematics

Cinematic scene transitions and presentation tools for **Foundry VTT**, part of Zantor's Realms Foundry Tools (ZFT).

## Vision

Give the GM reliable visual presentation tools without requiring players to manage effects or breaking the flow of a session.

## Features

### Scene transitions

- Smooth scene fades and directional wipes.
- Planned additional iris, radial, clock, and other wipes.
- Adjustable effect duration.
- Optional image or looping-video splash screens.
- Scene-specific presentation overrides.
- GM-controlled transitions synchronized with connected players.

### Cinematic camera (planned)

- Smooth pans, zooms, and focus movements.
- Focus on tokens, groups, or specific map positions.
- GM Spotlight to temporarily focus connected players on a location.
- Saved camera positions and reusable presets.

### Recording Display (planned)

- Explicitly selected recording account for OBS or other capture software.
- Automatic camera framing for visible player characters.
- Optional GM camera following with scene-specific overrides.
- Independent recording camera, without forcing other players' views.
- Smooth camera changes and transitions.

### Controls

- Canvas tools grouped under the companion **ZFT Tools** toolbar.
- Optional scene right-click shortcut.
- GM controls and scene-specific settings.

## Development status

**In development / prerelease.** Early fade and directional-transition tests are underway. The implementation is not yet a production release.

- Latest development line: `0.1.0-dev.x`
- Target: Foundry VTT V13 Build 351
- V14: planned, not yet live verified
- Companion module: [ZFT Tools](https://github.com/LuvacZantor/zft-tools)
- License: MIT

## Repository conventions

- `main` is the default branch.
- Development builds are named `0.1.0-dev.N`; stable versions receive GitHub tags and Releases after verification.
- Module source belongs at the repository root (`module.json`, `scripts/`, `styles/`).
- Distributable ZIPs contain one top-level `zft-cinematics/` folder, not nested folders.

## Related ZFT projects

- [ZFT Tools](https://github.com/LuvacZantor/zft-tools)
- [ZFT Turn Time](https://github.com/LuvacZantor/zft-turn-time)
