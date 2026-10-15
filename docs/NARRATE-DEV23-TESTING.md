# ZFT Cinematics Narrate | v0.2.0-dev.23 | Foundry V13 test

Scope: live GM scroll-speed synchronization on player clients. Preserve working dev.22 audio and dev.20 narration features. Development test build; V14 unverified.

## Efficient install

1. Keep a backup of dev.22 Cinematics and the full Narration Library directory (library stores persistent data).
2. Replace only `Data/modules/zft-cinematics/` with this ZIP's `zft-cinematics/` contents. Do not replace the Narration Library (v0.1.0-dev.3).
3. **Ctrl+F5 in BOTH GM and player clients**. Server restart is not the default. Restart only if stale module metadata/code is demonstrably still being served after client refresh.
4. Use a sufficiently long passage that overflows **both** clients. Publish in **Follow GM** mode, manual GM dismissal, and open the player session in a different-sized browser window.

## Pass / Fail / Not Tested

1. GM/manual scrollbar movement tracks accurately on player client.
2. In Follow GM, both start paused; GM uses Resume Scroll and both GM/player text start advancing (without manual wheel movement).
3. While scrolling automatically, change GM live speed from 10 to 80 px/sec. Player movement should speed up on the same passage without position reset or losing Follow GM.
4. Reduce speed from 80 to 8 px/sec. Player movement slows without resetting.
5. GM Pause stops both; Resume continues from current position.
6. Player wheel/drag interrupts Follow GM, leaving GM/other players unaffected; player's Follow GM rejoin catches up.
7. After several rapid speed changes, the player should **remain following** until they explicitly interrupt.
8. With different player viewport sizes, progress remains approximately aligned.
9. Audio Pause/Resume preserves timestamp; Stop/Play restarts audio. Player playback, looping, volume and local mute are unchanged.
10. Existing Preview, Publish, fades, appearance defaults, saved narration, Back to Editor and graphics operations still work.

For failures, provide GM/player status, which speed was selected, and F12 Console errors. Do not start another build or push GitHub unless explicitly authorized.
