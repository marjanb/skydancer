# Changelog

Embeds point at `@2`, which follows the newest `v2.x.x` tag, so everything
below reaches an existing embed as soon as it is tagged. This is the place to
look when a dancer starts looking different.

## v2.6.1 — 2026-11-18

- Customizer: an undo that steps back up to five changes. A slider drag counts
  as one, and Surprise me and Reset are each a single step.

## v2.6.0 — 2026-11-18

- A dancer fills with air when it first comes into view, and empties before it
  goes when the balloon is dismissed.
- `pattern` puts `rings` or a `spiral` on the body, in the accent colour.
- `href` gives a dancer somewhere to lead. A click opens it in a new tab, and
  it is a real link that can be tabbed to. Only `http`, `https`, `mailto` and
  `tel` are followed — anything else is ignored, since the destination can
  arrive from a page's templating or from a shared customizer link rather than
  from whoever wrote the embed.
- The eyes follow the pointer while it is over the dancer.
- Customizer: a reset, and a link you can send someone.

## v2.5.0 — 2026-11-18

- `paused` holds a dancer's pose without hiding it. A paused dancer still
  repaints when an attribute changes or the widget is resized; it simply has no
  loop of its own.
- A doubled pipe in `sign` is a literal pipe. Dividing phrases on a single pipe
  (v2.4.0) had made one impossible to write.
- Customizer: it can hand you a link to the dancer you built, rather than only
  saving it to your own browser, and the crowd size and its switch are boxed
  together.

## v2.4.0 — 2026-11-18

- Four more faces — `wink`, `joy`, `sleepy` and `angry` — alongside the first
  three. A `variety` crowd draws on all seven.
- `cheer()` sets a dancer off on demand, the same burst a poke gives it.
- **A `sign` divided by pipes becomes several phrases the dancer works
  through.** This changes an existing embed whose sign already contains a
  pipe: it now splits there. v2.5.0 added `||` as the way to write one.
- Leaving `color` or `accent` off the tag lets the page set them in CSS, with
  `--sky-dancer-color` and `--sky-dancer-accent`, so a dancer can follow a
  light and a dark scheme without the embed being rewritten.
- The canvas is marked as decoration, a sign's words are mirrored into a hidden
  element where a screen reader, the page's own find and a translator can reach
  them, and the balloon's dismiss button is a real button you can tab to.
- The head is flatter, and the stripes are quieter.
- **Fixed:** a deeply sagging dancer's outline broke where the body bowed over.
  The flattened head was being made by clipping, and the clip swallowed
  whatever part of the body curled past the tube's tip. The cap is painted now,
  so nothing is cut.

## v2.3.1 — 2026-11-17

- **Fixed:** the shading stripes stopped short of the rounded ends, leaving the
  head and the arm tips in flat colour. They now run out to the edge.

## v2.3.0 — 2026-11-17

- `variety` gives every dancer in a crowd its own colour, face, girth, arm
  length, hair and flail. The colours you chose stay on the first dancer and
  the rest walk round the hue wheel, so a line-up reads as one set.

## v2.2.0 — 2026-11-17

- Tubes are lit from the edge rather than shaded as cylinders: a bright strip
  down the lit side, flat colour through the middle, shade opposite.
- Highlights and shadows are drawn from the tube's own colour rather than
  washed with white and black, which keeps a flat fill from going grey. Any CSS
  colour works, not only hex.
- A tube is stepped in five flat bands across its width rather than ramped, so
  it reads as drawn rather than rendered.

## v2.1.2 — 2026-11-17

- Shaded flatter again, more like a drawing than a render.
- Corrected v2.1.1, which had gone out carrying a shading value that was never
  the one tested.

## v2.1.1 — 2026-11-17

- Flattened the tube shading further.

## v2.1.0 — 2026-11-17

- Shaded the tubes as cylinders, with a lit side and a shaded one.
- Customizer: redesigned, and given some personality.

## v2.0.2 — 2026-11-17

- **Fixed:** the speech balloon hopped from one side of the head to the other.
- Customizer: dropped the checkerboard behind the preview.

## v2.0.1 — 2026-11-16

- Dropped the ground shadow.

## v2.0.0 — 2026-11-16

- First release on the `@2` line. The widget is always transparent and crops
  close to the dancer, so it sits on whatever the page puts behind it.
