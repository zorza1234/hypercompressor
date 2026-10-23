# HEIC decoder

The WhatsApp DP maker ships the unmodified `src/lib/libheif.js` from
`heic-to` 1.6.6 (libheif 1.23.6), under LGPL-3.0. The build copies it from the
pinned npm dependency; no CDN is used. Its license is served at
`/assets/vendor/HEIC-LICENSE.txt` and the readable module is served at
`/assets/vendor/libheif.js`.

Source and build instructions: https://github.com/hoppergee/heic-to/tree/v1.6.6
and https://github.com/strukturag/libheif. The decoder can be replaced at the
same module URL with a compatible LGPL build. No changes were made to it.

The enhancement and framing implementation has no third-party dependencies.
