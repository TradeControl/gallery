# Project context: Gallery

31 August 2026

We are beginning a new repository called **Gallery** for the **Trade Control ERP** project.

## Purpose

Gallery is an exploratory Three.js/WebGL project focused initially on creative, artistic shader experiments.

Over time, we want to apply what we learn to meaningful visual representations within Trade Control ERP—for example:

- Production processes on the shop floor
- Work moving through manufacturing stages
- Machine, resource, or capacity states
- Material and information flows
- Delays, bottlenecks, exceptions, and other operational conditions

The early work should remain playful and visually interesting. We do not yet need to force every experiment into an ERP use case, but useful connections to manufacturing and operational data should be noted when they naturally arise.

We will use ChatGPT primarily as a conceptual and creative collaborator, helping us:

- Develop visual and shader concepts
- Explain the mathematics and graphics techniques involved
- Explore alternative artistic directions
- Relate experiments to possible ERP applications
- Design maintainable implementations when we decide to build a concept
- Learn Three.js, GLSL, and real-time graphics as the project develops

## Current technical stack

- JavaScript using native ES modules
- Three.js `0.185.1`
- Vite `8.2.2`
- npm
- Git, with the current branch named `main`
- No framework such as React or Vue
- No TypeScript
- No shader-specific libraries or post-processing packages yet

Please do not assume that additional frameworks, libraries, or architectural layers are wanted. Suggest them only where they provide a clear benefit.

## Current repository state

The repository is deliberately minimal:

    Gallery/
    ├── .gitattributes
    ├── .gitignore
    ├── LICENSE
    ├── README.md
    ├── package.json
    ├── package-lock.json
    └── docs/
        └── project-context.md
    └── src/
        └── getting-started/
            ├── index.html
            └── main.js
    

`README.md` currently contains only:

    # gallery
    Trade Control Artwork

`package.json` currently contains:

    {
      "devDependencies": {
        "vite": "^8.2.2"
      },
      "dependencies": {
        "three": "^0.185.1"
      }
    }

There are currently no npm scripts, package metadata fields, linting tools, test framework, or custom Vite configuration.

## Getting-started example

The original Three.js getting-started page and JavaScript have been moved out of the repository root into:

- `src/getting-started/index.html`
- `src/getting-started/main.js`

The HTML loads its adjacent JavaScript module with:

    <script type="module" src="./main.js"></script>

When the Vite development server is running from the repository root, the example can be opened at:

    http://localhost:5173/src/getting-started/

The example has been successfully compiled with Vite.

The current `main.js` remains essentially the standard Three.js getting-started example:

- A `THREE.Scene`
- A perspective camera
- A full-window `WebGLRenderer`
- A green cube using `BoxGeometry`
- A basic unlit `MeshBasicMaterial`
- Animation through `renderer.setAnimationLoop()`
- Rotation based on the supplied animation time

## Repository observations

- Experimental source code now lives beneath `src/`.
- The starter cube is isolated in `src/getting-started/` so it can remain as a reference without occupying the main application entry point.
- There is currently no root `index.html` and no primary Gallery experience yet.
- Resize handling, device-pixel-ratio handling, resource cleanup, GUI controls, camera controls, GLSL shaders, lighting, and post-processing have not yet been added.
- `package.json` and `package-lock.json` are currently untracked Git files.
- The relocation of the starter files is also currently uncommitted.
- The repository has one commit: `Initial commit`.
- `node_modules/` and `dist/` are ignored.

## How to collaborate with us

When discussing a visual idea:

1. Start with the concept and intended feeling or meaning.
2. Explain the important visual ingredients.
3. Identify the relevant Three.js and GLSL techniques.
4. Explain unfamiliar mathematics intuitively before presenting formulas.
5. Separate essential implementation choices from optional refinements.
6. Mention possible Trade Control or manufacturing applications where genuinely relevant.
7. Preserve room for experimentation rather than prematurely designing a production ERP component.

When producing code:

- Target the versions and stack listed above.
- Prefer small, understandable experiments.
- Clearly identify new or changed files.
- Keep shader code readable.
- Explain uniforms, varyings, coordinate spaces, and animation inputs.
- Include resize and device-pixel-ratio handling where appropriate.
- Avoid introducing dependencies without explaining why they are worthwhile.
- State any assumptions made about the repository structure.
- Treat `src/getting-started/` as a reference example rather than the permanent application architecture.
- Do not assume the starter cube must be preserved in future experiments.
- Do not modify existing examples unless we explicitly decide to evolve them; prefer creating a separate experiment folder.

Please use this as the baseline context for all subsequent Gallery discussions.