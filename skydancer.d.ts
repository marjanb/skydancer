// Types for <sky-dancer>. Importing the package registers the element and
// nothing else, so there is no value to type -- what these describe is the
// element you then write in your markup.

export {};

/** A face to wear. */
export type SkyDancerFace =
  | 'happy' | 'surprised' | 'cool' | 'wink' | 'joy' | 'sleepy' | 'angry';

/** Markings down the body. */
export type SkyDancerPattern = 'none' | 'rings' | 'spiral' | 'dots' | 'chevrons';

/** Whether a dancer is lit from inside. */
export type SkyDancerGlow = 'none' | 'on';

/** The shape of the speech balloon. */
export type SkyDancerBubble = 'drawn' | 'round' | 'box' | 'cloud' | 'burst';

/** What a dancer blurted, along with the poke that got it out of it. */
export interface SkyDancerPokeDetail {
  /** The phrase it shouted, or `''` when it has no `shout` to give. */
  shout: string;
}

/** The events a dancer fires. Both bubble and cross a shadow boundary. */
export interface SkyDancerEventMap {
  /** A reader poked it. `cheer()` does not fire this. */
  poke: CustomEvent<SkyDancerPokeDetail>;
  /** It has come into view and finished filling with air. */
  arrive: CustomEvent<null>;
}

/**
 * The element itself. Every setting is an attribute, so the methods below are
 * the whole of the interface.
 */
export interface SkyDancerElement extends HTMLElement {
  /** Set it off: the same burst a poke gives it. A held pose stays still. */
  cheer(): void;
  /** Let the air out. It stays on show -- this is a mood, not `hide()`. */
  deflate(): void;
  /** Put the air back. */
  inflate(): void;
  /** Take it off the page. */
  hide(): void;
  /** Put it back. */
  show(): void;
}

/**
 * What a dancer can be told, as attributes. Everything is optional, and
 * everything is written as a string the way an attribute always is -- the
 * numbers included.
 */
export interface SkyDancerAttributes {
  /** Body colour. Any CSS colour. Default `#ff3b30`. */
  color?: string;
  /** Arms and hair colour. Default `#ffd60a`. */
  accent?: string;
  /** How fat the tube is, in px at a 1000px reference height. Default `64`. */
  girth?: string | number;
  /** Arm length as a fraction of body height. Default `0.32`. */
  'arm-length'?: string | number;
  /** How fast it dances. `0` holds the pose. Default `1`. */
  speed?: string | number;
  /** How much it flails. Default `1`. */
  wildness?: string | number;
  /** Wind strength; `0` is calm. Scales gusts, the pointer and the page's
   * scrolling. Default `1`. */
  wind?: string | number;
  /** Which face it wears. Default `happy`. */
  face?: SkyDancerFace;
  /** `false` hides the hair. Default `true`. */
  hair?: string | boolean;
  /** How many stand together, 1 to 6. Default `1`. */
  count?: string | number;
  /** Give a crowd a colour, face and build each. Default `false`. */
  variety?: string | boolean;
  /** Hold the pose. It stays on show, it simply stops. Default `false`. */
  paused?: string | boolean;
  /** Markings on the body. Default `none`. */
  pattern?: SkyDancerPattern;
  /** Light it from inside, the way the ones outside a car yard are after
   * dark. Default `none`. */
  glow?: SkyDancerGlow;
  /** Words printed down the body, bending with the tube. */
  print?: string;
  /** Words on a board staked at its feet, which hold still. */
  placard?: string;
  /** What it blurts when poked. Divide several with `|`, `||` for a literal
   * pipe; each poke takes one, never the one it took last. */
  shout?: string;
  /** Where a click leads, opened in a new tab. Only `http`, `https`, `mailto`
   * and `tel` are followed. */
  href?: string;
  /** Words in a speech balloon. Divide several with `|` and it works through
   * them in turn; `||` writes a literal pipe. */
  sign?: string;
  /** The balloon's shape. Default `drawn`. */
  bubble?: SkyDancerBubble;
  /** What the link is called when the sign says nothing. English `Find out
   * more` when unset. */
  'link-label'?: string;
  /** What the poke button is called. English `Poke the dancer` when
   * unset. */
  'poke-label'?: string;
  /** When it is worth dancing, as `9-17`; `22-6` runs through midnight.
   * Outside them the air is out and it lies flat. Read from the reader's own
   * clock. Empty means always. */
  hours?: string;
}

declare global {
  // So `document.querySelector('sky-dancer')` and `createElement` are typed.
  interface HTMLElementTagNameMap {
    'sky-dancer': SkyDancerElement;
  }

  // Both events bubble, so they really can arrive at any element or at the
  // document, and listening on a container is the usual way round. Declaring
  // them on the dancer alone would leave the common case untyped, which is
  // why this goes on the map every target shares.
  interface GlobalEventHandlersEventMap extends SkyDancerEventMap {}
}

// No JSX declaration here on purpose: typing an intrinsic element means
// naming a framework's own JSX types, and this package should not make
// everyone who installs it carry React's. A JSX user can write their own in
// a few lines, from `SkyDancerAttributes` above.
