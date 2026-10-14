# Narrate dev.14 - GM controls outside the narration card

## Scope

- Preview and published narration cards contain only title/content. The GM-only controls and Preview indicator are separate sibling elements.
- GM controls float below the card when there is room; when a card is near the bottom of the viewport (e.g. Subtitle), controls move above the card. The card remains centered/positioned identically for GM and players.
- Clicking Save opens the existing Save As browser, Back restores editor, Publish sends once, Close dismisses. All Narration Library features are unchanged.

## Live Foundry V13 checklist

1. Open Narrate and prepare a styled passage with an illustration. Click **Preview (GM Only)**. Expect a narration card with **no GM buttons or preview heading inside**. Expect a separate dark toolbar underneath with GM Preview, Back, Save, Publish, Close.
2. Click **Back to Editor**, change formatting, preview again. Expect formatted draft intact.
3. Click **Publish**. On GM, expect the same size narration card with a separate Save / Close toolbar. On a separate player client, expect **only** the card, without GM controls.
4. Compare GM preview and player published card for typography, image sizing, card width/height, and central position.
5. Preview and Publish a **Subtitle** (bottom-positioned) and a long/scrolling passage. Expect toolbar to move above card if there is no room below and not affect card layout.
6. Resize the window narrow/wide, repeat Save to Library and Close Narration, check no button obstructs text or disappears off-screen.

## Validation

Local browser/mock checks do not verify Foundry V13 or V14. These require separate live testing.

## Rollback

Reinstall the previously working `zft-cinematics-v0.2.0-dev.13.zip` if needed. No library/compendium migrations are performed.
