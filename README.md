# Skydancer

An animated inflatable tube man as an embeddable web widget. It has no dependencies and pauses itself while scrolled out of view. The dancer leans toward the mouse pointer and gets blown around by random gusts.

## Embed

```html
<script src="https://cdn.jsdelivr.net/gh/marjanbajct2/skydancer@1/skydancer.min.js"></script>
<sky-dancer color="#7d3cff" accent="#00e0c6" face="cool" style="height: 500px"></sky-dancer>
```

The widget is full width and 400px tall by default. Size it with CSS.

| Attribute    | Default   | Meaning                                    |
|--------------|-----------|--------------------------------------------|
| `color`      | `#ff3b30` | body colour                                |
| `accent`     | `#ffd60a` | arms and hair colour                       |
| `height`     | `0.68`    | body height as a fraction of the widget    |
| `girth`      | `64`      | body thickness in px                       |
| `arm-length` | `0.32`    | arm length as a fraction of body height    |
| `speed`      | `1`       | animation speed                            |
| `wildness`   | `1`       | how much it flails                         |
| `wind`       | `1`       | wind strength; `0` is calm                 |
| `face`       | `happy`   | `happy`, `surprised` or `cool`             |
| `hair`       | `true`    | `false` hides the hair                     |

## Customizer

Open `index.html` to tweak a dancer with sliders and copy its embed code. `embed-example.html` shows several dancers on one page.
