# Gallery

Gallery is Trade Control's studio for visual interpretations, procedural
studies and interactive artwork.

It explores how the structures, processes and ideas inside an ERP system can
become geometry, movement, material and light. The long-term ambition is not to
decorate conventional dashboards, but to discover richer visual languages for
flow, recursion, aggregation, pressure and change.

> *“Mathematics usually gives you the problem, whereas art makes you discover
> the problem and the standard of success while creating the answer. That
> stubborn ambiguity is part of what gives the result meaning.”*
>
> — Codex, during the Category Tree composition study

## First completed shader work — Category Tree

**Category Tree** is Gallery's first completed shader-based artwork, following
four earlier static visual interpretations. It is a living recursive structure
planted at the meeting point of physical flow, ordered information, an
energetic substrate and an emergent metaphysical field.

- [View Gallery on the Trade Control website](https://tradecontrol.online/docs/gallery)
- [Read the artwork concept](<./docs/projects/category tree/concept.md>)
- [See the originating Trade Control Category Tree](https://tradecontrol.online/cash/cash-configuration)
- [Follow the development record](<./docs/projects/category tree/composition/work-plan.md>)

The complete work is supported by a set of retained studies. These include the
Casting Pit, the recursive Tree, the information network, the dark-matter sea
and the superstrate. Successful and rejected experiments are preserved because
the route to the final visual language is part of the work.

## Explore locally

Gallery uses JavaScript, native ES modules, Three.js, Vite and npm. It does not
use an application framework.

```bash
npm ci
npx vite
```

Open `http://localhost:5173/category-tree/` to review the completed artwork.
The retained studies remain available through their documented source paths;
this repository deliberately provides no separate public catalogue.

In Category Tree:

- drag to orbit around the work;
- use the wheel or pinch gesture to change distance;
- hold `Ctrl` while dragging to move the camera's point of attention within the
  bounded production envelope;
- use the small edge tab to reveal or conceal the controls;
- choose a Scene to restore a complete authored composition.

## Test and build

```bash
npm test
npm run build
npm run preview
```

The production build is a portable multi-page artwork bundle. It emits relative
asset URLs so the website can mount the completed work beneath `/gallery/`
without compiling the Three.js source itself. With `npm run preview`, open
`/category-tree/index.html`; the repository does not publish a root landing
page.

## Studio lineage

Gallery's first four entries were static visual interpretations made through
an established four-stage process:

1. **Analysis** — examine the codebase, schema and architectural purpose.
2. **Interpretation** — compose a word-picture that identifies its visual and
   conceptual character.
3. **Rendering** — turn that interpretation into a static visual impression.
4. **Iteration** — refine the result until it expresses the intended idea.

Category Tree began inside that same process. An earlier AI-authored
word-picture and its iterated static image became the artistic proposition from
which the later concept was derived. The shader studies did not replace or
retroactively alter those four stages; they extended one accepted visual
interpretation into a procedural, interactive work.

## Studio method

Gallery develops individual visual problems as small, understandable studies
before combining them. Live controls act as a mixing desk while an idea is
being judged; they are instruments of the creative process rather than the
subject of the finished work.

Frameworks and abstraction layers are introduced only when an experiment has
demonstrated a concrete need. Each stage must first succeed visually and
technically on its own.

## Repository map

- `src/category-tree/composition/` — the completed Category Tree artwork.
- `src/category-tree/tree/` — the standalone recursive Tree study.
- `src/category-tree/casting-pit/physical-layer/` — the physical Universe study.
- `src/category-tree/casting-pit/information-layer/` — the Cosmos/information study.
- `src/category-tree/substrate/` — the energetic dark-matter sea study.
- `src/category-tree/superstrate/` — the emergent metaphysical-field study.
- `src/lib/` — page-independent engines shared by artworks and studies.
- `docs/projects/category tree/` — concepts, outcomes, session records and
  rejected propositions.
- `src/category-tree/casting-pit/archive/` — superseded runnable experiments.

## Relationship with Trade Control

This repository owns Gallery's artwork code, component studies and conceptual
record. The [Trade Control website](https://tradecontrol.online/docs/gallery)
owns their public presentation and provides the route back into the wider
application.

Future ERP-responsive work should receive deliberately modelled visual signals
through a separate BI boundary rather than importing Trade Control application
internals directly. That separation preserves both artistic freedom and
operational integrity.

## Licensing

Unless a file says otherwise:

- source code is copyright Trade Control Ltd and licensed under the
  [GNU General Public License v3.0 only](./LICENSE);
- original documentation, artwork concepts and rendered Gallery output are
  copyright Trade Control Ltd and licensed under
  [Creative Commons Attribution 4.0 International](./LICENSE-CONTENT.md).

See [NOTICE.md](./NOTICE.md) for scope, attribution and third-party material.
