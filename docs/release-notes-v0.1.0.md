# Colorbar Diary v0.1.0

**One HTML interface. One Markdown diary.**

The initial release provides an offline calendar-based diary with colored tags,
hierarchical entries and a user-owned Markdown main file. English is the default;
Chinese is available from the language selector.

## Download and use

Download `colorbardiary_v0.1.0.html` and open it in desktop Chrome or Edge.
Choose or create a Markdown main file and grant file access. No installation,
Node.js or external CDN is needed for standalone use.

`QUICKSTART.md` explains file operations. `SHA256SUMS.txt` contains SHA-256 hashes
for the HTML, quick-start guide and MIT license. Automatic build: 4.

## Data and limitations

- Backup downloads a dated Markdown snapshot.
- Restore adds missing dates and skips existing dates in full.
- Keep the complete Colorbar Diary Markdown structure; arbitrary Markdown files
  are not a supported replacement for a full diary archive.
- Background photos stay outside the Markdown diary.
- Reminders require a running page and enabled audio. Past reminders are not replayed.
- Browser permission prompts may require reconnection. Safari and mobile are unverified.

Released under the MIT License. Report issues with synthetic examples only.
