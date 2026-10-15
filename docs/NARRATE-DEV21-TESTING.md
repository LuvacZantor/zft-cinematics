# ZFT Cinematics Narrate | v0.2.0-dev.21 | Foundry V13 acceptance tests

Target: **Foundry VTT V13 Build 351**. **V14 is unverified**. This build is based on the user-accepted dev.20 Narrate baseline (9/9 V13 live tests). No GitHub push is included.

## Installation / required setup

1. Back up `Data/modules/zft-cinematics/` and **all** of `Data/modules/zft-narration-library/`, including `packs/` and `assets/graphics/`. The library is mutable saved data; do not delete it.
2. Extract `zft-cinematics-v0.2.0-dev.21.zip` into Foundry `Data/modules/`, replacing Cinematics only. Keep **ZFT Narration Library v0.1.0-dev.3** installed and enabled.
3. Restart Foundry; hard-refresh **both** GM and player browsers (**Ctrl+F5**). Enable the Narration Library and unlock the `ZFT Narrations` pack before uploading files or saving passages.
4. Use two separate clients (GM and Player) in the same V13 world; ideally test with a long 3,000+ character passage that overflows the card. Publish with manual dismissal to avoid cutting off long passages.
5. Use a short, non-copyright-sensitive MP3/OGG/WAV sample up to 25 MB. In the Narrate editor expand **Soundtrack**; click **Upload**. The file should appear under `modules/zft-narration-library/assets/audio/`.

## Live test cases

Mark **Pass / Fail / Not Tested**, with notes. Return the checklist in the chat. The build cannot be accepted from browser simulations alone.

| # | Test | Expected result |
|---|---|---|
| 1 | GM publishes a long narration, scroll mode **Follow GM**, starts manual scrolling | Player follows GM's current progress. Existing Pause/Resume position remains unchanged. |
| 2 | While the scroll is moving, GM changes speed with slider, +/-5, and number input | GM immediately speeds up/slows down without jumping to top; following player keeps pace; no republish required. |
| 3 | Player scrolls manually, GM adjusts speed, player clicks Follow GM | Player override remains independent until Follow GM is clicked. |
| 4 | GM selects an audio file in Soundtrack using **Upload** and enables Loop | Upload succeeds into library assets/audio; selecting existing uploaded audio also works. |
| 5 | GM **Previews** a narrated passage with an attached soundtrack | GM hears audio; players see/hear nothing new; Back preserves text and soundtrack settings. |
| 6 | GM **Publishes** with auto start and loop enabled | GM and player hear the soundtrack; its looping continues; narration visuals/scrolling still work. If player sound is blocked, a player click on Play Audio starts it. |
| 7 | GM adjusts sound volume, pauses, resumes, and stops | Connected players hear matching shared playback/volume commands. Sound does not restart after Stop until the GM presses Play. |
| 8 | Player changes local volume and mutes/unmutes | Other clients are unaffected; GM commands do not undo a player's mute. |
| 9 | GM selects **manual soundtrack start**, then publishes | No soundtrack starts until the GM presses Play Audio. |
| 10 | GM enables audio fade, then closes or replaces the narration | Sound fades out and stops; no prior track continues underneath the next narration. |
| 11 | Save a passage with soundtrack and custom scroll speed; load it again | Audio path, loop, fade, volume, start mode, and scroll speed restore. New blank Narrate drafts have no soundtrack by default. |
| 12 | With no audio attached, Preview/Publish a narration | Nothing attempts to play; no soundtrack controls appear. |
| 13 | Regression: published player color/highlight/texture, fades, Back to Editor, Save/Load | All remain functional as in the validated dev.20 build. |
| 14 | A player refreshes/rejoins while an active narration is showing | Active audio begins or catches up with the GM's current pause/stop/volume status, subject to browser autoplay rules. |

## Known constraints and safety notes

- Browser autoplay policies can block sound until the player clicks or interacts with the Foundry page. The module shows a Play Audio control; it cannot override browser permissions.
- The module plays **one soundtrack per narration**, independently of Foundry playlists. It does **not** stop or duck other Foundry music. Playlist interactions are a possible future feature, not implemented here.
- Player local volume is stored per client. GM soundtrack control messages are transient; a refreshed/late player requests a current playback status from the GM. In exceptional network interruptions, check the player sound controls and retry.
- Audio files are **not deleted automatically**. References to uploaded files are saved in the narration compendium. Back up the library `assets/audio/` directory alongside `packs/` before a server move. The manual graphics cleanup utility never touches these audio files.
- Manual narration dismissal is recommended for passages with lengthy text; timed dismissal can close a narration while someone is still reading.
- Hard-refresh both GM **and player** browsers after each test build to avoid stale JavaScript/CSS producing misleading failures.
- Report failures as Pass/Fail/Not Tested with the action taken, GM vs player browser, and any F12 Console errors. Do not assume failures are fixed until reproduced and retested in live V13.
