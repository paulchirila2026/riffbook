# Third-party components

Riffbook (GPL-3.0) includes the following components. Each keeps its own license; the license texts are stored next to the files.

## alphaTab 1.8.4 — MPL-2.0

- Files: `lib/alphatab/alphaTab.min.js`, `lib/alphatab/font/`, `lib/alphatab/soundfont/`
- Copyright © Daniel Kuschny and Contributors — https://github.com/CoderLine/alphaTab
- License: Mozilla Public License 2.0 — `lib/alphatab/LICENSE`
- The original source code of this version is available at https://github.com/CoderLine/alphaTab/tree/v1.8.4

### Changes made to `alphaTab.min.js`

The file distributed here is modified. The changes (made directly in the minified file) are:

1. **`loadedMidiInfo` getter** — fixed an endless self-reference (`return this.loadedMidiInfo` → returns the stored field).
2. **Re-highlighting a selection after rendering** — wrapped in `try/catch`; a selection that belongs to a previous song is dropped instead of throwing.
3. **Results of an old render** (`postRenderFinished` arriving after another song was opened) — wrapped in `try/catch` and ignored.
4. **One shared audio context** — the web-audio output reuses one `AudioContext` (`globalThis.__rbCtx`) instead of creating one per player, so that two players (song + preview) work on iPhone.
5. **“rendered by alphaTab” footer** — not drawn.

## GeneralUser GS 2.0.3 — sound bank

- Files: `lib/sounds/gu-*.sfp` (the original `.sf2` split into pieces under 5 MB), `lib/sounds/generaluser.json`
- © S. Christian Collins — https://schristiancollins.com/generaluser
- License: `lib/sounds/GeneralUser-GS-LICENSE.txt` (free use and redistribution)

## SONiVOX EAS sound bank (light sounds) — Apache-2.0

- File: `lib/alphatab/soundfont/sonivox.sf2` (shipped with alphaTab)
- © 2004–2006 Sonic Network Inc. — `lib/alphatab/soundfont/LICENSE`

## Bravura music font — SIL Open Font License 1.1

- Files: `lib/alphatab/font/Bravura.*` (shipped with alphaTab)
- © Steinberg Media Technologies GmbH — `lib/alphatab/font/Bravura-OFL.txt`

## Barlow, Barlow Condensed — SIL Open Font License 1.1

- Files: `fonts/barlow-*.woff2`, `fonts/barlow-condensed-*.woff2`
- © 2017 The Barlow Project Authors — `fonts/LICENSE-Barlow.txt`, `fonts/LICENSE-Barlow-Condensed.txt`

## JetBrains Mono — SIL Open Font License 1.1

- Files: `fonts/jetbrains-mono-*.woff2`
- © 2020 The JetBrains Mono Project Authors — `fonts/LICENSE-JetBrains-Mono.txt`
