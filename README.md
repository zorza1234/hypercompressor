# HyperCompressor

Static, browser-local image compressor and resizer, deployed with Vercel.

## Develop

Requires Node.js 20 or later. There are no runtime or build dependencies.

```
npm run build
npm test
npm run dev
```

Open http://localhost:4173. Development-only `/__qa` runs real Canvas regression checks and includes a 390px responsive preview. It is not included in the public build.

## Edit

- `scripts/pages.mjs`: page copy, routes and editable application presets.
- `scripts/build.mjs`: shared HTML template, metadata and sitemap.
- `assets/engine.js`: decoding, dimensions, JPEG/WebP quality search and size fallback.
- `assets/app.js`: upload, drop, settings, preview, validation and download UI.
- `assets/site.css`: responsive light/dark visual styles.
- `assets/site.js`: theme and optional analytics preferences.

Root HTML files are generated for easy source review; edit the source modules, then run the build. Vercel serves only `public/`, which is regenerated from scratch. Source code, tests and dependencies are not public assets.

## Behavior

Maximum size uses decimal KB (1,000 bytes), conservatively satisfying portals using either KB interpretation. Exact requested dimensions never silently shrink; if encoding cannot satisfy both limits, the tool reports a conflict. PNG does not use lossy quality controls. A result below an optional minimum raises a warning rather than padding bytes. Input is limited to JPG, PNG and WebP up to 20 MiB, 24 megapixels and 8,000 pixels per side. Images are never uploaded by the application.

Application presets retain the previous site's useful starting dimensions, but are explicitly editable and not represented as verified current agency requirements. SAT and UNAM pages are in Spanish. All 16 original tool URLs remain available.

Google Search Console verification and the existing GA4 property are retained. Analytics load only after opt-in and record tool events without filenames or image contents.
