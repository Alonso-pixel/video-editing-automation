# Remotion HTML-in-Canvas: A Comprehensive Guide

This guide explores the groundbreaking **HTML-in-Canvas** API in Remotion, a brand new capability that allows you to draw live DOM elements into a canvas for advanced post-processing. This opens up a world of "unique" animations—like magnifying glasses, CRT screen effects, and complex shaders—that were previously impossible with standard CSS.

---

## 1. What is HTML-in-Canvas?

Historically, Remotion animations were either **DOM-based** (using CSS/HTML) or **Canvas-based** (drawing everything manually). HTML-in-Canvas bridges this gap. It captures a live DOM node and provides it as a source to a `<canvas>`, allowing you to apply:
- **Canvas 2D Filters** (Blur, brightness, contrast)
- **WebGL Shaders** (Glitch effects, distortions, CRT curvature)
- **WebGPU** (High-performance computations)

---

## 2. Setting Up Your Environment

This feature is **experimental** and requires specific browser configurations.

### Browser Setup (Chrome/Chromium)
1. Open Google Chrome (v149 or later).
2. Navigate to `chrome://flags/#canvas-draw-element`.
3. Set **HTML-in-Canvas** to `Enabled`.
4. Restart your browser.

### Remotion Configuration
To render these videos, you must enable the correct OpenGL renderer in your `remotion.config.ts`:

```typescript
import { Config } from 'remotion';

Config.setChromiumOpenGlRenderer('angle'); // Use 'swangle' if on a machine without a GPU (like Lambda)
```

---

## 3. The `<HtmlInCanvas>` Component

The core of this feature is the `<HtmlInCanvas>` component. It wraps your DOM elements and exposes a paint lifecycle.

### Basic Syntax
```tsx
import { HtmlInCanvas, type HtmlInCanvasOnPaint } from 'remotion';

const onPaint: HtmlInCanvasOnPaint = ({ canvas, elementImage }) => {
  const ctx = canvas.getContext('2d');
  if (!ctx) return;

  ctx.reset();
  ctx.filter = 'contrast(1.5) grayscale(1)'; // Apply 2D effects
  ctx.drawElementImage(elementImage, 0, 0);
};

export const MyAnimation = () => {
  return (
    <HtmlInCanvas width={1920} height={1080} onPaint={onPaint}>
      <div style={{ fontSize: 100, color: 'blue' }}>
        Live DOM Content
      </div>
    </HtmlInCanvas>
  );
};
```

---

## 4. Unique Animation Capabilities

### A. The Magnifying Glass
Unlike a simple CSS `scale`, this effect actually "samples" the DOM and redraws it in a specific area of the canvas with a magnification factor.

```tsx
const onPaint: HtmlInCanvasOnPaint = ({ canvas, elementImage, frame }) => {
  const ctx = canvas.getContext('2d');
  const x = 500 + Math.sin(frame * 0.1) * 200; // Moving glass
  const y = 500;
  const radius = 150;

  ctx.reset();
  // Draw original unmagnified background
  ctx.drawElementImage(elementImage, 0, 0);

  // Draw Magnified Circle
  ctx.save();
  ctx.beginPath();
  ctx.arc(x, y, radius, 0, Math.PI * 2);
  ctx.clip();
  
  // Draw the image larger, centered on the clip
  ctx.drawImage(elementImage, x - radius, y - radius, radius * 2, radius * 2, x - radius * 2, y - radius * 2, radius * 4, radius * 4);
  ctx.restore();
};
```

### B. The CRT / Vintage Screen
Apply curvature and scanlines to your modern web app UI to make it look like an 80s computer.

- **Curvature:** Use WebGL to warp the `elementImage` coordinates.
- **Scanlines:** Overlay semi-transparent horizontal lines in the `onPaint` loop.
- **Flicker:** Rapidly adjust `ctx.globalAlpha` based on `random(frame)`.

---

## 5. Transitions & Blending

HTML-in-Canvas can be used with `@remotion/transitions` to create sophisticated scene blends.
- **Zoom Blur Transition:** Uses the canvas to "smear" the pixels of the incoming and outgoing scenes.
- **Pixelation:** Captures both scenes, draws them at a lower resolution to the canvas, and then scales back up.

---

## 6. Important Limitations

1. **No Nesting:** You cannot put a `<HtmlInCanvas>` inside another `<HtmlInCanvas>`. Chrome will throw an error.
2. **Flag Dependency:** It will only work in the browser if the flag is enabled. Use `HtmlInCanvas.isSupported()` to handle fallbacks.
3. **Z-Index:** The canvas effectively "takes over" the rendering of its children. Standard CSS `z-index` between children and external elements might behave differently.

---

## 7. Rendering Checklist

When you are ready to export your video:
1. Ensure `remotion.config.ts` has `Config.setChromiumOpenGlRenderer('angle')`.
2. Run the render command with the GL flag:
   ```bash
   npx remotion render --gl=angle
   ```
3. If rendering on GitHub Actions or Lambda, use `--gl=swangle`.

---

## Summary
The HTML-in-Canvas API is a paradigm shift for Remotion. It moves from "animating elements" to "manipulating the image of elements." By treating your DOM as a live texture, you can create cinematic effects that were previously the domain of After Effects.



