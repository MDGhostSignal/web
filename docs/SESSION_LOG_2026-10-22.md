# Session log 2026-10-22

- Parked the left-side Values metaball on `/what-is-this` by unmounting `ValuesBinary` and its drag overlay in `WhatIsThisPage.tsx`. Component file left in place.
- Files: `apps/web/src/app/what-is-this/WhatIsThisPage.tsx`
- Dev server: `http://localhost:3000/what-is-this` (Playwright screenshot of the Values band shows no blob).
- Validation: typecheck/lint not run this pass.
- Nav: Get In Touch and Sign In are 12px apart on both the full bar and the collapsed bar (1600 and 1280). Files: `SiteHeader.module.css`, `globals.css`.
- Homepage hero: split typing line now includes “is” (`IS FOR PEOPLE`). File: `HomeTypingLoop.tsx`.
