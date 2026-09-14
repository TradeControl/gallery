# Gallery

Gallery is an experimental visualisation project for [Trade Control](https://github.com/TradeControl).

Its purpose is to explore computational artwork derived from the structures, processes and ideas within Trade Control, using procedural graphics, 3D geometry and shaders.

The longer-term aim is not simply to illustrate software structures, but to make their behaviour generate the visual work itself: recursion, flow, aggregation and other system relationships should become geometry, movement and light.

## Technology

Gallery currently uses a deliberately small web graphics stack:

- JavaScript
- Native ES modules
- [Three.js](https://threejs.org/)
- [Vite](https://vite.dev/)
- npm

The project does not currently use an application framework such as React or Vue.

## Getting started

Install the project dependencies:

```bash
# three.js
npm install --save three

# vite
npm install --save-dev vite
```

Start the Vite development server:

```bash
npx vite
```

Vite will report the local development URL in the terminal, normally:

```text
http://localhost:5173/
```

Stop the development server with `Ctrl+C`.

## Development approach

Gallery is intentionally experimental.

Individual visual problems should be solved as small, understandable studies before they are combined. Live controls are used as a visual mixing desk so that important artistic and mathematical parameters can be explored while an experiment is running.

Avoid introducing frameworks, abstraction layers or reusable infrastructure until an experiment demonstrates a concrete need for them.

Each stage should first succeed visually and technically on its own.

## Licence

Source code is licensed by Trade Control Ltd under the [GNU General Public License v3.0](https://www.gnu.org/licenses/gpl-3.0.en.html).

Artwork, concepts and documentation are licensed by Trade Control Ltd under the [Creative Commons Attribution 4.0 International License](https://creativecommons.org/licenses/by/4.0/).