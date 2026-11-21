# After Effects automation (Phase 3)

For motion that needs real AE (complex logo animations, 3D, particles) we use **AE templates + nexrender**.

- One `.aep` template per brand with named layers: `KV`, `HEADLINE`, `SUBLINE`, `CTA`, `LOGO`,
  and one composition per aspect family: `COMP_ultrawide`, `COMP_wide`, `COMP_square`, `COMP_portrait`.
- The agent writes a nexrender job JSON per size (replaces KV footage + text layers, sets comp size),
  and nexrender (`@nexrender/cli`) renders it on the office machine via `aerender`.
- Requires: a Windows/Mac machine with After Effects installed, licensed, and reachable (Remote Control / Desktop Commander).

TODO: motion designer builds the first Leaders template → we wire `ae/make-jobs.mjs`.
