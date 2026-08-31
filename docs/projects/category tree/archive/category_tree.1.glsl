// @uniform float iTime 0.0 0.0 1000.0
// @uniform vec2 iResolution [800.0, 600.0] [1.0, 1.0] [4000.0, 4000.0]

// "The Category Tree — Version 6: Organic Recursion"
// Trade Control Ltd - Logic Engine v6

#define ITERATIONS 12
#define PI 3.14159265

mat2 rot(float a) {
    float s = sin(a), c = cos(a);
    return mat2(c, -s, s, c);
}

float hash3(vec3 p) {
    p = fract(p * 0.3183099 + 0.1);
    p *= 17.0;
    return fract(p.x * p.y * p.z * (p.x + p.y + p.z));
}

float noise3(vec3 p) {
    vec3 i = floor(p);
    vec3 f = fract(p);
    f = f * f * (3.0 - 2.0 * f);

    float n000 = hash3(i + vec3(0,0,0));
    float n100 = hash3(i + vec3(1,0,0));
    float n010 = hash3(i + vec3(0,1,0));
    float n110 = hash3(i + vec3(1,1,0));
    float n001 = hash3(i + vec3(0,0,1));
    float n101 = hash3(i + vec3(1,0,1));
    float n011 = hash3(i + vec3(0,1,1));
    float n111 = hash3(i + vec3(1,1,1));

    float nx00 = mix(n000, n100, f.x);
    float nx10 = mix(n010, n110, f.x);
    float nx01 = mix(n001, n101, f.x);
    float nx11 = mix(n011, n111, f.x);

    float nxy0 = mix(nx00, nx10, f.y);
    float nxy1 = mix(nx01, nx11, f.y);

    return mix(nxy0, nxy1, f.z);
}

float groundHeight(vec2 xz) {
    // Base undulation
    float h = 0.0;
    float r = length(xz);

    // Gentle terrain
    h += 0.15 * sin(xz.x * 0.7) * sin(xz.y * 0.6);
    h += 0.08 * noise3(vec3(xz * 0.8, 0.0));

    // Casting pit centred near tree
    vec2 pitCenter = vec2(0.0, 0.0);
    float pr = length(xz - pitCenter);

    // Pit profile: shallow rim, deeper centre
    float pit = smoothstep(1.8, 0.4, pr) * 0.6; // depression
    h -= pit;

    // Slight asymmetry / hand‑made feel
    h -= 0.12 * smoothstep(0.6, 0.0, pr) * sin(xz.x * 1.7 + xz.y * 1.3);

    return h - 1.5; // shift to roughly match your old plane
}


float larvaFlowMask(vec2 xz) {
    vec2 pitCenter = vec2(0.0, 0.0);
    vec2 q = xz - pitCenter;
    float r = length(q);

    // Angular modulation: channels, not uniform ring
    float ang = atan(q.y, q.x);
    float band = sin(ang * 5.0 + iTime * 0.4) * 0.5 + 0.5;

    // Radial falloff toward pit
    float radial = smoothstep(2.8, 0.3, r);

    // Flow noise warped inward
    vec2 flowDirBase = -q + 0.4 * vec2(
        sin(iTime * 0.3 + r * 1.2),
        cos(iTime * 0.25 + r * 1.1)
    );
    float fdLen = max(length(flowDirBase), 0.001);
    vec2 flowDir = flowDirBase / fdLen;
    
    vec2 uv = xz + flowDir * 0.4 * radial;
    float n = noise3(vec3(uv * 1.6, iTime * 0.2));

    float m = smoothstep(0.45, 0.85, n) * band * radial;
    return m;
}

vec3 shadeGround(vec3 pos, vec3 ro) {
    vec2 xz = pos.xz;
    float h = groundHeight(xz);

    // Normal from heightfield (cheap approximation)
    float e = 0.02;
    float hx = groundHeight(xz + vec2(e, 0.0));
    float hz = groundHeight(xz + vec2(0.0, e));
    vec3 n = normalize(vec3(h - hx, e, h - hz));

    // Base stone
    float n1 = noise3(vec3(xz * 0.7, 0.0));
    float n2 = noise3(vec3(xz * 1.8, 1.3));
    float stoneMask = smoothstep(0.2, 0.8, n1);
    vec3 stone = mix(vec3(0.05, 0.05, 0.06), vec3(0.12, 0.11, 0.13), stoneMask);
    stone -= n2 * 0.03;

    // Soot / burn near pit
    float pr = length(xz);
    float soot = smoothstep(1.8, 0.2, pr);
    stone = mix(stone, vec3(0.01, 0.01, 0.012), soot);

    // Larva emissive channels
    float larva = larvaFlowMask(xz);
    float pulse = 0.5 + 0.5 * sin(iTime * 1.4 + pr * 2.0);
    vec3 larvaColor = mix(vec3(1.0, 0.55, 0.12), vec3(0.35, 0.8, 1.0), 0.35);
    vec3 emissive = larvaColor * larva * 0.25;

    // Fused glass at pit bottom
    float glass = smoothstep(0.6, 0.0, pr); // strongest near centre
    vec3 l = normalize(vec3(-0.4, 0.8, 0.2));
    float diff = max(dot(n, l), 0.0);
    vec3 v = normalize(ro - pos);
    float spec = pow(max(dot(reflect(-l, n), v), 0.0), 32.0);
    vec3 glassCol = vec3(0.02, 0.03, 0.04);
    vec3 ground = mix(stone, glassCol, glass);
    ground *= 0.25 + 0.75 * diff;
    ground += vec3(0.9, 0.8, 0.6) * spec * glass * 0.7;

    // Subtle fog tint near pit
    float fog = smoothstep(3.5, 0.4, pr);
    ground = mix(ground, ground * vec3(0.7, 0.8, 0.9), fog * 0.3);

    ground = ground * 0.8 + vec3(0.05, 0.06, 0.07);

    return ground + emissive;
}

// --- The Tree of Logic (Distance Function) ---
float map(vec3 p) {
    float ground = p.y - groundHeight(p.xz);

    // Domain warp for organic feel
    vec3 wp = p;
    float t = iTime * 0.4;
    wp.xz += 0.15 * vec2(
        sin(p.y * 1.7 + t),
        cos(p.y * 1.3 - t * 0.7)
    );
    wp.y += 0.1 * sin(p.x * 1.9 + t * 0.6);

    wp.x += 1.0;

    float d = 1e10;
    float s = 1.0;

    // Trunk with slight wobble
    float trunkR = 0.22 * (1.2 - wp.y * 0.3);
    trunkR += 0.03 * sin(wp.y * 4.0 + t);
    float trunk = length(wp.xz) - trunkR;
    d = min(d, max(trunk, wp.y - 2.5));

    // Recursive branching
    vec3 bp = wp;
    for (int i = 0; i < ITERATIONS; i++) {
        float fi = float(i);

        bp.y -= 0.45 * s;
        float sway = 0.25 * sin(t * 0.6 + fi * 1.3);
        bp.xy *= rot(0.25 + sway);
        bp.xz *= rot(PI * 0.5 + 0.15 * sin(fi * 2.1 + t * 0.3));

        // Asymmetry and pollarding
        bp.x = abs(bp.x) - (0.38 * s + 0.05 * sin(fi * 3.7 + t));

        float branch = length(bp.xz) - (0.03 * s + 0.01 * sin(fi * 5.1));
        d = min(d, branch);

        s *= 0.78;
        if (bp.y < 0.0) break;
    }

    return min(d, ground);
}

// --- Normal estimation ---
vec3 getNormal(vec3 p) {
    float e = 0.001;
    vec2 h = vec2(e, 0.0);
    float d = map(p);
    vec3 n = vec3(
        map(p + h.xyy) - d,
        map(p + h.yxy) - d,
        map(p + h.yyx) - d
    );
    return normalize(n);
}

// Soft shadow
float softShadow(vec3 ro, vec3 rd) {
    float res = 1.0;
    float t = 0.02;
    for (int i = 0; i < 40; i++) {
        float h = map(ro + rd * t);
        if (h < 0.001) return 0.0;
        res = min(res, 10.0 * h / t);
        t += clamp(h, 0.02, 0.3);
        if (t > 20.0) break;
    }
    return clamp(res, 0.0, 1.0);
}

// Ambient occlusion
float ambientOcclusion(vec3 p, vec3 n) {
    float ao = 0.0;
    float sca = 1.0;
    for (int i = 0; i < 5; i++) {
        float h = 0.03 + 0.07 * float(i);
        float d = map(p + n * h);
        ao += (h - d) * sca;
        sca *= 0.7;
    }
    return clamp(1.0 - ao * 1.2, 0.0, 1.0);
}

void mainImage(out vec4 fragColor, in vec2 fragCoord) {
    vec2 uv = (fragCoord - 0.5 * iResolution.xy) / iResolution.y;

    // Camera path: slow, ceremonial orbit
    float t_path = iTime * 0.15;
    float radius = 4.5 + 0.3 * sin(iTime * 0.2);
    vec3 ro = vec3(
        radius * cos(t_path),
        1.2 + 0.4 * sin(t_path * 0.5),
        radius * sin(t_path)
    );
    vec3 target = vec3(-0.5, 1.0, 0.0);

    vec3 fwd = normalize(target - ro);
    vec3 right = normalize(cross(vec3(0,1,0), fwd));
    vec3 up = cross(fwd, right);
    vec3 rd = normalize(fwd + uv.x * right + uv.y * up);

    // Raymarch
    float t = 0.0;
    float glow = 0.0;
    float hit = 0.0;

    for (int i = 0; i < 100; i++) {
        vec3 p = ro + rd * t;
        float d = map(p);

        if (d < 0.001) { hit = 1.0; break; }
        if (t > 30.0) break;

        // Node bands: recursive canopy
        float band = sin(p.y * 5.5 + sin(p.x * 3.0)) * sin(length(p.xz) * 3.5);
        float nodeMask = smoothstep(0.55, 0.9, band) * step(1.1, p.y);
        glow += nodeMask * exp(-d * 9.0);

        t += d;
    }

    vec3 pos = ro + rd * t;

    // Background base
    vec3 color = mix(vec3(0.004, 0.018, 0.035), vec3(0.0), length(uv));

    // Background mythic-industrial silhouettes
    float depth = 1.0 - clamp(length(uv) * 0.85, 0.0, 1.0);
    float cityBands = step(-0.1, uv.y) * smoothstep(0.15, 0.75, uv.y);
    float spirePattern = step(0.0, sin(uv.x * 40.0 + sin(uv.y * 10.0))) * cityBands * depth;
    vec3 cityColor = vec3(0.01, 0.045, 0.08);
    color = mix(color, cityColor, 0.6 * spirePattern);

    if (hit > 0.5) {
        if (pos.y < groundHeight(pos.xz) + 0.02) {
            float gh = groundHeight(pos.xz);
            float lf = larvaFlowMask(pos.xz);
            color = vec3(0.2 + 0.4 * gh, lf, lf); // just a debug view
        } else {
            // Organism shading
            vec3 n = getNormal(pos);
            vec3 l = normalize(vec3(-0.4, 0.8, 0.2));
            float diff = max(dot(n, l), 0.0);
            float sh = softShadow(pos + n * 0.01, l);
            float ao = ambientOcclusion(pos, n);

            // Multi-layer pulse
            float pulse1 = sin(pos.y * 7.0 - iTime * 3.5) * 0.5 + 0.5;
            float pulse2 = sin(pos.y * 2.3 + iTime * 1.2) * 0.5 + 0.5;
            float pulse = mix(pulse1, pulse2, 0.5);

            // Base stone with noise
            float n1 = noise3(pos * 3.0);
            float n2 = noise3(pos * 7.0 + vec3(3.1, 1.7, -2.4));
            float stoneMask = smoothstep(0.2, 0.8, n1);
            vec3 stone = mix(vec3(0.01, 0.01, 0.015), vec3(0.03, 0.025, 0.035), stoneMask);
            stone += n2 * 0.04;

            // Molten veins
            float vein = sin(pos.x * 16.0 + pos.y * 9.0 + iTime * 3.0);
            vein += 0.4 * sin(pos.z * 11.0 - iTime * 2.2);
            vein = smoothstep(0.6, 0.9, vein);
            vec3 molten = vec3(1.0, 0.48, 0.08) * vein * pulse;

            // Circuitry veins
            float circuit = sin(pos.z * 20.0 - pos.y * 13.0 + iTime * 2.0);
            circuit += 0.5 * sin(pos.x * 9.0 + iTime * 1.7);
            circuit = smoothstep(0.7, 0.95, circuit);
            vec3 circuitry = vec3(0.12, 0.65, 1.0) * circuit * (1.0 - pulse);

            vec3 base = stone + molten + circuitry;

            // Lighting
            float spec = pow(max(dot(reflect(-l, n), -normalize(ro - pos)), 0.0), 16.0);
            base *= (0.25 + 0.75 * diff * sh) * ao;
            base += vec3(1.0, 0.8, 0.5) * spec * 0.4;

            color = base;
        }
    }

    // Node glow
    float nodeFlicker = hash3(vec3(floor(iTime * 15.0), 0.0, 0.0)) * 0.5 + 0.5;
    vec3 nodeColor = mix(vec3(1.0, 0.7, 0.2), vec3(0.5, 0.85, 1.0), 0.5 + 0.5 * sin(iTime * 0.7));
    color += nodeColor * glow * 0.14 * nodeFlicker;

    // Atmospheric shafts
    color += vec3(0.1, 0.2, 0.3) * pow(max(0.0, rd.y + 0.2), 2.0) * 0.22;

    fragColor = vec4(clamp(color, 0.0, 1.0), 1.0);
}