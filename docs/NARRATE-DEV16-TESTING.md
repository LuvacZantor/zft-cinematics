# ZFT Cinematics Narrate | 0.2.0-dev.16

Local test build for Foundry V13 Build 351. Browser simulation does not replace a live Foundry test. V14 remains unverified.

## Change summary

- **Saved library deletion:** Trash button on each saved Narration, checkboxes and Delete Selected for batch deletion. Only the GM may delete, and the `ZFT Narrations` compendium must be unlocked. Each delete requires confirmation. The shared graphics files are **never** deleted by this operation. If a graphic loses its last saved reference, the existing Keep/live use/seven-day retention policies still govern when it appears in a manual cleanup review.
- **Auto-scroll speeds:** Very Slow 8, Slow 15, Normal 25, Fast 45, Very Fast 70 pixels per second, or Custom 1–120 px/sec. Chosen speed persists in saved narration. GM can fine-tune the runtime speed using the number field in the *separate GM controls tray* during Preview or publication.
- **Scrolling mode:** `Independent` remains the default. `Follow GM` broadcasts only temporary, throttled socket progress updates; it does not continuously modify world settings. GM's manual scrollbar/wheel/keyboard input is followed just like automatic scrolling. Each player can interrupt and later click **Follow GM** to rejoin. Relative progress rather than pixel coordinates helps across different screen sizes; text may wrap differently.
- **Narration transitions:** None, Fade In, Fade In / Out (default), Fade Through Black, Dissolve, with adjustable duration 0.25–5 seconds. Preview and published views use the same effect. Reduced-motion settings disable transition animation.
- **Unchanged deliberately:** Pause/Resume/Follow GM button retains the **dev.15 position** (right:20px, bottom:20px, with the same responsive offsets). GM Preview/Publish controls remain a separate fixed-bottom tray. Star Wars-style opening crawl is not in this build.

## Install

1. Back up the current `zft-cinematics` module and preserve your known-good `dev.15` ZIP for rollback.
2. Replace **only Cinematics** with `zft-cinematics-v0.2.0-dev.16.zip` and restart Foundry if necessary.
3. Leave `zft-narration-library` at `v0.1.0-dev.3`. **Do not delete/reinstall this data-containing library module.**
4. Use Ctrl+F5 in all open browsers to refresh client scripts/CSS.

## Live Foundry V13 verification

1. **Library backup first.** Unlock the ZFT Narrations compendium, save two disposable test passages, open **Load**, select both, choose **Delete Selected**, and confirm. Verify only the test passages disappear. Test individual Trash and Cancel. Lock the compendium, reopen Load, and confirm destructive controls are absent. Confirm the source graphics remain on disk.
2. **Custom speed persistence.** Write a long passage, choose Custom `21 px/sec`, Save, Load and confirm Custom `21` is restored. Try each of the five presets. Observe scroll movement at Normal and Custom.
3. **GM follow test requires a second browser.** Publish the long passage with **Follow GM**. Confirm the player follows the GM's automatic scrolling. Pause on the GM, scroll the text *manually* with wheel or scrollbar, and confirm the player follows.
4. **Player override.** On the player browser, scroll the passage manually. The label should change to **Follow GM**, and the text should stay under the player's control. Click **Follow GM** to rejoin the GM's current position. A second player, if available, should remain following throughout.
5. **Return to Independent.** Publish in Independent mode. Pause or scroll on player browser; the GM's movement must not affect the player. Confirm the Pause/Resume button is in **exactly the same position** as dev.15.
6. **Preview transitions.** Test None, Fade In, Fade In / Out, Fade Through Black, and Dissolve at 1 second. Compare Preview to Publish. Close a Fade In / Out narration and confirm the content remains visible during fade-out, without flashing to an empty card.
7. **GM runtime speed.** During Preview and Published narration, change the GM tray's Speed number. In Follow GM, confirm followers receive the changed movement pace. Save and reload a test passage and inspect selected settings.
8. **Regression.** Check Preview → Back → Publish, Save As, nested folders, long text/images, scrolling with a timed dismissal, and graphics cleanup safeguards. GM controls must never appear on a player browser.

**Important:** Timed dismissal remains independent of scroll position and user pauses. Use Manual (GM closes) for long passages. `Follow GM` is best-effort position synchronization, not guaranteed matching line-by-line text across differing viewport sizes.

## Automated tests

- Node JavaScript syntax: pass.
- Existing dev.15 browser preview/publish/save/graphics regression suite: pass.
- Existing independent autoscroll/override/restart/geometry test: pass.
- Two-browser Follow GM test: pass with simulated Foundry state and sockets, including GM manual wheel/scrollbar follow, player override and rejoin.
- Saved metadata + multi-delete + cancel, and delayed fade-out cleanup: pass in browser simulation.

No GitHub repository writes are part of this local build.
