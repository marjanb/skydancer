# Skydancer

![Three skydancers side by side](docs/preview.png)

**[Try it live](https://marjanb.github.io/skydancer/)** - tweak one and copy its embed code.

An animated inflatable tube man as an embeddable web widget. It is transparent, has no dependencies, and pauses itself while scrolled out of view. The dancer leans toward the mouse pointer and gets blown around by random gusts.

## Embed

```html
<script src="https://cdn.jsdelivr.net/gh/marjanb/skydancer@2/skydancer.min.js"></script>
<sky-dancer color="#7d3cff" accent="#00e0c6" face="cool" style="height: 500px"></sky-dancer>
```

The widget is 400px tall by default and crops to the dancer: its width follows its height (1.4x, plus a little per extra dancer), so it sits inline like an image rather than filling the page. Size it with CSS -- set the height and the width follows, or set both to override the crop. The dancer scales with the height and keeps its proportions.

| Attribute    | Default   | Meaning                                    |
|--------------|-----------|--------------------------------------------|
| `color`      | `#ff3b30` | body colour                                |
| `accent`     | `#ffd60a` | arms and hair colour                       |
| `girth`      | `64`      | body thickness (px at 1000px widget height) |
| `arm-length` | `0.32`    | arm length as a fraction of body height    |
| `speed`      | `1`       | animation speed                            |
| `wildness`   | `1`       | how much it flails                         |
| `wind`       | `1`       | wind strength; `0` is calm                 |
| `face`       | `happy`   | `happy`, `surprised` or `cool`             |
| `hair`       | `true`    | `false` hides the hair                     |
| `count`      | `1`       | how many dancers stand together (max 6)    |
| `variety`    | `false`   | `true` gives each dancer in a crowd its own colour, face, girth, arms and hair |
| `sign`       | none      | words in a speech bubble by the dancer     |
| `bubble`     | `drawn`   | bubble shape: `drawn`, `box` or `burst`    |
| `closable`   | `true`    | `false` drops the balloon's dismiss button |

The `sign` attribute puts words in a hand-drawn speech balloon beside the dancer's head. It drifts rather than tracking the head, so the words stay readable.

The balloon carries a dismiss button. Clicking it fires a bubbling, cancelable `close` event and then hides the widget; call `preventDefault()` on that event to handle it yourself, or set `closable="false"` to drop the button.

To show and hide a dancer, call `hide()` and `show()` on the element, or set the standard `hidden` property:

```js
document.querySelector('sky-dancer').hide();
```

A hidden dancer stops animating and costs nothing until it is shown again.

Poking a dancer knocks the air out of it. Where the viewer's system asks for reduced motion, it holds a still pose instead of animating.

## Customizer

Open `index.html` to tweak a dancer with sliders and copy its embed code. `embed-example.html` shows several dancers on one page.

## License

MIT, see [LICENSE](LICENSE).
