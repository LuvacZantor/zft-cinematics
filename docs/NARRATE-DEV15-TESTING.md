# Narrate dev.15 - fixed-bottom GM controls and interruptible auto-scroll

## What changed

- GM controls (Preview and Published) stay fixed 20px from the bottom of the viewport, centered horizontally, independent of the narration card.
- The GM control tray shrinks to fit its buttons. The narration card's height is capped to leave clearance; long narration scrolls inside the card.
- Overflowing narration automatically scrolls after ~1.8 seconds at a configurable speed (Slow 15px/s, Normal 25px/s, Fast 45px/s).
- Each client has independent local scroll progress and pause/resume controls. Wheel, scrollbar drag, touch/swipe, and keyboard scrolling interrupt automatic scrolling. It never resumes without the local user's explicit Resume action.
- Pausing preserves the current position. At the end of the document, the button becomes Restart Scroll.
- Small posts do not scroll or show scrolling controls. Reduced-motion preference defaults long posts to manual scrolling.
- Speed is included with saved narration and shared presentation metadata; older library entries default to Normal.
- Timer behavior is otherwise unchanged; use Manual (GM closes) for lengthy narrations because timed dismissal can close them before individual players finish reading.

## Foundry V13 verification

1. Replace Cinematics dev.14 with dev.15; refresh the Foundry client using Ctrl+F5. Leave Narration Library dev.3 installed.
2. Preview a short passage. Ensure the GM tray is viewport-fixed ~20px above the bottom, not coupled to the card. Scroll controls should remain hidden.
3. Preview a long passage (several screens of content and at least one large image). It must scroll **inside** the card, after a brief delay; the GM tray must remain fixed at the bottom and never cover the scrollable text.
4. Mouse wheel, drag the scrollbar, and select Pause. Automatic motion must stop immediately and stay stopped; click Resume to continue. Test Restart Scroll when the bottom is reached.
5. Use Slow and Fast settings, confirm different speeds, then Save/Load through the library and check the saved speed persists.
6. Publish to a separate player browser. Preview must remain GM-only. Publish should scroll for both, but stopping and resuming the player must not change the GM's position or mode. A second player should likewise be independent.
7. Test with a short subtitle and a very long subtitle: the controls should remain outside the card and the bottom toolbar must stay fixed; long content may scroll.
8. For reduced motion on a player OS/browser, confirm auto-scroll does not start, but Resume can start it explicitly.
9. Open/close/save from Preview and Published, verify rich HTML/images, folders, seven-day graphics protection, Close Narration, and scene transitions still work.
10. Compare client Console output when scrolling or publishing. Record any exceptions and Foundry build number.

### Caution

Timed dismissal remains an absolute world expiration; it can interrupt slower readers. Use Manual (GM closes) until a separate per-reader timeout policy is designed and tested.

Local browser/syntax tests are not a substitute for live Foundry verification. ZFT Narration Library and all other Cinematics features remain unchanged.
