# Contributing to Gallery

Gallery is both an art project and a technical research record. Contributions
should preserve that dual purpose: visual changes need an artistic reason,
while implementation changes need a reproducible technical contract.

## Development setup

Install the locked dependency set:

```bash
npm ci
```

Start the local development server:

```bash
npx vite
```

Before proposing a change, run:

```bash
npm test
npm run build
```

## Working approach

- Develop new visual systems as bounded studies before integrating them into
  a finished artwork.
- Preserve signed-off artwork behaviour unless a change explicitly reopens
  artistic review.
- Keep procedural systems deterministic where their tests rely on a seed.
- Do not add frameworks or dependencies without a demonstrated need.
- Record rejected experiments honestly when they materially explain the
  development of a work.
- Keep generated build output, credentials and local configuration out of
  version control.

## Proposals and reports

Use ordinary issues for reproducible defects and bounded proposals. Do not
use public issues for vulnerabilities; follow `SECURITY.md` instead.

Copyright remains with each contributor. By submitting a contribution, you
agree that it may be distributed under the repository licences applicable to
the material you changed.
