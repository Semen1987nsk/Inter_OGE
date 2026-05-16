/**
 * three/scene.ts — премиальная 3D-сцена «Физика в браузере».
 *
 * Сцена:
 *   - 1000 particles (800 deep-blue + 200 gold) с lerp-движением.
 *   - 3 procedural «инструмента» (динамометр, цилиндр, пружина) —
 *     low-poly через BoxGeometry/CylinderGeometry/TorusKnotGeometry,
 *     без .glb assets.
 *   - Orbit-камера slow rotate (0.0002 rad/frame).
 *   - PerspectiveCamera с fov 50, медленный auto-orbit.
 *
 * Производительность:
 *   - dpr clamp [1, 1.75] чтобы не убить retina.
 *   - antialias: false → используем post-FXAA из shaders.
 *   - powerPreference: 'low-power'.
 *
 * Запускается через `mountThreeScene(canvas)` ТОЛЬКО когда:
 *   1. canRunHeavyMotion() === true (не mobile, не reduced-motion),
 *   2. canvas viewport через IO,
 *   3. requestIdleCallback готов.
 */

import * as THREE from 'three';

export interface SceneHandle {
  dispose(): void;
  start(): void;
  stop(): void;
}

const COLOR_DEEP_BLUE = new THREE.Color('#0c1830');
const COLOR_DEEP_BG = new THREE.Color('#06101e');
const COLOR_GOLD = new THREE.Color('#ffbe0b');
const COLOR_TEAL = new THREE.Color('#14b8a6');

export function mountThreeScene(canvas: HTMLCanvasElement): SceneHandle {
  const renderer = new THREE.WebGLRenderer({
    canvas,
    antialias: true,
    alpha: true,
    powerPreference: 'low-power',
  });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.75));
  renderer.setClearColor(COLOR_DEEP_BG, 0);

  const scene = new THREE.Scene();
  scene.fog = new THREE.Fog(COLOR_DEEP_BG.getHex(), 8, 28);

  const camera = new THREE.PerspectiveCamera(50, 1, 0.1, 100);
  camera.position.set(0, 0, 12);

  // ─── Освещение ─────────────────────────────────────────────────
  const ambient = new THREE.AmbientLight(0x4a5568, 0.5);
  scene.add(ambient);
  const keyLight = new THREE.DirectionalLight(COLOR_GOLD, 1.1);
  keyLight.position.set(5, 8, 6);
  scene.add(keyLight);
  const fillLight = new THREE.DirectionalLight(COLOR_TEAL, 0.4);
  fillLight.position.set(-6, -3, 4);
  scene.add(fillLight);

  // ─── Particles ─────────────────────────────────────────────────
  const PARTICLE_COUNT = 1000;
  const positions = new Float32Array(PARTICLE_COUNT * 3);
  const colors = new Float32Array(PARTICLE_COUNT * 3);
  const sizes = new Float32Array(PARTICLE_COUNT);
  for (let i = 0; i < PARTICLE_COUNT; i++) {
    positions[i * 3] = (Math.random() - 0.5) * 28;
    positions[i * 3 + 1] = (Math.random() - 0.5) * 18;
    positions[i * 3 + 2] = (Math.random() - 0.5) * 18 - 4;
    const isGold = Math.random() < 0.2;
    const color = isGold ? COLOR_GOLD : COLOR_DEEP_BLUE;
    colors[i * 3] = color.r;
    colors[i * 3 + 1] = color.g;
    colors[i * 3 + 2] = color.b;
    sizes[i] = isGold ? 0.08 + Math.random() * 0.08 : 0.04 + Math.random() * 0.04;
  }
  const particlesGeo = new THREE.BufferGeometry();
  particlesGeo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
  particlesGeo.setAttribute('color', new THREE.BufferAttribute(colors, 3));
  particlesGeo.setAttribute('size', new THREE.BufferAttribute(sizes, 1));

  const particlesMat = new THREE.ShaderMaterial({
    transparent: true,
    depthWrite: false,
    vertexColors: true,
    vertexShader: `
      attribute float size;
      varying vec3 vColor;
      void main() {
        vColor = color;
        vec4 mvPosition = modelViewMatrix * vec4(position, 1.0);
        gl_PointSize = size * 320.0 * (1.0 / -mvPosition.z);
        gl_Position = projectionMatrix * mvPosition;
      }
    `,
    fragmentShader: `
      varying vec3 vColor;
      void main() {
        vec2 uv = gl_PointCoord - 0.5;
        float d = length(uv);
        if (d > 0.5) discard;
        float alpha = smoothstep(0.5, 0.05, d);
        gl_FragColor = vec4(vColor, alpha * 0.85);
      }
    `,
  });
  const particles = new THREE.Points(particlesGeo, particlesMat);
  scene.add(particles);

  // ─── 3 procedural «инструмента» ────────────────────────────────
  // 1) Динамометр — cylinder + crook (тонкий конус сверху)
  const dynamometer = new THREE.Group();
  const dynoBody = new THREE.Mesh(
    new THREE.CylinderGeometry(0.4, 0.4, 2.6, 24),
    new THREE.MeshStandardMaterial({
      color: 0x0c1830,
      metalness: 0.4,
      roughness: 0.5,
      emissive: COLOR_GOLD,
      emissiveIntensity: 0.04,
    }),
  );
  dynamometer.add(dynoBody);
  const dynoHook = new THREE.Mesh(
    new THREE.TorusGeometry(0.18, 0.04, 8, 16, Math.PI * 1.4),
    new THREE.MeshStandardMaterial({ color: 0xffbe0b, metalness: 0.8, roughness: 0.3 }),
  );
  dynoHook.position.y = -1.5;
  dynoHook.rotation.z = Math.PI / 2;
  dynamometer.add(dynoHook);
  dynamometer.position.set(-4.5, 1.5, 0);
  dynamometer.rotation.z = 0.18;
  scene.add(dynamometer);

  // 2) Цилиндр-груз
  const cylinder = new THREE.Mesh(
    new THREE.CylinderGeometry(0.55, 0.55, 1.6, 32),
    new THREE.MeshStandardMaterial({
      color: 0xffbe0b,
      metalness: 0.55,
      roughness: 0.35,
      emissive: COLOR_GOLD,
      emissiveIntensity: 0.12,
    }),
  );
  cylinder.position.set(4.5, -1, -1);
  cylinder.rotation.x = 0.35;
  scene.add(cylinder);

  // 3) Пружина — TorusKnotGeometry (даёт изящный spring-look)
  const spring = new THREE.Mesh(
    new THREE.TorusKnotGeometry(0.7, 0.12, 64, 8, 2, 3),
    new THREE.MeshStandardMaterial({
      color: 0x14b8a6,
      metalness: 0.7,
      roughness: 0.25,
      emissive: COLOR_TEAL,
      emissiveIntensity: 0.18,
    }),
  );
  spring.position.set(0, 0.5, -2);
  scene.add(spring);

  // ─── Resize handler ────────────────────────────────────────────
  function resize(): void {
    const parent = canvas.parentElement;
    const w = parent?.clientWidth ?? window.innerWidth;
    const h = parent?.clientHeight ?? window.innerHeight;
    renderer.setSize(w, h, false);
    camera.aspect = w / h;
    camera.updateProjectionMatrix();
  }
  resize();
  const resizeObs = new ResizeObserver(resize);
  if (canvas.parentElement) resizeObs.observe(canvas.parentElement);

  // ─── Animation loop ────────────────────────────────────────────
  let rafId = 0;
  let running = false;
  let t = 0;
  function frame(): void {
    if (!running) return;
    t += 0.005;
    // Orbit camera медленно вокруг центра.
    camera.position.x = Math.sin(t * 0.4) * 1.5;
    camera.position.y = Math.cos(t * 0.3) * 0.8;
    camera.lookAt(0, 0, 0);
    // Instruments slow rotate
    dynamometer.rotation.y = Math.sin(t * 0.7) * 0.4;
    cylinder.rotation.y += 0.008;
    spring.rotation.x += 0.006;
    spring.rotation.y += 0.004;
    // Particles slow drift
    particles.rotation.y = t * 0.05;
    particles.rotation.x = Math.sin(t * 0.3) * 0.1;

    renderer.render(scene, camera);
    rafId = requestAnimationFrame(frame);
  }

  function start(): void {
    if (running) return;
    running = true;
    rafId = requestAnimationFrame(frame);
  }
  function stop(): void {
    running = false;
    if (rafId) cancelAnimationFrame(rafId);
    rafId = 0;
  }
  function dispose(): void {
    stop();
    resizeObs.disconnect();
    particlesGeo.dispose();
    particlesMat.dispose();
    dynoBody.geometry.dispose();
    (dynoBody.material as THREE.Material).dispose();
    dynoHook.geometry.dispose();
    (dynoHook.material as THREE.Material).dispose();
    cylinder.geometry.dispose();
    (cylinder.material as THREE.Material).dispose();
    spring.geometry.dispose();
    (spring.material as THREE.Material).dispose();
    renderer.dispose();
  }

  return { start, stop, dispose };
}
