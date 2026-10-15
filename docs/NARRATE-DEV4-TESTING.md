# ZFT Cinematics: Narrate dev.4 test plan

Target: Foundry VTT V13 Build 351. Simulated/browser QA is not live V13 verification.

1. Open ZFT Tools > Narrate and paste a Markdown recap containing `## Heading`, `**bold**`, and `*italic*`. The markers should become formatted text inside the editor. Ordinary plain text paste must remain plain.
2. Narrate it as regular Narration; verify heading/bold/italic and compact paragraph spacing on GM and player clients, and in chat.
3. Verify default narration text fits more lines with a smaller font. Verify Location Title and Announcement retain dramatic styles.
4. Verify the Close Narration button is a readable emerald button and dismisses it for everyone.
5. Set Presentation to Subtitle, timed duration to 15 seconds; choose a Foundry-registered font, larger size, and right alignment. Cancel/close Narrate, reopen it, and verify the settings remain while the text is empty.
6. Resize and move the dialog, close and reopen. Verify position/size are preserved to the extent supported by the V13 Dialog API and viewport limits.
7. Submit narration using the saved font/size/alignment and verify both overlay and chat card reflect them on a player client.
8. Test `narrate("Hello")`, `/narrate`, `/narrate-close`, player narration permissions, 3-second dismissal, and interrupting a timer with a new narration.
9. Paste literal HTML and a malicious `<img onerror>` payload as plain text. Ensure no HTML executes. Missing/unregistered font names must be rejected.
10. Validate scene activation fade/wipe, splash/transition, and local Smooth Camera behavior unchanged.

No GitHub changes are associated with this local test ZIP.
