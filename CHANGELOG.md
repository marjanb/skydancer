# Changelog

Embeds point at `@2`, which follows the newest `v2.x.x` tag, so everything
below reaches an existing embed as soon as it is tagged. This is the place to
look when a dancer starts looking different.

## v2.16.0 — 2026-11-25

- The still pose is a pose. A reader whose system asks for less motion, or a
  page that sets `speed="0"`, gets one frame and no more, and that frame was
  drawn at the very start of the dance clock, where the two halves of the
  flail cancel and the arms sit at much the same height -- a tube man standing
  to attention rather than one caught mid-dance. The clock starts a little
  further in now, so the still frame has the body curved and the arms at
  different heights, and a still crowd reads as three poses rather than three
  copies. Everything scheduled against the clock moved along with it, so a
  dancer that does run is unchanged.
- `worn` is a dancer that has been out in the weather a season too long: the
  colours bleached towards a pale, washed-out version of themselves, two
  strips of tape over tears up the body, and arm ends split into ribbons.
  Bleaching is towards a tone rather than simply lighter, so a dark one comes
  up to charcoal and a pale accent does not turn white and disappear.
- A crowd behaves like one. Dancers standing together were six copies of the
  same dance a few seconds apart, each keeping entirely to itself. A dancer
  throwing itself hard to one side now reaches the one next along, which
  leans with it a quarter-second later, so the flail travels down the row.
  It is the dance that carries, and nothing else: a row leaning together in
  the wind, or one dancer folded over a reader's hand, is the weather or the
  reader rather than a dancer moving its neighbour, and a row that is not
  flailing stands exactly where it always stood.
- A dancer can be taken hold of. Dragging across one bends the tube towards
  the hand, hardest where it was grabbed and dying away up and down the body
  -- and along the row, so a hand on one of a crowd does not fold all six.
  Let go and it springs back past upright and rings down. A press that stays
  put is still a poke, which is the one thing this changes: a poke lands on
  the release now rather than on the press, since until the hand moves or
  lifts there is no telling which of the two it was. A drag that ends on a
  dancer with an `href` no longer follows it. On a phone a sideways drag is
  the tube's, while scrolling and zooming stay the reader's -- and a touch
  the browser takes over for one of those is never a poke.

## v2.15.1 — 2026-11-25

- **`glow="dark"` is gone**, two days after it arrived. `glow` is `none`
  or `on`. A tag still saying `dark` is simply unlit, and the customizer
  drops the value from a link that carries it.
- A theme is noticed wherever the page puts it. Only `<html>` was watched
  before, so a page that set `--sky-dancer-color` on a section, a card or
  the dancer's own parent kept whatever colour it had at startup. Every
  element from the dancer up is watched now, following the page as it is
  laid out rather than as it is written -- out through a shadow boundary,
  and out through a slot to whatever surrounds it -- and the re-reads are
  collected into one a frame, since an ancestor whose inline style is
  rewritten every frame would otherwise buy a style recalculation per
  mutation.

## v2.15.0 — 2026-11-23

- Customizer: the dancer can be moved with the arrow keys as well as
  dragged, which is the only way to reach it without a pointer -- and where
  it stands is part of what a share link carries. A copy is said out loud
  for a reader who cannot see the button change, the pressed CDN/npm chip
  had white words on a pale tint (1.3:1, now 5.4:1), and the page has a
  description and an icon of its own instead of a 404 in every console.
- Two more markings, `dots` and `chevrons`, and two more balloons, a plain
  `round` one and a scalloped `cloud`.
- Every half-minute or so a dancer stops flailing and takes a bow: it folds
  right over from the base, holds for a beat, and springs back past upright.
  On the dance clock like everything else, so `speed` carries it, and a pose
  held in the middle of one stands back up rather than staying folded. In a
  crowd they go one after another, each dancer being a few seconds further
  along the same clock.
- `glow` lights a dancer from inside, the way the ones outside a car yard
  are after dark. `glow="dark"` lights it only where it is dark: the
  reader's own colour scheme, or a page that says `color-scheme: dark` for
  itself. The light is stepped rather than blurred, like the rest of the
  shading here, so six lit dancers cost no more a frame than six unlit
  ones.

## v2.14.0 — 2026-11-23

- A dancer tells the page two things: `poke` when a reader pokes it, carrying
  the word it blurted, and `arrive` once it has come into view and finished
  filling with air. Both bubble and cross a shadow boundary, so one listener
  on the section it sits in catches it. A page's own `cheer()` fires no
  `poke`: it already knows it asked.
- **Fixed:** a dancer whose canvas lost its drawing context -- a driver
  reset, or a phone short of memory with the tab in the background -- stayed
  blank or came back at the wrong size. It asks for the context back now and
  repaints when it has it.
- Customizer: a link to the repository, in the title row.
- Customizer: the script box offers the npm form as well as the CDN one. The
  package has been installable since v2.11 and the page still only knew about
  the script tag.

## v2.13.0 — 2026-11-23

- `link-label` and `poke-label` say the two bits of wording a reader meets
  rather than sees. They were English only, which on a page in another
  language was the only English a screen reader hit.
- **Fixed:** a negative `girth` asked the canvas for a negative radius and
  threw on every frame, leaving nothing on screen; an enormous one left
  nothing on screen either. Numbers that have a sensible range are held to
  it now, since a dancer's settings can arrive from a page's templating or
  a shared link rather than from someone watching the result.

## v2.12.0 — 2026-11-20

- Pushing a version tag publishes to npm, with provenance, instead of it
  being done by hand. The tag and `package.json` have to agree or the run
  stops.
- The package carries its own types, so `querySelector('sky-dancer')` is the
  element rather than a bare `HTMLElement`, and the attributes are written
  down where an editor can offer them. No JSX declaration, since typing an
  intrinsic element means naming a framework's own types and nobody should
  have to carry those to install a tube man.

## v2.11.0 — 2026-11-20

- A dancer with something to `shout` can be poked from a keyboard: it carries
  a button that does what a poke does, hidden until it is tabbed to. Offered
  only when a poke would be worth taking, so a decorative dancer still costs
  the page no tab stop.
- Importing the widget where there is no browser -- a page being rendered on
  a server -- does nothing instead of throwing, so a framework can pull it
  in beside the markup that uses it.
- The widget is an npm package as well as a script tag: `npm install
  skydancer`, then `import 'skydancer'` once to register the element. It is
  the same file either way -- it already loaded as a module, so there is no
  second build and nothing to keep in step.

## v2.10.2 — 2026-11-20

- **Fixed:** a dancer with `hours` came back from off screen already
  standing instead of filling. The hours ask for the same thing every
  minute, and off screen there is no loop to finish the breath that
  started; an arrival only fills when nothing else is breathing. Asking
  for what it is already doing is no longer a breath at all.

## v2.10.1 — 2026-11-20

- **Fixed:** a dancer stood up at full height on load instead of filling
  with air as it arrived. v2.10.0's opening hours took a breath on every
  connect, and the arrival fill only runs when nothing else is breathing.
- Customizer: a field for `hours`, under Wind.

## v2.10.0 — 2026-11-20

- The page scrolling past is wind: a dancer is blown along with it, right
  going down and left going up, and settles when the scrolling stops. It
  scales with `wind` like everything else, so `wind="0"` ignores it, and a
  paused dancer or a reader who asked for less motion never sees it. Only
  the page's own scroll counts, not a scrolling container's.
- Customizer: four looks to start from -- car yard, shop front, party and
  late night -- above the controls that refine one. Each is a whole dancer,
  so none of them inherit the last one's leftovers, and your size and where
  you dragged it are kept.
- `hours` gives a dancer opening times, as `9-17`, or `22-6` to run through
  midnight. Outside them the air is out and it lies flat, which is what a
  real one does when the fan goes off. It reads the reader's own clock.

## v2.9.1 — 2026-11-19

- The `placard` is about two fifths bigger, so the words that hold still
  are the ones you can read.

## v2.9.0 — 2026-11-19

- **The balloon's dismiss button is gone**, along with the `closable`
  attribute and the `close` event it fired. A page that hid a dancer that
  way should call `hide()` or set `hidden` instead.
- `print` is lettered by hand now, in Skia where there is one, and heavier:
  it is a sign painted on cloth rather than a label, and it is read at a
  distance across a moving, shaded tube.
- **Fixed:** a literal NUL character in a `sign` or a `shout` was read as a
  pipe and split the words there.

## v2.8.0 — 2026-11-19

- `print` puts words down the body, the way a real one carries SALE or OPEN.
  Each letter turns with the tube, so the line bends as the dancer moves.
- `placard` stakes a board at its feet, for words that hold still while
  everything above them thrashes.
- `shout` is what a dancer blurts when poked. The word pops up beside it and
  fades, somewhere different each time, leaving whatever the sign says alone.
  Divide several with `|` as the sign does, and each poke takes one of them --
  never the one it took last. A `shout` that already contains a pipe now
  splits there; `||` writes a literal one.
- Words in the speech balloon type themselves out rather than appearing whole.
- Customizer: undo, redo and reset moved off the title row, which had run
  out of room for them.

## v2.7.0 — 2026-11-18

- `deflate()` and `inflate()` let a page flop a dancer and stand it back up,
  the counterpart to `cheer()`. It stays on show either way.
- Customizer: a redo to go with the undo, and Cmd/Ctrl+Z and Cmd+Shift+Z.

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
