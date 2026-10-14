# ZFT Cinematics v0.2.0-dev.20 — Foundry V13 testing

This build is based on dev.19. Only appearance behavior and appearance UI were modified.
All dev.19 GM scrolling, fades, Back to Editor, compendium functions, and Pause/Resume placement are preserved.

## Installation

1. Back up the installed Cinematics module and the **entire** zft-narration-library module folder (including packs and assets).
2. Install Cinematics dev.20 without changing zft-narration-library dev.3.
3. Restart Foundry, then **Ctrl+F5 on both the GM AND player browsers**.
4. Test with two clients in the same active world; changing the GM browser alone leaves the player on stale JavaScript/CSS.

## Results (mark Pass, Fail, or Not Tested)

- [ ] Select a texture from Appearance > Select from Library by clicking its thumbnail, then Use as Background. Expected: selection outline, filename, and correct image path; no cleanup or Keep controls.
- [ ] Browse Foundry and Upload a texture. Expected: images appear as card background in Preview AND on player after Publish.
- [ ] Set default text color and card background. Expected: GM Preview and published player overlay match.
- [ ] Select a phrase and choose text color; highlight another phrase. Expected: rich editor, Preview, and player view use the colors.
- [ ] Change tint, darkness, Tile/Cover/Contain, backdrop color, and opacity. Expected: player follows GM Preview styling.
- [ ] Save as Default, close editor, reopen NEW narration. Expected: saved default appearance is prefilled. Restore Default reapplies it; Reset to Original only modifies the current draft.
- [ ] Save narration to the shared library and load it. Expected: saved passage appearance overrides new-draft defaults.
- [ ] Publish and Back to Editor. Expected: active player post is undisturbed until republish.
- [ ] GM manual scroll, player Follow GM interrupt/rejoin, Pause/Resume. Expected: same as dev.19.
- [ ] Fade In, Dissolve, Fade Out on players. Expected: same as dev.19.
- [ ] Graphics Library management Keep/cleanup behavior unchanged. Narration Library graphics never auto-delete.

Please report the exact PASS/FAIL status and the first F12 console error if any test fails. Do not assume a regression until *both* clients refreshed.

## Limitations

Local browser simulations are not live Foundry verification. This build has not been confirmed on Foundry V14.
