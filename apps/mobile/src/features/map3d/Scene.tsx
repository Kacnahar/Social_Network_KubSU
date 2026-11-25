import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { useEffect, useMemo, useRef, useState, type RefObject } from 'react';
import * as THREE from 'three';
import { DRACOLoader } from 'three/examples/jsm/loaders/DRACOLoader.js';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { BODY_RADIUS, EYE_HEIGHT, FOV, WALK_SPEED, type Controls } from './controls';
import { campus } from './data/campus';
import { clampOrbit, friction, orbitEye, panOrbit } from './orbit';
import { CUBE_BODY, GROUND_LIGHT, INDOOR_PARTS, MODEL_VERSION, SUN, groundHeight, indoorParts, step } from './terrain';

// Мир — готовая модель из Blender (public/map3d/campus.glb). Свет и тени в ней уже «запечены»:
// у зданий, зелени и предметов — в цвет вершин, у земли — в отдельную картинку. Поэтому в сцене нет
// ни источников света, ни расчёта теней, и картинка лёгкая для телефона.
// Номер версии в адресе: после пересборки модели браузер не покажет старую из своей памяти
const MODEL_URL = `/map3d/campus.glb?v=${MODEL_VERSION}`;
const GROUND_LIGHT_URL = `/map3d/ground_light.jpg?v=${MODEL_VERSION}`;
const DRACO_URL = '/draco/';
export const SKY = '#DCE7F0';
// Запечённый свет чуть темнее, чем хочется на экране телефона — слегка поднимаем
const LIGHT_GAIN = 1.05;
// Материалы модели, которые в приложении становятся прозрачным стеклом
const CLEAR_GLASS = ['kiosk_glass', 'case_glass'];
// Ближняя граница видимости пешком: меньше расстояния от глаз до стены, в которую упёрлись
const NEAR_WALK = 0.3;

// «Живые» детали: деревья качаются, по земле плывут тени облаков, на экране расписания бежит строка.
// Всё считается в видеокарте по одному числу — времени; геометрия модели не меняется, поэтому это дёшево.
// Если в системе включено «Уменьшение движения», время стоит на месте и картинка неподвижна.
const live = { time: { value: 0 }, floor: { value: SUN.y } };
const SWAYING = ['leaf_', 'spruce'];
type Shader = Parameters<THREE.Material['onBeforeCompile']>[0];

function alive(material: THREE.Material, key: string, patch: (shader: Shader) => void) {
  material.onBeforeCompile = (shader) => {
    shader.uniforms.liveTime = live.time;
    shader.uniforms.liveFloor = live.floor;
    shader.vertexShader = `uniform float liveTime;\nvarying vec3 liveAt;\n${shader.vertexShader}`;
    shader.fragmentShader = `uniform float liveTime;\nuniform float liveFloor;\nvarying vec3 liveAt;\n${shader.fragmentShader}`;
    patch(shader);
  };
  material.customProgramCacheKey = () => `map3d-${key}`;
}

// Кроны: чем выше точка, тем сильнее её качает; соседние деревья качаются не в такт
function sway(material: THREE.Material) {
  alive(material, 'sway', (shader) => {
    shader.vertexShader = shader.vertexShader.replace(
      '#include <begin_vertex>',
      `#include <begin_vertex>
      liveAt = (modelMatrix * vec4(transformed, 1.0)).xyz;
      float swayLift = max(0.0, liveAt.y - 1.6);
      float swayPhase = liveTime * 1.1 + liveAt.x * 0.09 + liveAt.z * 0.07;
      transformed.x += (sin(swayPhase) + 0.4 * sin(swayPhase * 2.3 + 1.0)) * 0.014 * swayLift;
      transformed.z += cos(swayPhase * 0.8) * 0.01 * swayLift;`,
    );
  });
}

// Земля: мягкие тени облаков медленно плывут по двору
function clouds(material: THREE.Material) {
  alive(material, 'clouds', (shader) => {
    shader.vertexShader = shader.vertexShader.replace('#include <begin_vertex>', '#include <begin_vertex>\n      liveAt = (modelMatrix * vec4(transformed, 1.0)).xyz;');
    shader.fragmentShader = shader.fragmentShader.replace(
      '#include <opaque_fragment>',
      `float cloud = sin(liveAt.x * 0.023 + liveTime * 0.06) + sin(liveAt.z * 0.019 - liveTime * 0.05) + sin((liveAt.x + liveAt.z) * 0.012 + liveTime * 0.035);
      outgoingLight *= 1.0 - 0.1 * smoothstep(0.3, 1.8, cloud);
      #include <opaque_fragment>`,
    );
  });
}

// Экран расписания в холле: слегка мерцает, жёлтая подсветка переходит со строки на строку.
// Высоты строк — те же, что в scripts/map3d/build_campus.py (hall: экран «РАСПИСАНИЕ»)
function screen(material: THREE.Material) {
  alive(material, 'screen', (shader) => {
    shader.vertexShader = shader.vertexShader.replace('#include <begin_vertex>', '#include <begin_vertex>\n      liveAt = (modelMatrix * vec4(transformed, 1.0)).xyz;');
    shader.fragmentShader = shader.fragmentShader.replace(
      '#include <color_fragment>',
      `#include <color_fragment>
      float screenY = liveAt.y - liveFloor;
      float onScreen = step(1.45, screenY) * step(screenY, 2.55);
      float rowY = 1.54 + floor(mod(liveTime / 1.2, 5.0)) * 0.17;
      float onRow = step(rowY, screenY) * step(screenY, rowY + 0.17);
      diffuseColor.rgb *= mix(1.0, 0.94 + 0.06 * sin(liveTime * 3.0), onScreen);
      diffuseColor.rgb = mix(diffuseColor.rgb, vec3(1.0, 0.84, 0.42), onScreen * onRow * 0.8);`,
    );
  });
}

function prepare(root: THREE.Object3D, groundLight: THREE.Texture) {
  const cache = new Map<THREE.Material, THREE.Material>();
  root.updateMatrixWorld(true);
  root.traverse((object) => {
    if (!(object instanceof THREE.Mesh)) return;
    const isGround = object.name.startsWith('ground') || Boolean(object.parent?.name.startsWith('ground'));
    const source = object.material as THREE.MeshStandardMaterial;
    const hasColors = Boolean(object.geometry.getAttribute('color'));
    let material = cache.get(source);
    if (!material) {
      const basic = new THREE.MeshBasicMaterial({ color: source.color.clone().multiplyScalar(LIGHT_GAIN), map: source.map, vertexColors: hasColors });
      // Стекло в помещении (киоски, тамбур, витрины) — прозрачное: за ним видно содержимое
      if (CLEAR_GLASS.some((name) => source.name.startsWith(name))) {
        basic.transparent = true;
        basic.opacity = 0.22;
        basic.depthWrite = false;
      }
      if (basic.map) basic.map.anisotropy = 8;
      if (isGround) {
        basic.lightMap = groundLight;
        // three.js делит свет из картинки на π — возвращаем обратно
        basic.lightMapIntensity = Math.PI;
      }
      if (SWAYING.some((name) => source.name.startsWith(name))) sway(basic);
      else if (source.name.startsWith('lm_screen')) screen(basic);
      else if (isGround) clouds(basic);
      material = basic;
      cache.set(source, material);
    }
    object.material = material;
    if (isGround) {
      // Вторые координаты текстуры — положение точки на земле: по ним ложится картинка со светом и тенями
      const position = object.geometry.getAttribute('position');
      const uv = new Float32Array(position.count * 2);
      const point = new THREE.Vector3();
      for (let i = 0; i < position.count; i += 1) {
        point.fromBufferAttribute(position, i).applyMatrix4(object.matrixWorld);
        uv[i * 2] = (point.x - GROUND_LIGHT.x) / GROUND_LIGHT.size + 0.5;
        uv[i * 2 + 1] = (-point.z + GROUND_LIGHT.z) / GROUND_LIGHT.size + 0.5;
      }
      object.geometry.setAttribute('uv1', new THREE.BufferAttribute(uv, 2));
    }
  });
}

function useModel(onReady: () => void, onError: () => void) {
  const [model, setModel] = useState<THREE.Object3D | null>(null);
  useEffect(() => {
    let cancelled = false;
    const draco = new DRACOLoader().setDecoderPath(DRACO_URL);
    const loader = new GLTFLoader().setDRACOLoader(draco);
    const light = new THREE.TextureLoader().loadAsync(GROUND_LIGHT_URL);
    Promise.all([loader.loadAsync(MODEL_URL), light])
      .then(([gltf, groundLight]) => {
        if (cancelled) return;
        groundLight.channel = 1;
        groundLight.colorSpace = THREE.SRGBColorSpace;
        prepare(gltf.scene, groundLight);
        setModel(gltf.scene);
        onReady();
      })
      .catch((error: unknown) => {
        console.error('map3d: модель не загрузилась', error);
        if (!cancelled) onError();
      });
    return () => {
      cancelled = true;
      draco.dispose();
    };
    // Модель грузится один раз при открытии карты
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  return model;
}

// «Куб мудрости»: зеркальный куб стоит на вершине и медленно вращается вокруг вертикальной оси.
// Зеркало условное: грань показывает небо, горизонт или землю — смотря куда от неё отражается взгляд.
// Настоящего отражения сцены нет: оно слишком тяжёлое для телефона.
const CUBE_TURN_SECONDS = 24;
// Эмблема на гранях — как на настоящем кубе. Картинка вырезана из фотографии куба, которую дал заказчик
const CUBE_EMBLEM_URL = `/map3d/cube_emblem.png?v=${MODEL_VERSION}`;
const cubeUniforms = { emblem: { value: null as THREE.Texture | null }, cubeEdge: { value: 2 } };
const cubeMaterial = new THREE.ShaderMaterial({
  uniforms: cubeUniforms,
  vertexShader: `
    varying vec3 vNormalW;
    varying vec3 vPositionW;
    varying vec2 vUv;
    varying vec3 vPositionL;
    varying vec3 vNormalL;
    void main() {
      vUv = uv;
      vPositionL = position;
      vNormalL = normal;
      vNormalW = normalize(mat3(modelMatrix) * normal);
      vec4 world = modelMatrix * vec4(position, 1.0);
      vPositionW = world.xyz;
      gl_Position = projectionMatrix * viewMatrix * world;
    }`,
  fragmentShader: `
    varying vec3 vNormalW;
    varying vec3 vPositionW;
    varying vec2 vUv;
    varying vec3 vPositionL;
    varying vec3 vNormalL;
    uniform sampler2D emblem;
    uniform float cubeEdge;
    void main() {
      vec3 view = normalize(vPositionW - cameraPosition);
      vec3 r = reflect(view, normalize(vNormalW));
      vec3 sky = vec3(0.47, 0.66, 0.90);
      vec3 horizon = vec3(0.90, 0.93, 0.96);
      vec3 trees = vec3(0.30, 0.42, 0.26);
      vec3 ground = vec3(0.50, 0.49, 0.46);
      vec3 color = r.y > 0.0
        ? mix(horizon, sky, pow(r.y, 0.55))
        : mix(mix(horizon, trees, smoothstep(0.0, 0.12, -r.y)), ground, smoothstep(0.25, 0.6, -r.y));
      // тонкая светлая кромка по краям грани — фаска полированного металла
      vec2 edge = min(vUv, 1.0 - vUv);
      float rim = 1.0 - smoothstep(0.0, 0.025, min(edge.x, edge.y));
      color = mix(color * 0.94, vec3(0.97), rim * 0.8);
      // Эмблема стоит «на углу»: её верх смотрит вдоль диагонали грани, к верхней вершине куба.
      // Куб опирается на вершину, поэтому «вверх» в его собственных осях — всегда вдоль диагонали (1,1,1).
      vec3 n = normalize(vNormalL);
      vec3 up = normalize(vec3(0.57735) - n * dot(vec3(0.57735), n));
      vec3 right = cross(up, n);
      vec3 q = vPositionL - n * cubeEdge * 0.5;
      vec2 st = vec2(dot(q, right), dot(q, up)) / (cubeEdge * 0.74) + 0.5;
      float inside = step(0.02, st.x) * step(st.x, 0.98) * step(0.02, st.y) * step(st.y, 0.98);
      float mark = texture2D(emblem, st).r * inside;
      color = mix(color, vec3(1.0), mark);
      gl_FragColor = vec4(color, 1.0);
    }`,
});
const cubeTilt = new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(1, 1, 1).normalize(), new THREE.Vector3(0, 1, 0));

function WisdomCube({ reduceMotion }: { reduceMotion: boolean }) {
  const spin = useRef<THREE.Group>(null);
  useFrame((_, delta) => {
    if (spin.current && !reduceMotion) spin.current.rotation.y += (delta * Math.PI * 2) / CUBE_TURN_SECONDS;
  });
  const { x, z, base, edge } = CUBE_BODY;
  useEffect(() => {
    let cancelled = false;
    cubeUniforms.cubeEdge.value = edge;
    new THREE.TextureLoader()
      .loadAsync(CUBE_EMBLEM_URL)
      .then((texture) => {
        if (cancelled) return;
        texture.anisotropy = 8;
        cubeUniforms.emblem.value = texture;
      })
      .catch((error: unknown) => console.error('map3d: эмблема куба не загрузилась', error));
    return () => {
      cancelled = true;
    };
  }, [edge]);
  // центр куба — на половину диагонали выше нижней вершины
  return (
    <group ref={spin} position={[x, base + (edge * Math.sqrt(3)) / 2, z]} rotation-y={0.5}>
      <mesh quaternion={cubeTilt} material={cubeMaterial}>
        <boxGeometry args={[edge, edge, edge]} />
      </mesh>
    </group>
  );
}

// Пятна солнца на полу холла от витражей фасада. Места пятен посчитаны при сборке модели
// по тому же солнцу, что и тени во дворе; здесь они — один полупрозрачный слой поверх пола.
function SunPatches({ mesh }: { mesh: RefObject<THREE.Mesh | null> }) {
  const material = useRef<THREE.MeshBasicMaterial>(null);
  const geometry = useMemo(() => {
    const points: number[] = [];
    for (const quad of SUN.quads) {
      const corner = (i: number) => [quad[i * 2], SUN.y, quad[i * 2 + 1]] as number[];
      for (const i of [0, 1, 2, 0, 2, 3]) points.push(...corner(i));
    }
    const result = new THREE.BufferGeometry();
    result.setAttribute('position', new THREE.Float32BufferAttribute(points, 3));
    return result;
  }, []);
  // облако набежало — пятна бледнеют
  useFrame(() => {
    if (material.current) material.current.opacity = 0.2 + 0.05 * Math.sin(live.time.value * 0.35);
  });
  return (
    <mesh ref={mesh} geometry={geometry} renderOrder={2}>
      <meshBasicMaterial ref={material} color="#FFE9B0" transparent opacity={0.2} blending={THREE.AdditiveBlending} depthWrite={false} side={THREE.DoubleSide} fog={false} polygonOffset polygonOffsetFactor={-2} polygonOffsetUnits={-2} />
    </mesh>
  );
}

type WorldProps = { controls: Controls; reduceMotion: boolean; onReady: () => void; onError: () => void };

function World({ controls, reduceMotion, onReady, onError }: WorldProps) {
  const { camera, size, scene } = useThree();
  const model = useModel(onReady, onError);

  const marker = useRef<THREE.Mesh>(null);
  const sunPatches = useRef<THREE.Mesh>(null);
  // Части интерьера: каждая прячется, когда её не видно (см. indoorParts)
  const parts = useMemo(() => INDOOR_PARTS.map((name) => ({ name, object: model?.getObjectByName(name) })), [model]);
  // Плавный переход между режимами: запоминаем, откуда летим
  const flight = useRef({ mode: controls.mode, t: 1, from: new THREE.Vector3(), fromQuat: new THREE.Quaternion() });
  const height = useRef(0);
  const scratch = useMemo(
    () => ({ position: new THREE.Vector3(), quat: new THREE.Quaternion(), euler: new THREE.Euler(0, 0, 0, 'YXZ'), up: new THREE.Vector3(), target: new THREE.Vector3(), matrix: new THREE.Matrix4(), ray: new THREE.Raycaster(), ndc: new THREE.Vector2(), ground: new THREE.Plane(new THREE.Vector3(0, 1, 0), 0), hit: new THREE.Vector3() }),
    [],
  );

  useEffect(() => {
    controls.pick = (screenX, screenY) => {
      scratch.ndc.set((screenX / size.width) * 2 - 1, -(screenY / size.height) * 2 + 1);
      scratch.ray.setFromCamera(scratch.ndc, camera);
      return scratch.ray.ray.intersectPlane(scratch.ground, scratch.hit) ? { x: scratch.hit.x, z: scratch.hit.z } : null;
    };
    return () => {
      controls.pick = null;
    };
  }, [camera, controls, scratch, size.height, size.width]);

  useFrame((_, rawDelta) => {
    const dt = Math.min(rawDelta, 0.05);
    if (!reduceMotion) live.time.value += dt;
    const { position, quat, euler, up, target, matrix } = scratch;

    if (controls.mode === 'walk') {
      const keys = controls.keys;
      const forward = -controls.stick.y + (keys.has('KeyW') || keys.has('ArrowUp') ? 1 : 0) - (keys.has('KeyS') || keys.has('ArrowDown') ? 1 : 0);
      const side = controls.stick.x + (keys.has('KeyD') ? 1 : 0) - (keys.has('KeyA') ? 1 : 0);
      controls.yaw += ((keys.has('ArrowRight') ? 1 : 0) - (keys.has('ArrowLeft') ? 1 : 0)) * 1.8 * dt;
      const strength = Math.min(1, Math.hypot(forward, side));
      if (strength > 0.02) {
        const sin = Math.sin(controls.yaw);
        const cos = Math.cos(controls.yaw);
        const scale = (WALK_SPEED * dt * strength) / Math.hypot(forward, side);
        controls.position = step(controls.position, { x: (forward * sin + side * cos) * scale, z: (-forward * cos + side * sin) * scale }, BODY_RADIUS, height.current);
      }
      // По ступеням поднимаемся плавно, без рывка
      if (controls.snapHeight !== null) {
        // перенесли в другое место: сразу встаём на пол нужного этажа
        height.current = groundHeight(controls.position, controls.snapHeight);
        controls.snapHeight = null;
      }
      height.current += (groundHeight(controls.position, height.current) - height.current) * Math.min(1, dt * 10);
      controls.feet = height.current;
      position.set(controls.position.x, EYE_HEIGHT + height.current, controls.position.z);
      euler.set(controls.pitch, -controls.yaw, 0);
      quat.setFromEuler(euler);
    } else {
      // Инерция после того, как палец отпустили
      const speed = Math.hypot(controls.panVelocity.x, controls.panVelocity.y);
      if (!controls.touching && speed > 4) {
        controls.orbit = panOrbit(controls.orbit, controls.panVelocity.x * dt, controls.panVelocity.y * dt, size.height, FOV);
        const keep = friction(dt);
        controls.panVelocity.x *= keep;
        controls.panVelocity.y *= keep;
      }
      controls.orbit = clampOrbit(controls.orbit, campus.bounds);
      const eye = orbitEye(controls.orbit);
      position.set(eye.x, eye.y, eye.z);
      // «Верх» экрана — направление взгляда по земле: так камера не теряется, даже когда смотрит строго вниз
      up.set(Math.sin(controls.orbit.azimuth), 1, -Math.cos(controls.orbit.azimuth));
      target.set(controls.orbit.x, 0, controls.orbit.z);
      quat.setFromRotationMatrix(matrix.lookAt(position, target, up));
    }

    const state = flight.current;
    if (state.mode !== controls.mode) {
      state.mode = controls.mode;
      state.t = reduceMotion ? 1 : 0;
      state.from.copy(camera.position);
      state.fromQuat.copy(camera.quaternion);
    }
    if (state.t < 1) {
      state.t = Math.min(1, state.t + dt / 0.7);
      const eased = 1 - Math.pow(1 - state.t, 3);
      camera.position.lerpVectors(state.from, position, eased);
      camera.quaternion.slerpQuaternions(state.fromQuat, quat, eased);
    } else {
      camera.position.copy(position);
      camera.quaternion.copy(quat);
    }

    // Дымка: территория остаётся чёткой, а соседние кварталы за оградой тают в ней
    if (scene.fog instanceof THREE.Fog) {
      const top = controls.mode === 'top';
      const near = top ? controls.orbit.distance * 0.8 + 40 : 170;
      const far = top ? controls.orbit.distance * 1.7 + 560 : 760;
      scene.fog.near += (near - scene.fog.near) * Math.min(1, dt * 4);
      scene.fog.far += (far - scene.fog.far) * Math.min(1, dt * 4);
    }

    // Границы видимости камеры. Чем уже промежуток «ближняя — дальняя», тем точнее камера различает,
    // какая поверхность ближе: слои земли (плитка, асфальт, газон) перестают мигать вдали.
    // Пешком ближняя граница маленькая (стены рядом); сверху — отодвигается вместе с камерой.
    // Дальше дымки всё равно ничего не видно, поэтому дальняя граница — сразу за ней.
    if (camera instanceof THREE.PerspectiveCamera && scene.fog instanceof THREE.Fog) {
      const flying = state.t < 1;
      const near = controls.mode === 'top' && !flying ? Math.min(20, Math.max(0.5, controls.orbit.distance * 0.05)) : NEAR_WALK;
      const far = scene.fog.far + 120;
      if (Math.abs(camera.near - near) > near * 0.02 || Math.abs(camera.far - far) > 10) {
        camera.near = near;
        camera.far = far;
        camera.updateProjectionMatrix();
      }
    }

    const shown = indoorParts(controls.position, height.current, controls.mode === 'walk' || state.t < 1);
    for (const part of parts) if (part.object) part.object.visible = shown[part.name];
    if (sunPatches.current) sunPatches.current.visible = shown.indoor_hall;

    if (marker.current) {
      marker.current.visible = controls.mode === 'top';
      marker.current.position.set(controls.position.x, 0.6, controls.position.z);
      const scale = Math.max(1, controls.orbit.distance / 110);
      marker.current.scale.set(scale, 1, scale);
    }
  });

  return (
    <>
      <color attach="background" args={[SKY]} />
      <fog attach="fog" args={[SKY, 170, 760]} />
      {model ? <primitive object={model} /> : null}
      {model ? <WisdomCube reduceMotion={reduceMotion} /> : null}
      {model ? <SunPatches mesh={sunPatches} /> : null}
      {/* «Вы здесь» в виде сверху */}
      <mesh ref={marker} rotation-x={-Math.PI / 2} visible={false}>
        <circleGeometry args={[1.8, 24]} />
        <meshBasicMaterial color="#0A7AFF" />
      </mesh>
    </>
  );
}

export function Scene(props: WorldProps) {
  return (
    <Canvas flat dpr={[1, 2]} camera={{ fov: (FOV * 180) / Math.PI, near: NEAR_WALK, far: 900 }} gl={{ antialias: true }}>
      <World {...props} />
    </Canvas>
  );
}
