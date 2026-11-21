---
name: billboard-campaign
description: Produce a full billboard campaign (key visual, all sizes, motion) for a brand from a brief. Use when the team asks for billboard / LED / outdoor designs in multiple sizes or to animate them.
---
Follow the pipeline in CLAUDE.md exactly.

1. Collect the brief: brand slug, campaign name, headline, subline, CTA, idea/mood, sizes (or "all").
   Write it to `briefs/<campaign>.json` (copy `briefs/example.json`).
2. Generate 3 key-visual options with Higgsfield (prompt from the idea + "empty negative space on the
   right for Arabic text, no text, no letters, no logos"). Ask the human to pick one. STOP until they pick.
3. Download the pick into `briefs/assets/<campaign>/`, set `visual` and `focal_point`, run
   `npm run render -- briefs/<campaign>.json`, inspect every PNG, fix, and show a contact sheet. STOP for approval.
4. On approval: optionally make an AI motion clip (Higgsfield image-to-video, 5–10s, slow camera move, no text),
   set `visual_video`, then `npm run motion -- briefs/<campaign>.json`. Check frames at 0.5s, 1.5s, 4s.
5. Report every file with size/duration, and upload to Drive if asked.
