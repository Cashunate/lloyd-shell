'use client';

import { Canvas, useFrame } from '@react-three/fiber';
import { useTexture } from '@react-three/drei';
import { Suspense, useEffect, useMemo, useRef, useState } from 'react';
import * as THREE from 'three';

export type OrbState = 'idle' | 'listening' | 'thinking' | 'speaking';

interface LloydOrbProps {
  state: OrbState;
  /** 0..1 — drives orb pulse from voice activity (mic input or TTS output) */
  amplitude?: number;
  /** Show the Cashu mark at the orb's core. Default true (the app). The
   *  product-marketing site renders the orb WITHOUT the logo (showLogo=false)
   *  — pure energy, no Cashu branding. */
  showLogo?: boolean;
}

/**
 * State-reactive palette. Each of Lloyd's modes gets its own hue so the orb
 * *reads* emotionally at a glance — calm electric blue at rest, alert cyan
 * when listening, a processing violet while thinking, bright sky when he
 * speaks. Every material lerps toward the active state's colour each frame,
 * so transitions feel alive rather than snapping.
 */
const STATE_COLOR: Record<OrbState, THREE.Color> = {
  idle: new THREE.Color('#2f6fed'),
  listening: new THREE.Color('#22d3ee'),
  thinking: new THREE.Color('#8b5cf6'),
  speaking: new THREE.Color('#56b8ff'),
};

/** Slightly brighter accent used for highlights / rim glow. */
const STATE_ACCENT: Record<OrbState, THREE.Color> = {
  idle: new THREE.Color('#9ec5ff'),
  listening: new THREE.Color('#a5f3fc'),
  thinking: new THREE.Color('#c4b5fd'),
  speaking: new THREE.Color('#dbeeff'),
};

/** Hex versions of the state palette for the CSS under-glow. */
const STATE_HEX: Record<OrbState, string> = {
  idle: '#2f6fed',
  listening: '#22d3ee',
  thinking: '#8b5cf6',
  speaking: '#56b8ff',
};

/** Base under-glow opacity per state — amplitude adds on top. */
const STATE_GLOW: Record<OrbState, number> = {
  idle: 0.10,
  listening: 0.16,
  thinking: 0.18,
  speaking: 0.20,
};

export function LloydOrb({ state, amplitude = 0, showLogo = true }: LloydOrbProps) {
  // Size-aware density. At header size (~56px) the full 24k-particle field
  // reads as congestion — per Nathan's preview feedback — so we measure the
  // container and switch to a "compact" rendition below 120px: most
  // particles culled in-shader, survivors slightly enlarged, and the outer
  // wireframe + orbit rings dropped (pure noise at that scale). The full
  // scene stays untouched at hero size.
  const wrapRef = useRef<HTMLDivElement>(null);
  const [compact, setCompact] = useState(false);
  useEffect(() => {
    const el = wrapRef.current;
    if (!el || typeof ResizeObserver === 'undefined') return;
    const ro = new ResizeObserver((entries) => {
      const w = entries[0]?.contentRect.width ?? 0;
      setCompact(w > 0 && w < 120);
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  return (
    <div ref={wrapRef} className="relative w-full h-full">
      {/* The orb's light cast onto the page — a state-colored radial bloom
          behind the canvas so the orb reads as physically present in the
          interface rather than pasted on. Shape/transitions live in
          globals.css (.orb-underglow); color + intensity tracked here. */}
      <div
        className="orb-underglow"
        aria-hidden
        style={{
          background: `radial-gradient(circle, ${STATE_HEX[state]} 0%, transparent 62%)`,
          opacity: Math.min(0.35, STATE_GLOW[state] + amplitude * 0.15),
        }}
      />
      <Canvas
        camera={{ position: [0, 0, 4.5], fov: 50 }}
        dpr={[1, 2]}
        gl={{ antialias: true, alpha: true }}
        style={{ background: 'transparent' }}
      >
        <ambientLight intensity={0.15} />
        <pointLight position={[3, 3, 5]} intensity={0.6} color="#4a9eff" />
        <pointLight position={[-3, -2, 4]} intensity={0.4} color="#1a4d8c" />

        <GlowShell state={state} amplitude={amplitude} />
        <InnerShell state={state} amplitude={amplitude} />
        {!compact && <OuterShell state={state} amplitude={amplitude} />}
        <ParticleCloud state={state} amplitude={amplitude} compact={compact} />
        {!compact && <OrbitRings state={state} amplitude={amplitude} />}
        {/* The Cashu mark at the heart of the orb. Suspense because the
            texture loads async; the orb simply renders without the mark
            for the first frames. */}
        {showLogo && (
          <Suspense fallback={null}>
            <LogoCore state={state} amplitude={amplitude} compact={compact} />
          </Suspense>
        )}
      </Canvas>
    </div>
  );
}

/**
 * The Cashu mark, rendered as light at the orb's heart. A camera-facing
 * sprite (always readable from any orb rotation) carrying the white-on-
 * transparent glyph texture, additively blended and tinted live to the
 * state accent — so the logo IS part of the hologram, breathing with the
 * idle pulse and flaring slightly on voice, never a sticker on top.
 *
 * The mark IS the centrepiece — the old core-spark sphere was removed
 * once it landed (it read as a stray grey ball through the glyph's
 * cutout). The rim glow + inner shell carry the lit-from-within feel.
 * At compact size the mark becomes MORE prominent — a clean identity
 * read at 56px where particle detail can't land.
 */
function LogoCore({ state, amplitude, compact }: { state: OrbState; amplitude: number; compact: boolean }) {
  const tex = useTexture('/cashu-mark.png');
  const spriteRef = useRef<THREE.Sprite>(null);
  const matRef = useRef<THREE.SpriteMaterial>(null);

  // Correct colour space + a touch of anisotropy so the mark's edges stay
  // crisp as the orb breathes.
  useMemo(() => {
    tex.colorSpace = THREE.SRGBColorSpace;
    tex.anisotropy = 4;
  }, [tex]);

  useFrame((clock) => {
    const t = clock.clock.elapsedTime;
    const sprite = spriteRef.current;
    const mat = matRef.current;
    if (!sprite || !mat) return;
    // Breathing + voice flare, same rhythm as the core spark so the two
    // read as one object. Sized to extend past the core-spark glow into
    // the darker zone inside the inner shell — additive marks vanish on
    // top of an already-bright core (the first-ship bug), so the glyph
    // must own more radius than the spark.
    const base = compact ? 1.5 : 1.15;
    const breathe = 1 + Math.sin(t * 0.9) * 0.025;
    sprite.scale.setScalar(base * breathe * (1 + amplitude * 0.1));
    mat.color.lerp(STATE_ACCENT[state], 0.06);
    const targetOpacity = (compact ? 1.0 : 0.95) + amplitude * 0.05;
    mat.opacity += (Math.min(1, targetOpacity) - mat.opacity) * 0.1;
  });

  return (
    <sprite ref={spriteRef} renderOrder={10}>
      <spriteMaterial
        ref={matRef}
        map={tex}
        transparent
        opacity={0.95}
        depthWrite={false}
        depthTest={false}
        blending={THREE.AdditiveBlending}
        color="#9ec5ff"
      />
    </sprite>
  );
}

/**
 * Fresnel rim-glow shell — a soft halo that lights up at the silhouette edge,
 * giving the orb that holographic, lit-from-within look without a
 * post-processing bloom pass (keeps us off an extra dependency). The rim
 * intensity rises with voice amplitude, so Lloyd visibly "flares" when he
 * speaks or hears you.
 */
function GlowShell({ state, amplitude }: { state: OrbState; amplitude: number }) {
  const matRef = useRef<THREE.ShaderMaterial>(null);

  const material = useMemo(
    () =>
      new THREE.ShaderMaterial({
        transparent: true,
        blending: THREE.AdditiveBlending,
        depthWrite: false,
        side: THREE.FrontSide,
        uniforms: {
          uColor: { value: STATE_ACCENT.idle.clone() },
          uIntensity: { value: 0.6 },
          uPower: { value: 2.4 },
        },
        vertexShader: /* glsl */ `
          varying vec3 vNormal;
          varying vec3 vView;
          void main() {
            vNormal = normalize(normalMatrix * normal);
            vec4 mv = modelViewMatrix * vec4(position, 1.0);
            vView = normalize(-mv.xyz);
            gl_Position = projectionMatrix * mv;
          }
        `,
        fragmentShader: /* glsl */ `
          uniform vec3 uColor;
          uniform float uIntensity;
          uniform float uPower;
          varying vec3 vNormal;
          varying vec3 vView;
          void main() {
            float fres = pow(1.0 - max(dot(vNormal, vView), 0.0), uPower);
            gl_FragColor = vec4(uColor, fres * uIntensity);
          }
        `,
      }),
    [],
  );

  useFrame(() => {
    const m = matRef.current;
    if (!m) return;
    (m.uniforms.uColor.value as THREE.Color).lerp(STATE_ACCENT[state], 0.06);
    const targetIntensity =
      (state === 'speaking' ? 1.1 : state === 'thinking' ? 0.95 : state === 'listening' ? 0.8 : 0.55) +
      amplitude * 0.9;
    m.uniforms.uIntensity.value += (targetIntensity - m.uniforms.uIntensity.value) * 0.1;
  });

  return (
    <mesh scale={1.05}>
      <sphereGeometry args={[1, 48, 48]} />
      <primitive ref={matRef} object={material} attach="material" />
    </mesh>
  );
}

/** Wireframe icosahedron — rotates with the spark */
function InnerShell({ state, amplitude }: { state: OrbState; amplitude: number }) {
  const meshRef = useRef<THREE.Mesh>(null);
  const matRef = useRef<THREE.MeshBasicMaterial>(null);

  useFrame((_, delta) => {
    if (!meshRef.current || !matRef.current) return;
    meshRef.current.rotation.y += delta * 0.2;
    meshRef.current.rotation.x += delta * 0.08;

    const targetScale = 0.85 + amplitude * 0.12;
    meshRef.current.scale.lerp(new THREE.Vector3(targetScale, targetScale, targetScale), 0.1);

    const baseOpacity =
      state === 'speaking' ? 0.5 : state === 'thinking' ? 0.4 : state === 'listening' ? 0.35 : 0.2;
    matRef.current.opacity += (baseOpacity + amplitude * 0.3 - matRef.current.opacity) * 0.1;
    matRef.current.color.lerp(STATE_COLOR[state], 0.05);
  });

  return (
    <mesh ref={meshRef}>
      <icosahedronGeometry args={[1, 2]} />
      <meshBasicMaterial
        ref={matRef}
        color="#4a9eff"
        wireframe
        transparent
        opacity={0.3}
        blending={THREE.AdditiveBlending}
        depthWrite={false}
      />
    </mesh>
  );
}

/** Larger wireframe shell rotating opposite */
function OuterShell({ state, amplitude }: { state: OrbState; amplitude: number }) {
  const meshRef = useRef<THREE.Mesh>(null);
  const matRef = useRef<THREE.MeshBasicMaterial>(null);

  useFrame((_, delta) => {
    if (!meshRef.current || !matRef.current) return;
    meshRef.current.rotation.y -= delta * 0.12;
    meshRef.current.rotation.z += delta * 0.06;

    const targetScale = 1.2 + amplitude * 0.15;
    meshRef.current.scale.lerp(new THREE.Vector3(targetScale, targetScale, targetScale), 0.1);

    const baseOpacity =
      state === 'speaking' ? 0.35 : state === 'thinking' ? 0.3 : state === 'listening' ? 0.25 : 0.15;
    matRef.current.opacity += (baseOpacity + amplitude * 0.2 - matRef.current.opacity) * 0.1;
    matRef.current.color.lerp(STATE_ACCENT[state], 0.05);
  });

  return (
    <mesh ref={meshRef}>
      <icosahedronGeometry args={[1, 3]} />
      <meshBasicMaterial
        ref={matRef}
        color="#6bb6ff"
        wireframe
        transparent
        opacity={0.2}
        blending={THREE.AdditiveBlending}
        depthWrite={false}
      />
    </mesh>
  );
}

/**
 * GPU particle field — the orb's halo as a murmuration, not a shell.
 *
 * Every particle's motion is computed in the VERTEX SHADER, so the count is
 * essentially free: 24,000 particles cost less than the old 2,200 because
 * the CPU no longer touches a position buffer per frame. The buffer holds
 * only static base positions + per-particle seeds; all animation derives
 * from uniforms.
 *
 * State is a BEHAVIOR, not just a hue. The shader crossfades four motion
 * programs via uStateMix (idle, listening, thinking, speaking):
 *   idle      — slow breathing + gentle curl-noise drift, occasional firefly
 *   listening — the field leans inward: tighter radius, attentive stillness
 *   thinking  — differential rotation braids the cloud into orbiting strands
 *   speaking  — expanding ripple rings driven by the voice bands
 *
 * Voice "bands" are derived from the single amplitude signal on the CPU:
 *   low  = slow EMA (the energy floor — drives overall expansion)
 *   mid  = amplitude above the floor (syllable energy — drives ripples)
 *   high = frame-to-frame transient (consonant snap — drives sparkle)
 * Honest engineering note: these are temporal bands, not a true FFT — but
 * they decompose speech visibly into three distinct motions, which is what
 * the eye actually reads.
 */
const PARTICLE_COUNT = 24000;

/** Ashima 3D simplex noise — the standard GLSL implementation. */
const GLSL_SNOISE = /* glsl */ `
  vec3 mod289(vec3 x) { return x - floor(x * (1.0 / 289.0)) * 289.0; }
  vec4 mod289(vec4 x) { return x - floor(x * (1.0 / 289.0)) * 289.0; }
  vec4 permute(vec4 x) { return mod289(((x * 34.0) + 1.0) * x); }
  vec4 taylorInvSqrt(vec4 r) { return 1.79284291400159 - 0.85373472095314 * r; }
  float snoise(vec3 v) {
    const vec2 C = vec2(1.0 / 6.0, 1.0 / 3.0);
    const vec4 D = vec4(0.0, 0.5, 1.0, 2.0);
    vec3 i = floor(v + dot(v, C.yyy));
    vec3 x0 = v - i + dot(i, C.xxx);
    vec3 g = step(x0.yzx, x0.xyz);
    vec3 l = 1.0 - g;
    vec3 i1 = min(g.xyz, l.zxy);
    vec3 i2 = max(g.xyz, l.zxy);
    vec3 x1 = x0 - i1 + C.xxx;
    vec3 x2 = x0 - i2 + C.yyy;
    vec3 x3 = x0 - D.yyy;
    i = mod289(i);
    vec4 p = permute(permute(permute(i.z + vec4(0.0, i1.z, i2.z, 1.0))
        + i.y + vec4(0.0, i1.y, i2.y, 1.0)) + i.x + vec4(0.0, i1.x, i2.x, 1.0));
    float n_ = 0.142857142857;
    vec3 ns = n_ * D.wyz - D.xzx;
    vec4 j = p - 49.0 * floor(p * ns.z * ns.z);
    vec4 x_ = floor(j * ns.z);
    vec4 y_ = floor(j - 7.0 * x_);
    vec4 x = x_ * ns.x + ns.yyyy;
    vec4 y = y_ * ns.x + ns.yyyy;
    vec4 h = 1.0 - abs(x) - abs(y);
    vec4 b0 = vec4(x.xy, y.xy);
    vec4 b1 = vec4(x.zw, y.zw);
    vec4 s0 = floor(b0) * 2.0 + 1.0;
    vec4 s1 = floor(b1) * 2.0 + 1.0;
    vec4 sh = -step(h, vec4(0.0));
    vec4 a0 = b0.xzyw + s0.xzyw * sh.xxyy;
    vec4 a1 = b1.xzyw + s1.xzyw * sh.zzww;
    vec3 p0 = vec3(a0.xy, h.x);
    vec3 p1 = vec3(a0.zw, h.y);
    vec3 p2 = vec3(a1.xy, h.z);
    vec3 p3 = vec3(a1.zw, h.w);
    vec4 norm = taylorInvSqrt(vec4(dot(p0, p0), dot(p1, p1), dot(p2, p2), dot(p3, p3)));
    p0 *= norm.x; p1 *= norm.y; p2 *= norm.z; p3 *= norm.w;
    vec4 m = max(0.6 - vec4(dot(x0, x0), dot(x1, x1), dot(x2, x2), dot(x3, x3)), 0.0);
    m = m * m;
    return 42.0 * dot(m * m, vec4(dot(p0, x0), dot(p1, x1), dot(p2, x2), dot(p3, x3)));
  }
`;

const PARTICLE_VERTEX = /* glsl */ `
  ${GLSL_SNOISE}
  attribute float aSeed;
  attribute float aRadius;
  uniform float uTime;
  uniform float uPixelRatio;
  uniform float uMotionScale;   /* 1 normally, ~0.2 under prefers-reduced-motion */
  uniform float uKeep;          /* fraction of particles drawn — <1 at small sizes */
  uniform float uSizeBoost;     /* point-size multiplier — >1 at small sizes */
  uniform vec4 uStateMix;       /* idle, listening, thinking, speaking */
  uniform float uBandLow;
  uniform float uBandMid;
  uniform float uBandHigh;
  varying float vIntensity;

  void main() {
    /* Density culling for small canvases: seeds above the keep-fraction are
       clipped out entirely. The header orb keeps ~1/5 of the field so it
       reads as a sparkle, not congestion. */
    if (aSeed > uKeep) {
      vIntensity = 0.0;
      gl_Position = vec4(2.0, 2.0, 2.0, 1.0);
      gl_PointSize = 0.0;
      return;
    }
    vec3 p = position;
    float t = uTime;
    float wIdle = uStateMix.x;
    float wListen = uStateMix.y;
    float wThink = uStateMix.z;
    float wSpeak = uStateMix.w;

    /* --- curl-noise drift (always on, scaled by state energy) --- */
    float drift = (0.05 + uBandLow * 0.10) * uMotionScale;
    float n1 = snoise(p * 1.4 + vec3(t * 0.10, 0.0, 0.0));
    float n2 = snoise(p * 1.4 + vec3(0.0, t * 0.12, 13.7));
    float n3 = snoise(p * 1.4 + vec3(7.3, 0.0, t * 0.09));
    p += vec3(n1, n2, n3) * drift * (0.7 + wIdle * 0.6);

    /* --- idle: slow breathing --- */
    float breathe = 1.0 + sin(t * 0.9 + aSeed * 6.2831) * 0.035 * wIdle * uMotionScale;
    p *= breathe;

    /* --- listening: the field leans inward, attentive --- */
    p *= 1.0 - 0.16 * wListen;

    /* --- thinking: differential rotation braids the cloud --- */
    float braidAngle = (t * (0.18 + fract(aSeed * 7.31) * 0.25)
        + (aRadius - 1.45) * 1.6) * wThink * uMotionScale;
    float ca = cos(braidAngle);
    float sa = sin(braidAngle);
    p = vec3(p.x * ca - p.z * sa, p.y, p.x * sa + p.z * ca);

    /* --- speaking: expanding ripple rings from the core --- */
    float ripple = sin(aRadius * 6.0 - t * 5.0)
        * (0.03 + uBandMid * 0.14) * wSpeak * uMotionScale;
    p *= 1.0 + ripple + uBandLow * 0.14 * wSpeak;

    vec4 mv = modelViewMatrix * vec4(p, 1.0);
    gl_Position = projectionMatrix * mv;

    /* --- size + twinkle --- */
    float twinkle = 0.7 + 0.3 * sin(t * (1.5 + fract(aSeed * 3.7) * 2.5) + aSeed * 6.2831);
    float energy = 0.55 + wListen * 0.25 + wThink * 0.35 + wSpeak * 0.45 + uBandHigh * 0.35;
    vIntensity = twinkle * energy;
    /* Hard cap on point size: on a small canvas, oversized additive sprites
       stack into a blown-out white mass (the "speaking glitch"). The cap
       guarantees individual particles stay individually resolvable. */
    float size = (2.0 + twinkle * 1.4 + uBandHigh * 1.0) * uSizeBoost * uPixelRatio * (3.2 / -mv.z);
    gl_PointSize = min(size, 9.0 * uPixelRatio);
  }
`;

const PARTICLE_FRAGMENT = /* glsl */ `
  uniform vec3 uColor;
  varying float vIntensity;
  void main() {
    /* soft circular sprite — bright core, feathered edge */
    float d = length(gl_PointCoord - vec2(0.5));
    float alpha = smoothstep(0.5, 0.08, d) * vIntensity;
    if (alpha < 0.01) discard;
    gl_FragColor = vec4(uColor, alpha);
  }
`;

/** One-hot target per state for the shader's behavior crossfade. */
const STATE_TARGET: Record<OrbState, [number, number, number, number]> = {
  idle: [1, 0, 0, 0],
  listening: [0, 1, 0, 0],
  thinking: [0, 0, 1, 0],
  speaking: [0, 0, 0, 1],
};

function ParticleCloud({ state, amplitude, compact = false }: { state: OrbState; amplitude: number; compact?: boolean }) {
  const pointsRef = useRef<THREE.Points>(null);
  // CPU-side band decomposition state (see component docblock).
  const bands = useRef({ low: 0, prev: 0, high: 0 });

  const { geometry, material } = useMemo(() => {
    const positions = new Float32Array(PARTICLE_COUNT * 3);
    const seeds = new Float32Array(PARTICLE_COUNT);
    const radii = new Float32Array(PARTICLE_COUNT);
    for (let i = 0; i < PARTICLE_COUNT; i++) {
      const phi = Math.acos(2 * Math.random() - 1);
      const theta = Math.random() * Math.PI * 2;
      const radius = 1.4 + Math.pow(Math.random(), 1.6) * 0.55;
      positions[i * 3] = radius * Math.sin(phi) * Math.cos(theta);
      positions[i * 3 + 1] = radius * Math.sin(phi) * Math.sin(theta);
      positions[i * 3 + 2] = radius * Math.cos(phi);
      seeds[i] = Math.random();
      radii[i] = radius;
    }
    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    geometry.setAttribute('aSeed', new THREE.BufferAttribute(seeds, 1));
    geometry.setAttribute('aRadius', new THREE.BufferAttribute(radii, 1));

    const reduced =
      typeof window !== 'undefined' &&
      window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    const material = new THREE.ShaderMaterial({
      transparent: true,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
      uniforms: {
        uTime: { value: 0 },
        uPixelRatio: { value: Math.min(typeof window !== 'undefined' ? window.devicePixelRatio : 1, 2) },
        uMotionScale: { value: reduced ? 0.2 : 1.0 },
        uKeep: { value: 1.0 },
        uSizeBoost: { value: 1.0 },
        uStateMix: { value: new THREE.Vector4(1, 0, 0, 0) },
        uBandLow: { value: 0 },
        uBandMid: { value: 0 },
        uBandHigh: { value: 0 },
        uColor: { value: STATE_COLOR.idle.clone() },
      },
      vertexShader: PARTICLE_VERTEX,
      fragmentShader: PARTICLE_FRAGMENT,
    });
    return { geometry, material };
  }, []);

  useFrame((clock, delta) => {
    const pts = pointsRef.current;
    if (!pts) return;
    const u = material.uniforms;
    u.uTime.value = clock.clock.elapsedTime;

    // Slow tumble for parallax depth — the only per-frame transform on the CPU.
    pts.rotation.y -= delta * 0.04;
    pts.rotation.x += delta * 0.015;

    // Temporal band split (see docblock): low = EMA floor, mid = body above
    // the floor, high = rectified transient. The transient is deliberately
    // under-amplified and slow-smoothed: the TTS amplitude prop updates in
    // steps (analyser rate < frame rate), so a hot multiplier saturated
    // uBandHigh on every syllable and strobed the point sizes — the
    // "speaking glitch" Nathan flagged on 10 Jun. Compact orbs damp the
    // voice response further: at 56px there's no room for big energy swings.
    const damp = compact ? 0.45 : 1.0;
    const b = bands.current;
    b.low += (amplitude - b.low) * 0.04;
    const mid = Math.max(0, amplitude - b.low);
    const transient = Math.abs(amplitude - b.prev) * 2.5;
    b.high += (Math.min(1, transient) - b.high) * 0.12;
    b.prev = amplitude;
    u.uBandLow.value += (b.low * damp - u.uBandLow.value) * 0.2;
    u.uBandMid.value += (mid * damp - u.uBandMid.value) * 0.25;
    u.uBandHigh.value += (b.high * damp - u.uBandHigh.value) * 0.18;

    // Density follows container size: at header scale keep ~20% of the field
    // and bump the survivors' size so the orb reads as a clean sparkle, not
    // congestion. Lerped so a layout change never pops.
    const keepTarget = compact ? 0.2 : 1.0;
    const boostTarget = compact ? 1.7 : 1.0;
    u.uKeep.value += (keepTarget - u.uKeep.value) * 0.1;
    u.uSizeBoost.value += (boostTarget - u.uSizeBoost.value) * 0.1;

    // Crossfade the behavior mix toward the active state's one-hot target.
    const mix = u.uStateMix.value as THREE.Vector4;
    const target = STATE_TARGET[state];
    mix.x += (target[0] - mix.x) * 0.05;
    mix.y += (target[1] - mix.y) * 0.05;
    mix.z += (target[2] - mix.z) * 0.05;
    mix.w += (target[3] - mix.w) * 0.05;

    (u.uColor.value as THREE.Color).lerp(STATE_COLOR[state], 0.04);
  });

  return <points ref={pointsRef} geometry={geometry} material={material} />;
}

/** Two thin orbital rings — gives it the J.A.R.V.I.S. instrument-cluster feel */
function OrbitRings({ state, amplitude }: { state: OrbState; amplitude: number }) {
  const ringRef = useRef<THREE.Mesh>(null);
  const ring2Ref = useRef<THREE.Mesh>(null);

  useFrame((_, delta) => {
    if (!ringRef.current || !ring2Ref.current) return;
    ringRef.current.rotation.z += delta * 0.25;
    ringRef.current.rotation.x = Math.PI / 2.4;
    ring2Ref.current.rotation.y += delta * 0.18;
    ring2Ref.current.rotation.z -= delta * 0.12;

    const matA = ringRef.current.material as THREE.MeshBasicMaterial;
    const matB = ring2Ref.current.material as THREE.MeshBasicMaterial;
    const opacity = (state === 'idle' ? 0.15 : 0.3) + amplitude * 0.4;
    matA.opacity += (opacity - matA.opacity) * 0.1;
    matB.opacity += (opacity - matB.opacity) * 0.1;
    matA.color.lerp(STATE_COLOR[state], 0.05);
    matB.color.lerp(STATE_ACCENT[state], 0.05);
  });

  return (
    <>
      <mesh ref={ringRef}>
        <torusGeometry args={[1.85, 0.006, 8, 120]} />
        <meshBasicMaterial color="#4a9eff" transparent opacity={0.2} blending={THREE.AdditiveBlending} />
      </mesh>
      <mesh ref={ring2Ref}>
        <torusGeometry args={[2, 0.004, 8, 120]} />
        <meshBasicMaterial color="#6bb6ff" transparent opacity={0.15} blending={THREE.AdditiveBlending} />
      </mesh>
    </>
  );
}
