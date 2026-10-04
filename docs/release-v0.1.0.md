# v0.1.0 release validation

Checked on 2026-10-04 with Windows, Node.js 24.16.0 and headless Microsoft Edge.

## Version mapping

- Formal release: **v0.1.0** (`package.json`).
- Automatic build: **4** (`dist/releases.json`).
- Markdown archive format: **4**, independently versioned.
- `release/v0.1.0/colorbardiary_v0.1.0.html` is a byte-for-byte copy of automatic build 4.
- Development and standalone pages share `public/` and the same data core.

## Results

| Check | Result |
| --- | --- |
| Core validation, migration and Markdown round trips | 8 tests passed |
| Fresh browser, default English, Chinese switching and unchanged diary text | Passed |
| Offline standalone loading without HTTP requests | Passed |
| Write a note to a temporary disk file and reopen it | Passed |
| Download a dated backup and verify its data | Passed |
| Restore missing dates; preserve existing dates | Passed |
| Suppress restored reminders whose scheduled time is in the past | Passed |
| Select synthetic background, adjust brightness and reset to black | Passed |
| Read a synthetic complete legacy v3 Markdown file | Passed |
| Source paths and common credential/private-path patterns | Passed |
| Original test-version source hashes | Unchanged |
| Screenshots | Synthetic diary only; English screenshot visually checked |

The offline test uses real temporary disk files but substitutes native file-picker
and permission dialogs. Real OS permission prompts, Safari, mobile browsers,
cloud synchronization conflicts and long-duration reminder timing were not certified.
This is an initial release, not a guarantee that every browser is supported.

## Publication status

- Source repository: https://github.com/Liangxiuzuo/colorbar-diary
- Release location: https://github.com/Liangxiuzuo/colorbar-diary/releases/tag/v0.1.0
- Release assets: standalone HTML, quick-start guide, MIT license, build metadata and SHA-256 checksums.

## Privacy boundaries

Personal diaries, local image assets, backup files and local tooling are excluded.
Local working notes are not a substitute for a clean publication file list.
Use the reviewed source paths and the generated release files, not the entire
working directory, when uploading.
