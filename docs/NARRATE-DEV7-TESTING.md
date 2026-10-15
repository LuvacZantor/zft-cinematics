# Narrate dev.7 | Toolbar Layout and Image Controls

Target: Foundry VTT V13 Build 351. V14 unverified. Local browser tests are not a substitute for a GM/player test.

## Changes from dev.6

1. First toolbar row: Font, Size, Bold, Italic, Underline, text alignment, Clear Format, HTML Source.
2. Second toolbar row: Images label, Upload, Browse, Library, selected image width and alignment, Remove image.
3. Library moved out of the editor heading. Image-only controls stay disabled until an existing editor image is clicked.
4. Remove deletes only the image element from the current draft. It never deletes managed files from Foundry.

## Live verification

- [ ] Open ZFT Tools > Narrate. Confirm two distinctly styled rows and no image controls in the text row.
- [ ] With no image selected, ensure image width/alignment/Remove are disabled, but Upload/Browse/Library work.
- [ ] Select a placed image. Verify width selector reflects 25/50/75/100%, and changing it resizes the selected image.
- [ ] Align left, center and right. Verify visual alignment and selected-state highlighting.
- [ ] Remove the selected image. Verify only the image in this draft disappears, image controls disable, and the stored library file remains available.
- [ ] Open Graphics Library from the second row; insert a previously uploaded asset. Verify no new upload and it lands at the editor caret.
- [ ] Resize the dialog narrower. Confirm the image row wraps within its own row without spilling into the text toolbar; Narrate/Cancel remain accessible.
- [ ] Confirm Enter inserts a paragraph, Shift+Enter a soft break, and only the Narrate button sends.
- [ ] Confirm HTML source, rich text, and Markdown paste still work.
- [ ] Narrate an image and check GM and player overlays, optional chat posting, and timed dismissal.
- [ ] Smoke-test scene transition effects, splash and Smooth Camera as unchanged features.

No repository writes or release promotion have been performed.
