# Release verification — 22 October 2026

- Production build: 16 original tool routes, 3 information pages, custom 404.
- Node suite: 7 tests covering dimension validation, bounded encoding search, impossible limits, PNG behavior, every internal link, metadata uniqueness and JSON-LD parsing.
- Chromium real Canvas suite: 18 passed, 0 failed. Covered 20/50/100/200 KB high-detail images, BCS photo/signature, SAT, UNAM, Lok Sewa, JAMB, Brazil, NTA and Indian postcard settings; impossible exact limits; malformed JPG/PDF rejection; WebP and PNG outputs.
- UI file chooser → 20 KB compression → actual download: 2,536,820-byte noise image became a valid 15,152-byte JPEG at 1440 × 960.
- UI BCS signature selection: valid 300 × 80 output, 2.29 KB.
- UI PNG → JPEG download: verified JPEG encoding, 800 × 600 dimensions and white RGB (255,255,255) at formerly transparent corner.
- Responsive preview at 390px and desktop; light/dark controls and search reviewed.

These are representative Chromium checks, not a guarantee of behavior on every browser or acceptance by any application portal. Search rankings were not measured after release.
