# Contributing

Please open an issue for a bug or proposed feature, or submit a focused pull request.
Include your browser and application build, reproduction steps, expected behavior,
and a minimal **synthetic** example. Never share personal diary files or photos.

## Development

Use Node.js 20 or later. Run `npm start` and open `http://127.0.0.1:4327`.
Edit `public/` and the shared data modules; do not hand-edit generated HTML.
The development page and standalone build use these same sources.

Run `npm test`, `npm run build:static`, and `npm run audit`.
For browser checks, install Playwright as described in the README, then run
`npm run test:ui` and `npm run test:release`.
Keep English and Chinese behavior aligned. Describe data-format changes and
verify old supported files still load without losing information.

## Release process

Application releases use semantic versions such as `v0.1.0` in `package.json`.
Automatic HTML build numbers and the Markdown format version are independent.
After validation, run `npm run release:prepare`. Upload the files listed in
`release/v0.1.0/` to the matching GitHub Release. Tag the reviewed source commit.
Do not publish local data, private screenshots, or `.local-private/`.
