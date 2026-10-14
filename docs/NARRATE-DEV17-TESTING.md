# ZFT Cinematics Narrate | 0.2.0-dev.17

Corrective local Foundry V13 test build from `0.2.0-dev.16`. V14 not verified.

## Scope: two live-reported problems

1. **Follow GM starts paused**, on both the publishing GM and connected players. The GM moves their narration with wheel, scrollbar, or keyboard, and following players receive that relative position through temporary, throttled module socket events. GM may explicitly click **Resume Scroll** to start automatic scrolling for followers. Players retain independent wheel/drag/touch/keyboard override and **Follow GM** rejoin.
2. **Narration entrance transitions replay for every new published narration on every client**, even if the previous narration overlay is still active. Fade In, Fade In / Out, Fade Through Black, and Dissolve animate from their start for each new shared narration ID. Re-rendering the same narration does not restart the effect. Closing Fade In / Out retains the content until fade-out completes. Reduced-motion preferences still disable animation.

**Deliberately unchanged:** Pause/Resume control placement from dev.15, GM separate fixed-bottom controls, Save/Load/deletion/graphics retention, custom speeds, independent automatic scrolling, transition duration choices, and all scene/camera/splash functions. This corrective build does not implement the previously proposed `dev.17` editing/appearance features, which remain pending. Star Wars-style Crawl remains roadmap only.

## Install

1. Back up the installed `zft-cinematics` directory or retain the previous ZIP for rollback.
2. Replace *only* ZFT Cinematics with `zft-cinematics-v0.2.0-dev.17.zip` and restart Foundry if necessary.
3. Keep ZFT Narration Library v0.1.0-dev.3 and its data directory untouched.
4. Use Ctrl+F5 to refresh **every** client browser. Check browser console for `[ZFT] 🎙️ v0.2.0-dev.17`.

## Live test, Foundry V13 Build 351

1. With two browsers, one GM and one Player, Publish a sufficiently long narration using **Follow GM**. Both views must initially be at the top and not moving even after three seconds. The GM's button says **Resume Scroll**; the player's button says **Pause Follow**.
2. GM scrolls manually. Player must follow the GM's relative scroll progress without starting independent auto-scroll. Check mid-passage and at the bottom. Mouse wheel and scrollbar drag both work.
3. Player uses wheel to interrupt and can scroll independently. GM continues scrolling, but that player stays in control. Player clicks **Follow GM** and returns to the GM's current position.
4. GM clicks **Resume Scroll**. Both GM and following player move automatically. GM clicks **Pause Scroll**, and both stop. In Independent mode, the previous auto-scroll behavior remains after a brief delay.
5. Publish a short narration with **Fade In** and watch both browsers. While it is still visible, publish another narration with **Dissolve** and confirm the effect plays anew on the player, not just GM Preview. Repeat with Fade Through Black and Fade In / Out. On Fade In / Out, close and verify a graceful fade-out.
6. Test saved-narration Load, individual/batch Delete (using disposable test entries only), speed presets/Custom, Preview, Publish, and separate GM controls. Confirm Pause/Resume is *not* moved. Do not delete the Narration Library module or its asset directory.

**Note:** Browser or OS `prefers-reduced-motion: reduce` suppresses fades intentionally. Temporarily disable this accessibility setting when validating animated effects.

## Validation performed locally

- Node syntax: passed for module scripts.
- Existing dev.15-16 regression suite: passed for Preview, Publish, Back, Save/Load and graphics.
- Independent auto-scroll and reduced-motion suite: passed.
- Two-client browser socket simulation: passed for paused start, GM wheel/scroll synchronization, player override, Follow GM rejoin, explicit GM auto-scroll and Pause.
- Two-client browser fade simulation: passed for initial player Fade In, new-post Dissolve while overlay active, new-post Fade In, duplicate-render suppression and Fade In/Out close behavior.
- Saved compendium metadata and individual/batch deletion regression: passed.

These are simulated browser/Foundry tests, **not** verification on a live Foundry server. No GitHub writes.
