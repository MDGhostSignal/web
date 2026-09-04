# Notturno Experience — technical teardown

Reference for GhostSignal WIT v2. Live site: https://santionispirits.com/  
Agency: Active Theory (HydraX). Sound: Plan8.  
Local vault (gitignored / untracked): `production/wit-v2-refs/`.

## Architecture

- HydraX 1.1.20 single-page WebGL story (`overflow: hidden` + virtual Scroll).
- Designer data: `uil.<cache>.json` (~3612 keys).
- Scenes stacked by `heightWorld` (viewport multiples); camera + `lerpedScrollY`.
- Composite post FX: MouseFluid, `uAgeGate`, `uScrollY`, loader veil.

## Scene order (production `sceneConfigs`)

1. WanderScene (2.5)  
2. ProfileScene (1.25)  
3. ApproachScene (2 / m1.25)  
4. NearScene (3 / m1.25)  
5. HandScene (1.5)  
6. TargetScene (auto)  
7. TransitionScene (2 / m1.5, marginTop −0.1)  
8. CathedralScene (4, marginTop −0.5)  
9. DrinkSelectionScene (2.5) — interactive  
10. DrinkPourScene (4) — interactive  
11. AntiGravityScene (2 / m1.8) — interactive  
12. PillarCrumbleScene (1.25)  
13. ColosseumScene (3.25)  
14. TasteScene (auto)  
15. CollectionScene (auto)  
16. ProductsScene (auto)  
17. RetailScene (auto)  
18. FooterScene (auto)

## GhostSignal mapping

WIT v2 recreates **structure + pacing** at `/what-is-this-v2` (ScrollTrigger sticky stages), not HydraX/IP. See plan / `apps/web/src/app/what-is-this-v2/chapters.ts`.
