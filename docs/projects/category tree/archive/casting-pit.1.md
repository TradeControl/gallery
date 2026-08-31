The shader uses a fairly simple model, but then asks texture distortion to do work that really belongs in the geometry. That is the central reason the result becomes visually confused.

### 1. The pit is a heightfield, not a physical sheet

The surface is defined by:

```glsl
h(r) = -3.0 / (1.0 + 0.6*r*r) - 0.5
```

where `r` is the horizontal distance from the origin.

This gives:

- A centre height of `-3.5`.
- A distant ground height approaching `-0.5`.
- A smooth, rotationally symmetric depression.
- No rim, lip, inner wall, throat, or casting-vessel structure.

Geometrically, the scene is simply:

```glsl
y = wellHeight(x, z)
```

It is the graph of a function over the horizontal plane: a 2.5D heightfield. It can produce a smooth bowl or gravity well, but it cannot fold underneath itself, form vertical walls, or create a genuine opening through which material falls.

The comment on line 17 says “raise sheet”, but subtracting `0.5` actually lowers the whole sheet.

### 2. It ray-marches the heightfield as though it were an SDF

`mapScene()` returns:

```glsl
p.y - wellHeight(p.xz)
```

That is vertical separation from the surface. It is not the shortest 3D distance to the surface.

The rendering loop nevertheless adds this value directly to the ray distance:

```glsl
dist += d;
```

That is sphere-tracing logic, which assumes `d` is a conservative distance estimate. Here it is not. On a steep part of the pit, the vertical separation can be substantially greater than the actual distance to the sloping surface.

Consequences can include:

- Rays stepping through the slope.
- Hits being registered only after the ray is already below the sheet.
- Surface positions varying abruptly between adjacent pixels.
- Distorted or unstable grid marks around the steepest region.
- Poor silhouettes near the horizon.

The pit profile is steep enough for this to matter. The maximum slope is greater than one, so the returned value can definitely overestimate safe travel distance.

A heightfield should instead be intersected using a bracket-and-refine method—march until the sign changes, then use bisection or secant refinement—or with deliberately conservative steps.

### 3. The “graph” is only a Cartesian texture drawn at the hit point

There is no grid geometry and no projection of a graph onto the sheet.

After finding a surface position, the shader takes its horizontal world coordinates:

```glsl
vec2 uv = pos.xz * 1.8;
```

It then feeds those coordinates through `fract()` to draw periodic lines. Conceptually, this is a flat sheet of graph paper indexed by `x` and `z`, sampled wherever the ray happens to strike the heightfield.

The surface bends downward, but the underlying grid coordinates do not. They remain horizontal Cartesian coordinates. Thus geometry and grid are related only indirectly:

```text
surface shape: y = h(x,z)
grid address:  uv = (x,z)
```

That is not necessarily wrong. If a flat marked membrane is displaced only vertically, its material coordinates could remain attached this way. But the shader then applies an additional radial UV distortion that is unrelated to the actual surface deformation.

### 4. The radial “warp” is a texture warp, not a sheet deformation

Lines 79–112 construct an inward UV displacement:

```glsl
uv = xz * 1.8;
uv += inward * radialShaped * 0.7;
```

This does not move the surface. It only changes where the grid is sampled.

There are therefore two different transformations:

- The geometry moves vertically according to the rational well profile.
- The grid moves laterally according to a separate `smoothstep` radial profile.

Those transformations are not derived from one another. They do not preserve distance, area, square shape, or material continuity.

The radial displacement is also applied in different units from the initial UV scale:

```glsl
uv = xz * 1.8;
uv += warp;       // maximum magnitude about 0.7 UV units
```

This creates a nonlinear radial remapping in which grid spacing changes with radius. When that remapped Cartesian grid is subsequently seen on a steep curved surface through a low perspective camera, cells are compressed differently in radial and tangential directions.

That combination readily produces:

- Lens-shaped cells.
- Curved lozenges.
- Apparent oval bands.
- Crowding or stretching around the well.
- Forms that resemble rings rather than a square membrane grid.

Perspective alone should make distant grid cells foreshorten into trapezoids. The unpleasant oval quality comes from combining perspective and slope with a radial texture deformation that does not correspond to the geometry.

### 5. The grid implementation has another technical weakness

The grid function uses:

```glsl
smoothstep(w, 0.0, line)
```

GLSL specifies `smoothstep` in terms of ascending edges; results are undefined when the first edge is greater than the second. Many implementations happen to produce the intended reversed transition, but it is not robust.

Also, `fwidth(line)` is taken after `min(g.x, g.y)`. The derivative becomes awkward where the nearest grid axis changes, which can worsen aliasing at intersections and in heavily compressed areas.

Those issues probably contribute to poor line quality, but they are secondary. They do not explain the overall oval geometry as strongly as the mismatched coordinate systems do.

### 6. The “flow” is just animated displacement of the entire grid

`flowField()` computes the slope of the well and combines:

```glsl
inward * 0.3 + tangential * 0.7
```

So it is predominantly a spiral, not a converging flow.

It is then multiplied by:

```glsl
sin(time * 0.4)
```

That means the flow:

- Stops when the sine crosses zero.
- Reverses direction for half of every cycle.
- Alternately spirals inward and outward.

Finally, it is added to the grid UV:

```glsl
warpedUv = uv + flowField(...)
```

There are no lava channels here. The grid itself is being wobbled. Because the displacement is strongest near the centre and includes a large tangential component, it further encourages the grid to swirl into distorted curved marks precisely where the sheet is already most compressed.

So the code currently conflates three visual roles:

- The grid revealing surface shape.
- The grid being radially stretched.
- The grid impersonating moving flow.

That makes it difficult for the viewer to understand any one of them.

## A better architecture

I would treat the piece as four distinct systems.

### 1. Define the membrane as a parametric surface

Use material coordinates `(u,v)` and construct the world-space point from them:

```text
P(u,v) = (X(u,v), H(u,v), Z(u,v))
```

The simplest version would be:

```text
P(u,v) = (u, wellHeight(u,v), v)
```

The grid is then drawn directly from `(u,v)`. It is literally printed on the membrane and remains attached to it.

If the sheet is also meant to be pulled horizontally toward the pit, add that contraction to `X` and `Z` as part of `P`. Crucially, grid and geometry then use the same mapping rather than two unrelated warps.

For maximum reliability, render this as an actual subdivided triangle mesh in WebGL/WebGPU. Vertex displacement creates the well; fragment shading draws the grid. That avoids pretending the heightfield is a signed distance field.

If it must remain a Shadertoy-style fragment shader, use reliable ray–heightfield intersection followed by root refinement.

### 2. Decide what the grid represents physically

There are two valid artistic choices:

- A graph fixed to horizontal world coordinates, revealing the height at each `(x,z)`.
- A flexible marked membrane whose squares deform with the material.

The ball-bearing spacetime demonstration normally reads as the second. That means undeformed material coordinates should travel with the vertices. The grid should not receive an independent decorative radial warp.

Surface derivatives of `P(u,v)` can then provide correct normals and also quantify how stretched the membrane has become.

### 3. Make lava a separate transport system

Lava should have its own scalar field or channel network—not alter the grid coordinates.

A good first model would:

- Establish several channels in the outer material coordinates.
- Advect their luminous pulses downhill using `-∇H`.
- Allow nearby channels to merge as they approach the centre.
- Render the channels as emissive grooves or ribbons on the sheet.
- Increase brightness, width, and velocity as flows converge.

The flow direction should remain inward. Time should move pulses along the channels, not periodically reverse the entire velocity field.

Some tangential motion could remain as a small artistic influence, but `70%` tangential produces an accretion-disc spiral rather than material falling into a casting pit.

### 4. Give the centre a deliberate transition from sheet to pit

A heightfield can make a depression, but it cannot by itself show material leaving the sheet and falling into an opening.

The architecture should therefore contain an explicit transition:

```text
outer membrane
    → steep converging depression
    → central throat or casting mouth
    → falling lava ribbons/particles
    → luminous crucible or mould below
```

The throat and interior can be separate geometry: a mesh, cylinder/bell-shaped SDF, or analytical surface. Lava channels stay attached to the membrane until they reach the throat; after that point they become true 3D falling streams.

That separation solves the conceptual problem cleanly. The sheet communicates deformation, the grid explains the sheet, and the lava obeys the surface before visibly leaving it.

In short: the shader does contain a recognisable gravity-well heightfield, but the graph is not being geometrically deformed with a membrane. It is a flat Cartesian texture subjected to an unrelated radial UV warp, animated by a reversing spiral displacement, and sampled at potentially inaccurate ray-marched intersections. The ugly ovals are therefore not evidence that the spacetime-sheet idea is inherently difficult—they are a consequence of asking one distorted texture coordinate to represent the sheet, its deformation, and its flows simultaneously.