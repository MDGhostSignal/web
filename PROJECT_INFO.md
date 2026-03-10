# GhostSignal Project Information

This repository builds the public company website for **GhostSignal**.

## Visual Direction (Canonical)

- The website should present as a **cutting-edge modern agency website**.
- Motion, layout, typography, and pacing should feel premium and contemporary while staying aligned to the GhostSignal brand.

## Product Shape (Canonical)

The website must follow this structure:

1. A **long homepage landing page** with extensive scroll animations across multiple sections.
2. A page called **For Creators**.
3. A page called **For Brands**.
4. A page called **What Is This**.
5. A page called **Who Are We**.
6. A page called **Contact**.
7. A page called **Snowdrift**.

## Route Intent

Use clear, stable route naming that reflects the page titles above. If route slugs differ in existing code, align implementations toward this page map unless the user requests a different naming scheme.

## Implementation Direction

- Homepage is the primary storytelling surface and should carry the deepest motion choreography.
- Inner pages should each have a clear purpose and support the same brand voice.
- Reuse the existing motion library under `apps/web/src/motion/` before adding new motion primitives.
