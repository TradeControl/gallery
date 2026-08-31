
// Grid in UV space (not world units)
float gridLines(vec2 uv) {
    vec2 g = abs(fract(uv) - 0.5);
    float line = min(g.x, g.y);
    float w = fwidth(line) * 1.2;
    return smoothstep(w, 0.0, line);
}

float wellHeight(vec2 xz) {
    float r = length(xz);

    // Strong curvature: deep centre, steep slope
    float depth = 3.0;                 // was 1.2
    float h = -depth / (1.0 + r*r*0.6); // steeper falloff

    return h - 0.5; // raise sheet so it's not buried
}

// Stable spiral flow around the origin (the well)
vec2 flowField(vec2 xz, float time) {
    float e = 0.05;

    float h  = wellHeight(xz);
    float hx = wellHeight(xz + vec2(e, 0.0));
    float hz = wellHeight(xz + vec2(0.0, e));

    vec2 grad = vec2(hx - h, hz - h);   // slope of the well

    vec2 inward = normalize(-grad + 1e-6);
    vec2 tang   = vec2(-inward.y, inward.x);

    float r       = length(xz);
    float falloff = exp(-r * 0.7);

    float phase = sin(time * 0.4);

    vec2 flow = (inward * 0.3 + tang * 0.7) * falloff * 0.4 * phase;
    return flow;
}

// Rubber Sheet Well v1 — clean gravity depression
float mapScene(vec3 p) {
    return p.y - wellHeight(p.xz);
}

vec3 shadeSheet(vec3 pos, vec3 ro) {

    // --- BASIC GEOMETRY -----------------------------------------------------

    vec2 xz = pos.xz;
    float h = wellHeight(xz);

    float e = 0.02;
    float hx = wellHeight(xz + vec2(e, 0.0));
    float hz = wellHeight(xz + vec2(0.0, e));
    vec3 n = normalize(vec3(h - hx, e, h - hz));

    float r = length(xz);


    // --- BASE LIGHTING ------------------------------------------------------

    vec3 base = mix(vec3(0.35), vec3(0.15), smoothstep(0.0, 4.0, r));

    vec3 l = normalize(vec3(-0.4, 1.3, 0.3));
    float diff = max(dot(n, l), 0.0) * 1.4;

    float ambient = 0.15;

    vec3 v = normalize(ro - pos);
    float spec = pow(max(dot(reflect(-l, n), v), 0.0), 32.0) * 0.2;

    float rim = pow(1.0 - max(dot(n, -v), 0.0), 3.0) * 0.25;

    vec3 col = base * (ambient + diff) + spec + rim;


    // --- PURE RADIAL WARP (NO BANDS) ---------------------------------------
    //
    // We now *declare* a monotonic radial profile:
    //   - 0 warp at centre
    //   - smoothly increasing toward some radius
    //   - flat beyond that
    //
    // Because this depends only on r and is strictly increasing,
    // there are no internal level sets → no compression rings.

    float r0 = 0.0;   // centre
    float r1 = 4.0;   // where warp reaches full strength

    // Smooth radial ramp: 0 at r0, 1 at r1, clamped
    float radial = smoothstep(r0, r1, r);

    // Shape it a bit so it eases in and out nicely
    float radialShaped = radial * radial;          // softer near centre
    radialShaped = mix(radialShaped, radial, 0.3); // keep some linearity

    // Direction: always inward
    vec2 inward = normalize(-xz + 1e-6);

    // Final warp magnitude
    float warpStrength = 0.7;   // main tuning knob
    vec2 warp = inward * radialShaped * warpStrength;


    // --- UV & GRID ----------------------------------------------------------

    vec2 uv = xz * 1.8;

    // Apply pure radial warp
    uv += warp;

    // Flow rides on top
    vec2 warpedUv = uv + flowField(xz, iTime);

    float grid = gridLines(warpedUv);
    col = mix(col, vec3(0.0), grid * 0.8);

    return col;
}

// Ground-level camera with visible horizon
void mainImage(out vec4 fragColor, in vec2 fragCoord) {
    vec2 uv = (fragCoord - 0.5 * iResolution.xy) / iResolution.y;

    float t = iTime * 0.05;

    // Camera on the ground, human height, looking across the land
    vec3 ro = vec3(
        0.0,     // x: centred
        1.6,     // y: human eye height
        6.0      // z: pulled back to see horizon + well
    );

    // Look slightly downward toward the well
    vec3 target = vec3(0.0, -0.5, 0.0);

    // Build camera basis
    vec3 fwd = normalize(target - ro);
    vec3 right = normalize(cross(vec3(0,1,0), fwd));
    vec3 up = cross(fwd, right);

    // Perspective ray
    vec3 rd = normalize(fwd + uv.x * right + uv.y * up);

    // Sky gradient
    vec3 sky = mix(vec3(0.75, 0.8, 0.9), vec3(0.45, 0.5, 0.6), uv.y + 0.2);
    vec3 color = sky;

    float dist = 0.0;
    float hit = 0.0;

    for (int i = 0; i < 160; i++) {
        vec3 p = ro + rd * dist;
        float d = mapScene(p);
        if (d < 0.001) { hit = 1.0; break; }
        if (dist > 80.0) break;
        dist += d;
    }

    if (hit > 0.5) {
        vec3 pos = ro + rd * dist;
        color = shadeSheet(pos, ro);
    }

    fragColor = vec4(color, 1.0);
}