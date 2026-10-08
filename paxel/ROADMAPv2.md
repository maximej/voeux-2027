# PAXEL
## Digital Scratch Image - Development Roadmap

## 1. Project Overview

PAXEL is a web-based interactive experience inspired by physical scratch cards.

A single hidden image is covered by an opaque surface.

The user progressively reveals the image by scratching the surface:

- with a finger on a smartphone or tablet;
- with a mouse or trackpad on a desktop computer.

The interaction should feel immediate, physical and satisfying.

The experience revolves around one simple action:

> Scratch the surface to discover the image underneath.

The project should work directly in a modern web browser and should not require an application installation.

The priority is the quality of the scratch interaction rather than the number of features.

---

# 2. Core Experience

When PAXEL loads, the user sees a completely covered area.

The hidden image must not initially be visible.

The user scratches the covering layer by dragging:

```text
Desktop:
click + drag

Mobile:
touch + drag
```

The scratched areas become transparent and reveal the image underneath.

The reveal should follow the user's movement continuously rather than operate as a sequence of clicks.

Conceptually:

```text
COVERING LAYER
████████████████████████
████████████████████████
████████████████████████
████████████████████████

          ↓ scratch

████████████████████████
██████      ████████████
████          ██████████
████████    ████████████

          ↓

HIDDEN IMAGE VISIBLE
THROUGH SCRATCHED AREAS
```

The interaction should resemble removing material from a physical scratch card.

---

# 3. Main Design Principles

PAXEL should remain simple.

The project should prioritize:

1. immediate understanding;
2. responsive scratching;
3. smooth rendering;
4. accurate pointer and touch interaction;
5. compatibility with desktop and mobile browsers;
6. visual quality;
7. good performance on average smartphones;
8. minimal interface;
9. a single hidden image;
10. maintainable code.

Avoid adding unrelated game mechanics.

The scratch interaction itself is the project.

---

# 4. Technical Foundation

Use standard web technologies.

Initial recommended stack:

```text
HTML
CSS
JavaScript
Canvas API
```

Use HTML Canvas for the scratch surface.

The implementation should conceptually contain at least two visual layers:

```text
SCRATCH LAYER
████████████████████
████████████████████
████████████████████
        ↓
HIDDEN IMAGE
```

The scratch layer is progressively erased by user interaction.

A common Canvas approach is to use compositing so that the brush removes parts of the covering layer rather than painting on top of it.

The implementation should remain lightweight.

Do not introduce a frontend framework unless it becomes useful for a concrete reason.

---

# 5. Responsive Layout

PAXEL must be designed for both portrait and landscape screens.

The image area must adapt to:

- smartphones;
- tablets;
- laptops;
- desktop monitors.

The source image must preserve its aspect ratio.

The image should never become distorted because of the viewport dimensions.

The scratch mask and the hidden image must always remain perfectly aligned.

Window resizing and device orientation changes must preserve the current scratched state.

---

# 6. Input System

Create a unified input system based on Pointer Events when possible.

It should support:

```text
Mouse
Touch
Stylus
```

The scratch engine should not maintain separate gameplay logic for desktop and mobile.

The basic interaction is:

```text
pointerdown
    ↓
start scratching

pointermove
    ↓
continue scratching

pointerup
    ↓
stop scratching
```

Dragging must produce a continuous path.

Fast movement must not produce disconnected holes.

Interpolate between pointer positions if necessary.

---

# 7. Scratch Brush

The first prototype should use a simple circular brush.

Parameters should be easy to configure:

```text
brush radius
brush hardness
edge softness
movement interpolation
```

The physical brush size should remain comfortable across different screen sizes and pixel densities.

The default brush should be large enough to reveal meaningful areas without allowing the complete image to be uncovered almost immediately.

Brush behaviour must be tested separately on mouse and touch.

---

# 8. Scratch Surface

The covering surface should initially be simple.

For development, use a flat opaque layer.

For example:

```text
████████████████████
████████████████████
████████████████████
```

The architecture should allow its visual appearance to be improved later without changing the scratch engine.

Possible visual properties that may later be adjusted include:

- texture;
- brightness;
- grain;
- subtle surface variation;
- scratch edge appearance.

These are presentation parameters, not new gameplay systems.

---

# 9. Reveal Rendering

Scratching should reveal the actual image underneath the mask.

The scratch should follow the pointer continuously and accurately.

The revealed area should not visually drift away from the user's gesture.

The mask resolution must be sufficient to avoid obvious blockiness.

On high-density mobile displays, take `devicePixelRatio` into account so that the result remains sharp.

---

# 10. V0 - Interaction Prototype

The first milestone is a completely local prototype.

No backend is required.

Use a temporary test image.

Implement:

- responsive image container;
- hidden image;
- opaque scratch layer;
- Canvas mask;
- mouse scratching;
- touch scratching;
- continuous stroke interpolation;
- configurable brush size;
- correct image scaling;
- correct device pixel ratio handling;
- resize handling;
- orientation change handling.

The objective is to determine whether the fundamental interaction feels convincing.

V0 is complete when the same page can be opened on a computer and smartphone and the image can be comfortably scratched on both.

---

# 11. V1 - Scratch Quality

Once the basic interaction works, improve its quality.

Focus on:

- stroke smoothness;
- latency;
- brush responsiveness;
- scratch edges;
- performance;
- touch accuracy;
- accidental browser gestures;
- behaviour near image boundaries.

Prevent the browser from interpreting scratching as:

- page scrolling;
- text selection;
- image dragging;
- browser zoom gestures when inappropriate.

Do not disable normal browser behaviour outside the interactive scratch area.

The interaction should feel deliberate and controlled.

---

# 12. V2 - Progress Calculation

Add the ability to estimate how much of the covering layer has been removed.

Conceptually:

```text
0% scratched
25% scratched
50% scratched
75% scratched
100% scratched
```

The calculation does not need to inspect every Canvas pixel after every pointer movement.

Use an efficient method.

Possible approaches include:

- sampling;
- a lower-resolution logical mask;
- grid-based coverage tracking;
- periodic Canvas analysis.

Choose the simplest method that provides sufficiently accurate results.

Progress calculation must not reduce scratch responsiveness.

---

# 13. V3 - Completion State

Define a configurable completion threshold.

The user should not necessarily need to scratch literally 100% of the surface.

For example, the experience could be considered complete when most of the surface has been removed.

The exact threshold should remain configurable rather than hard-coded.

When the threshold is reached:

1. stop requiring additional scratching;
2. smoothly remove the remaining covering layer;
3. reveal the complete image.

The transition should remain visually consistent with the scratching interaction.

Do not introduce unrelated rewards or game systems.

The revealed image itself is the result.

---

# 14. V4 - Visual Polish

Once scratching is technically stable, refine the appearance.

Improve:

- scratch surface rendering;
- brush edges;
- transition between covered and uncovered areas;
- initial appearance;
- completion transition;
- responsive layout.

The covering layer should visually communicate that it can be scratched without requiring extensive instructions.

Any texture should remain lightweight enough for mobile rendering.

The visual design must not interfere with the readability of the hidden image once revealed.

---

# 15. V5 - Mobile Optimization

Treat mobile as a primary platform, not a reduced desktop version.

Test on different screen sizes and pixel densities.

Focus on:

- touch latency;
- one-finger scratching;
- accidental scrolling;
- orientation changes;
- viewport height behaviour;
- mobile browser interface bars;
- high-DPI rendering;
- memory usage;
- battery/GPU usage;
- image loading time.

The scratch experience must remain smooth on an average modern smartphone.

Do not assume desktop-level hardware.

---

# 16. V6 - Desktop Optimization

Refine desktop interaction separately.

Test:

- mouse;
- trackpad;
- different browser zoom levels;
- large monitors;
- high-DPI displays.

Cursor behaviour should clearly communicate when scratching is possible.

The brush should not feel disproportionately small on large displays.

---

# 17. V7 - State Persistence

Determine whether the scratched state should survive a page reload.

If persistence is required, store only the scratch state needed to reconstruct the experience.

Potential implementations include:

```text
localStorage
IndexedDB
compressed mask data
```

For a purely local experience, no account or personal information is necessary.

The persistence system should remain separate from the rendering engine so that it can be enabled or disabled easily.

If the intended experience requires every visit to start from an untouched image, this version can simply be omitted.

---

# 18. V8 - Image Loading and Protection

The production image may be significantly larger than its displayed dimensions.

Optimize image loading for mobile networks.

Consider:

- appropriate image format;
- compression quality;
- dimensions;
- preload strategy;
- loading indicator;
- browser decoding performance.

If keeping the hidden image difficult to retrieve is still a project requirement, treat this as a separate technical problem.

A purely client-side scratch card necessarily gives the browser access to the underlying image.

Therefore:

> If the complete image is loaded by the browser, a technically knowledgeable visitor can retrieve it regardless of the visual scratch mask.

Do not rely on Canvas, CSS or JavaScript obfuscation as security.

If actual image secrecy before scratching is required, the architecture will need a server-side or tiled reveal strategy.

This decision should be made before production deployment.

---

# 19. V9 - Production Interface

Build the final minimal interface around the validated scratch experience.

The scratchable image should remain the primary visual element.

The interface may contain only what is necessary to understand and use the experience.

Avoid covering significant portions of the scratch area with controls.

Ensure accessibility where compatible with the nature of the interaction.

The experience should load directly into a usable state.

---

# 20. V10 - Cross-Browser Testing

Test the production build on major current browsers.

Priority environments:

```text
iOS Safari
Android Chrome
Desktop Chrome
Desktop Safari
Firefox
Edge
```

Test:

- first load;
- image loading;
- scratching;
- fast strokes;
- slow strokes;
- touch;
- mouse;
- resizing;
- orientation changes;
- completion;
- reload behaviour;
- high-DPI rendering.

Fix platform-specific issues before adding additional features.

---

# 21. V11 - Performance Testing

Profile the complete experience.

Measure:

- initial download size;
- time until interaction is possible;
- image decoding time;
- Canvas memory usage;
- frame rate while scratching;
- CPU usage;
- GPU usage where measurable;
- responsiveness during fast gestures.

The scratch loop should avoid unnecessary full-canvas operations.

Prefer incremental updates.

Do not perform expensive progress calculations on every pointer event.

---

# 22. V12 - Production Deployment

Prepare the project for public use.

Production requirements:

- HTTPS;
- optimized assets;
- cache configuration;
- compressed JavaScript/CSS;
- production error handling;
- responsive metadata;
- mobile viewport configuration;
- correct image preloading;
- graceful loading state.

The deployed application should remain a conventional web page accessible from a single URL.

No installation should be required.

---

# 23. Recommended Code Architecture

Keep the project modular even if it remains small.

A possible structure:

```text
src/
│
├── main.js
│
├── scratch/
│   ├── ScratchEngine.js
│   ├── ScratchMask.js
│   ├── ScratchBrush.js
│   └── ScratchProgress.js
│
├── input/
│   └── PointerInput.js
│
├── image/
│   └── ImageLoader.js
│
├── state/
│   └── ScratchState.js
│
├── ui/
│   └── Interface.js
│
└── styles/
    └── main.css
```

Responsibilities should remain separated:

`ScratchEngine`
coordinates the experience.

`PointerInput`
translates mouse/touch/stylus interaction into normalized coordinates.

`ScratchBrush`
defines how material is removed.

`ScratchMask`
maintains the current covering layer.

`ScratchProgress`
calculates revealed percentage.

`ImageLoader`
loads and prepares the hidden image.

`ScratchState`
handles optional persistence.

This separation makes it possible to modify the visual design without rewriting the interaction system.

---

# 24. Configuration

Avoid scattering important values throughout the source code.

Use a central configuration.

Conceptually:

```text
image
brush size
brush softness
completion threshold
surface appearance
persistence enabled/disabled
```

This will make iteration significantly easier.

---

# 25. Features Explicitly Outside the Current Scope

Do not implement unless requested later:

- user accounts;
- login;
- profiles;
- multiplayer;
- collective synchronized scratching;
- pixel-by-pixel reveal;
- adjacency rules;
- leaderboards;
- scores;
- virtual currency;
- achievements;
- chat;
- multiple images;
- random rewards;
- user tracking;
- social features.

These belonged either to the previous PAXEL concept or have not been specified for the new project.

The new PAXEL should initially remain a single-image digital scratch experience.

---

# 26. Development Sequence

Use the following sequence:

```text
V0
Functional scratch prototype
        ↓
V1
Scratch interaction quality
        ↓
V2
Reveal progress calculation
        ↓
V3
Completion behaviour
        ↓
V4
Visual polish
        ↓
V5 + V6
Mobile and desktop optimization
        ↓
V7
Optional state persistence
        ↓
V8
Production image loading / secrecy decision
        ↓
V9
Final interface
        ↓
V10 + V11
Browser and performance testing
        ↓
V12
Production deployment
```

Do not develop all versions at once.

Each milestone should produce a functional build that can be tested before continuing.

---

# 27. Immediate Development Goal

Start with V0.

Create the smallest possible functional prototype containing:

- one test image;
- one opaque covering layer;
- one Canvas-based scratch mask;
- circular brush;
- continuous mouse scratching;
- continuous touch scratching;
- responsive scaling;
- correct coordinate conversion;
- smooth strokes;
- high-DPI support.

Do not implement progress tracking, completion logic, persistence or production infrastructure yet.

The first question the prototype must answer is:

> Does scratching the image with a mouse or finger feel immediate, natural and satisfying?

Only continue to the following versions after that interaction works correctly.