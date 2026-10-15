# Narrate Dev 3: Testing

Target: Foundry V13 Build 351. Local browser tests do not establish live compatibility.

1. GM: Open ZFT Tools > Narrate. Verify dark emerald dropdown lists, editor toolbar, and side-by-side Narrate/Cancel actions.
2. Check Font picker against Foundry's Configure Fonts menu. Fonts added through that menu should appear. Restart/refresh Foundry after configuring new fonts if necessary.
3. Type a passage, select words and choose a custom registered font. Send it; verify identical family on GM overlay, a second player browser, and the chat card.
4. Check fallback when a client cannot load a font; text must remain readable.
5. Verify bold, italic, underline, sizes, alignment, plain-text paste and clearing formatting.
6. Check 4 presentation styles and manual/timed closing; confirm expired timers never dismiss newer narration.
7. Test ordinary scene transitions and Smooth Camera to ensure no unexpected changes.

Note: Fonts only installed locally on one player's OS, or registered solely in an unrelated module without Foundry registration, may not be available to everyone. Use world-font files in Foundry for consistent rendering.
