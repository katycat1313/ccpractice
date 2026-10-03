import React, { useEffect, useRef } from 'react';
import PropTypes from 'prop-types';
import * as THREE from 'three';

/**
 * Atmospheric Cold Calling Background Visual
 * - Precision 3D desk phones, smartphones, headsets, studio mics drifting in orbit
 * - Anti-collision repulsion (assets never overlap)
 * - Center exclusion zone (keeps cards and forms completely clean)
 * - Zero intrusive labels or text overlays; functions purely as a premium visual backdrop
 */
export default function ColdCalling3DScene({
  interactive = true,
  density = 'medium',
  className = '',
  showGrid = false,
}) {
  const containerRef = useRef(null);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    // 1. Scene & Camera Setup
    const scene = new THREE.Scene();

    const width = container.clientWidth || window.innerWidth;
    const height = container.clientHeight || window.innerHeight;

    const camera = new THREE.PerspectiveCamera(40, width / height, 0.1, 1000);
    camera.position.set(0, 0, 26);

    const renderer = new THREE.WebGLRenderer({
      antialias: true,
      alpha: true,
      powerPreference: 'high-performance',
    });
    renderer.setSize(width, height);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.15;

    container.appendChild(renderer.domElement);

    // 2. Subtle Floor Grid (Optional)
    if (showGrid) {
      const grid = new THREE.GridHelper(50, 50, 0x00f0ff, 0x181a26);
      grid.position.y = -10;
      grid.material.opacity = 0.12;
      grid.material.transparent = true;
      scene.add(grid);
    }

    // 3. Studio Lighting
    const ambientLight = new THREE.AmbientLight(0xffffff, 1.4);
    scene.add(ambientLight);

    const keyLight = new THREE.DirectionalLight(0xffffff, 2.5);
    keyLight.position.set(12, 16, 14);
    scene.add(keyLight);

    const fillLight = new THREE.DirectionalLight(0x94a3b8, 1.2);
    fillLight.position.set(-12, -10, 10);
    scene.add(fillLight);

    const cyanLight = new THREE.PointLight(0x00f0ff, 3.2, 35);
    cyanLight.position.set(15, 8, 8);
    scene.add(cyanLight);

    const orangeLight = new THREE.PointLight(0xff6a00, 3.0, 35);
    orangeLight.position.set(-15, -6, 8);
    scene.add(orangeLight);

    const mintLight = new THREE.PointLight(0x10b981, 2.2, 30);
    mintLight.position.set(0, 12, 6);
    scene.add(mintLight);

    // 4. Materials
    const chromeMat = new THREE.MeshStandardMaterial({
      color: 0xf8fafc,
      metalness: 0.96,
      roughness: 0.08,
    });

    const brushedMetalMat = new THREE.MeshStandardMaterial({
      color: 0x94a3b8,
      metalness: 0.85,
      roughness: 0.28,
    });

    const obsidianMat = new THREE.MeshStandardMaterial({
      color: 0x0c0d14,
      metalness: 0.3,
      roughness: 0.18,
    });

    const orangeEnamelMat = new THREE.MeshStandardMaterial({
      color: 0xff6a00,
      metalness: 0.15,
      roughness: 0.15,
      emissive: 0xd946ef,
      emissiveIntensity: 0.08,
    });

    const neonCyanMat = new THREE.MeshStandardMaterial({
      color: 0x00f0ff,
      metalness: 0.2,
      roughness: 0.1,
      emissive: 0x00f0ff,
      emissiveIntensity: 0.7,
    });

    const neonMintMat = new THREE.MeshStandardMaterial({
      color: 0x10b981,
      metalness: 0.2,
      roughness: 0.1,
      emissive: 0x10b981,
      emissiveIntensity: 0.65,
    });

    const glassMat = new THREE.MeshPhysicalMaterial({
      color: 0xffffff,
      transmission: 0.85,
      opacity: 1,
      transparent: true,
      roughness: 0.05,
      ior: 1.5,
    });

    // 5. Assets

    // A. Executive Desk Phone
    const createExecutivePhone = (accentColor = 'chrome') => {
      const group = new THREE.Group();
      group.userData = { radius: 1.8 };

      const baseGeo = new THREE.BoxGeometry(2.5, 0.75, 2.2);
      const baseMesh = new THREE.Mesh(baseGeo, obsidianMat);
      baseMesh.rotation.x = -Math.PI * 0.09;
      group.add(baseMesh);

      const screenBezelGeo = new THREE.BoxGeometry(1.6, 0.7, 0.08);
      const screenBezel = new THREE.Mesh(screenBezelGeo, brushedMetalMat);
      screenBezel.position.set(0, 0.55, -0.4);
      screenBezel.rotation.x = -Math.PI * 0.22;
      group.add(screenBezel);

      const lcdGeo = new THREE.PlaneGeometry(1.4, 0.52);
      const lcdMesh = new THREE.Mesh(lcdGeo, neonCyanMat);
      lcdMesh.position.set(0, 0.56, -0.35);
      lcdMesh.rotation.x = -Math.PI * 0.22;
      group.add(lcdMesh);

      for (let r = 0; r < 4; r++) {
        for (let c = 0; c < 3; c++) {
          const btnGeo = new THREE.CylinderGeometry(0.08, 0.08, 0.08, 16);
          const btnMesh = new THREE.Mesh(btnGeo, chromeMat);
          btnMesh.position.set((c - 1) * 0.42, 0.48 - r * 0.2, 0.25 - r * 0.04);
          btnMesh.rotation.x = -Math.PI * 0.09;
          group.add(btnMesh);
        }
      }

      const handset = new THREE.Group();
      handset.position.set(0, 0.85, -0.2);

      const barGeo = new THREE.CylinderGeometry(0.18, 0.18, 2.7, 24);
      const barMesh = new THREE.Mesh(barGeo, accentColor === 'orange' ? orangeEnamelMat : obsidianMat);
      barMesh.rotation.z = Math.PI / 2;
      handset.add(barMesh);

      const cupGeo = new THREE.CylinderGeometry(0.48, 0.32, 0.42, 24);
      const cup1 = new THREE.Mesh(cupGeo, chromeMat);
      cup1.position.set(-1.3, 0, 0);
      cup1.rotation.z = Math.PI / 2;

      const cup2 = new THREE.Mesh(cupGeo, chromeMat);
      cup2.position.set(1.3, 0, 0);
      cup2.rotation.z = -Math.PI / 2;
      handset.add(cup1, cup2);

      group.add(handset);

      const coilPoints = [];
      const coils = 12;
      for (let i = 0; i <= coils * 12; i++) {
        const t = i / (coils * 12);
        const theta = t * coils * Math.PI * 2;
        const rad = 0.18;
        const cx = -1.25 + rad * Math.cos(theta) + t * 0.2;
        const cy = -0.15 - t * 1.3;
        const cz = rad * Math.sin(theta) + t * 0.3;
        coilPoints.push(new THREE.Vector3(cx, cy, cz));
      }
      const cableCurve = new THREE.CatmullRomCurve3(coilPoints);
      const cableGeo = new THREE.TubeGeometry(cableCurve, 80, 0.04, 8, false);
      const cableMesh = new THREE.Mesh(cableGeo, accentColor === 'orange' ? orangeEnamelMat : obsidianMat);
      group.add(cableMesh);

      return group;
    };

    // B. Smartphone
    const createFlagshipPhone = () => {
      const group = new THREE.Group();
      group.userData = { radius: 1.7 };

      const frameGeo = new THREE.BoxGeometry(1.65, 3.3, 0.14);
      const frameMesh = new THREE.Mesh(frameGeo, chromeMat);
      group.add(frameMesh);

      const backGeo = new THREE.BoxGeometry(1.6, 3.25, 0.02);
      const backMesh = new THREE.Mesh(backGeo, obsidianMat);
      backMesh.position.z = -0.07;
      group.add(backMesh);

      const camIslandGeo = new THREE.BoxGeometry(0.55, 0.75, 0.06);
      const camIsland = new THREE.Mesh(camIslandGeo, brushedMetalMat);
      camIsland.position.set(-0.45, 1.15, -0.1);
      group.add(camIsland);

      const screenGeo = new THREE.PlaneGeometry(1.52, 3.16);
      const canvas = document.createElement('canvas');
      canvas.width = 256;
      canvas.height = 512;
      const ctx = canvas.getContext('2d');

      ctx.fillStyle = '#080a12';
      ctx.fillRect(0, 0, 256, 512);

      ctx.fillStyle = '#00f0ff';
      for (let i = 0; i < 4; i++) {
        ctx.fillRect(195 + i * 8, 25 - i * 4, 5, 8 + i * 4);
      }

      ctx.strokeStyle = '#10b981';
      ctx.lineWidth = 3;
      ctx.beginPath();
      for (let x = 30; x < 226; x += 6) {
        const y = 230 + Math.sin(x * 0.1) * (20 + (x % 12));
        if (x === 30) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
      }
      ctx.stroke();

      ctx.beginPath();
      ctx.arc(128, 140, 36, 0, Math.PI * 2);
      ctx.fillStyle = '#10b981';
      ctx.fill();

      ctx.fillStyle = '#ffffff';
      ctx.font = '600 18px sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText('LIVE PROSPECT', 128, 305);

      ctx.font = '500 13px sans-serif';
      ctx.fillStyle = '#94a3b8';
      ctx.fillText('00:38 • 50% DEPOSIT', 128, 330);

      ctx.fillStyle = '#10b981';
      ctx.beginPath();
      ctx.roundRect(42, 420, 72, 44, 22);
      ctx.fill();

      ctx.fillStyle = '#ef4444';
      ctx.beginPath();
      ctx.roundRect(142, 420, 72, 44, 22);
      ctx.fill();

      const screenTex = new THREE.CanvasTexture(canvas);
      const screenMesh = new THREE.Mesh(screenGeo, new THREE.MeshBasicMaterial({ map: screenTex }));
      screenMesh.position.z = 0.075;
      group.add(screenMesh);

      return group;
    };

    // C. Studio Microphone
    const createStudioMic = () => {
      const group = new THREE.Group();
      group.userData = { radius: 1.6 };

      const grilleGeo = new THREE.CapsuleGeometry(0.65, 0.9, 16, 24);
      const grilleMesh = new THREE.Mesh(grilleGeo, chromeMat);
      grilleMesh.position.y = 1.0;
      group.add(grilleMesh);

      const wireMesh = new THREE.Mesh(grilleGeo, new THREE.MeshBasicMaterial({ color: 0x00f0ff, wireframe: true, opacity: 0.45, transparent: true }));
      wireMesh.position.y = 1.0;
      wireMesh.scale.set(1.02, 1.02, 1.02);
      group.add(wireMesh);

      const bodyGeo = new THREE.CylinderGeometry(0.65, 0.58, 1.5, 24);
      const bodyMesh = new THREE.Mesh(bodyGeo, obsidianMat);
      bodyMesh.position.y = -0.2;
      group.add(bodyMesh);

      const ringMesh = new THREE.Mesh(new THREE.TorusGeometry(0.66, 0.05, 12, 24), orangeEnamelMat);
      ringMesh.position.y = 0.45;
      ringMesh.rotation.x = Math.PI / 2;
      group.add(ringMesh);

      const shockRing = new THREE.Mesh(new THREE.TorusGeometry(1.05, 0.07, 12, 32), chromeMat);
      shockRing.position.y = 0.25;
      group.add(shockRing);

      return group;
    };

    // D. Headset
    const createHeadset = () => {
      const group = new THREE.Group();
      group.userData = { radius: 1.6 };

      const bandGeo = new THREE.TorusGeometry(1.65, 0.07, 16, 40, Math.PI);
      const bandMesh = new THREE.Mesh(bandGeo, chromeMat);
      bandMesh.rotation.z = Math.PI;
      group.add(bandMesh);

      const cupGeo = new THREE.CylinderGeometry(0.5, 0.5, 0.35, 24);
      const leftCup = new THREE.Mesh(cupGeo, obsidianMat);
      leftCup.position.set(-1.65, 0.2, 0);
      leftCup.rotation.z = Math.PI / 2;

      const leftRing = new THREE.Mesh(new THREE.TorusGeometry(0.52, 0.05, 12, 24), neonMintMat);
      leftRing.position.set(-1.8, 0.2, 0);
      leftRing.rotation.y = Math.PI / 2;

      const rightCup = leftCup.clone();
      rightCup.position.set(1.65, 0.2, 0);
      const rightRing = leftRing.clone();
      rightRing.position.set(1.8, 0.2, 0);

      group.add(leftCup, leftRing, rightCup, rightRing);

      const boomPoints = [
        new THREE.Vector3(-1.65, 0.2, 0),
        new THREE.Vector3(-1.4, -0.6, 0.8),
        new THREE.Vector3(-0.4, -0.85, 1.15),
      ];
      const boomCurve = new THREE.CatmullRomCurve3(boomPoints);
      const boomGeo = new THREE.TubeGeometry(boomCurve, 24, 0.035, 8, false);
      const boomMesh = new THREE.Mesh(boomGeo, chromeMat);

      const tipGeo = new THREE.CapsuleGeometry(0.14, 0.32, 12, 16);
      const tipMesh = new THREE.Mesh(tipGeo, orangeEnamelMat);
      tipMesh.position.set(-0.4, -0.85, 1.15);
      tipMesh.rotation.z = Math.PI / 3;

      group.add(boomMesh, tipMesh);
      return group;
    };

    // E. Network Node
    const createNetworkHub = () => {
      const group = new THREE.Group();
      group.userData = { radius: 1.4 };

      const coreMesh = new THREE.Mesh(new THREE.DodecahedronGeometry(0.85, 0), obsidianMat);
      group.add(coreMesh);

      const glassCage = new THREE.Mesh(new THREE.DodecahedronGeometry(1.05, 0), glassMat);
      group.add(glassCage);

      const ring1 = new THREE.Mesh(new THREE.TorusGeometry(1.3, 0.04, 12, 32), neonCyanMat);
      ring1.rotation.x = Math.PI / 4;
      const ring2 = new THREE.Mesh(new THREE.TorusGeometry(1.3, 0.04, 12, 32), neonMintMat);
      ring2.rotation.y = Math.PI / 3;
      group.add(ring1, ring2);

      return group;
    };

    // F. Growth Arrow
    const createConversionArrow = () => {
      const group = new THREE.Group();
      group.userData = { radius: 1.4 };

      const shaftGeo = new THREE.BoxGeometry(0.35, 1.6, 0.25);
      const shaftMesh = new THREE.Mesh(shaftGeo, chromeMat);
      shaftMesh.position.y = -0.2;
      group.add(shaftMesh);

      const headGeo = new THREE.ConeGeometry(0.75, 0.85, 4);
      const headMesh = new THREE.Mesh(headGeo, neonMintMat);
      headMesh.position.y = 0.95;
      headMesh.rotation.y = Math.PI / 4;
      group.add(headMesh);

      const ringBase = new THREE.Mesh(new THREE.TorusGeometry(0.65, 0.05, 12, 24), orangeEnamelMat);
      ringBase.position.y = -1.0;
      ringBase.rotation.x = Math.PI / 2;
      group.add(ringBase);

      return group;
    };

    // 6. Perimeter Slots (Center Clear)
    const perimeterSlots = [
      { x: -10.5, y: 5.5, z: 2 },
      { x: -11.0, y: -0.5, z: -1 },
      { x: -9.5, y: -6.0, z: 1 },
      { x: 10.5, y: 5.5, z: 1 },
      { x: 11.0, y: -0.5, z: 2 },
      { x: 9.5, y: -6.0, z: -1 },
      { x: -3.5, y: 8.5, z: 0 },
      { x: 3.5, y: 8.5, z: 1 },
      { x: -4.5, y: -9.0, z: 2 },
      { x: 4.5, y: -9.0, z: 0 },
    ];

    const builders = [
      () => createExecutivePhone('chrome'),
      createFlagshipPhone,
      createStudioMic,
      createHeadset,
      () => createExecutivePhone('orange'),
      createNetworkHub,
      createConversionArrow,
      createFlagshipPhone,
      createStudioMic,
      createHeadset,
    ];

    const entityCount = density === 'low' ? 6 : density === 'high' ? 10 : 8;
    const floatingEntities = [];

    for (let i = 0; i < entityCount; i++) {
      const slot = perimeterSlots[i % perimeterSlots.length];
      const meshGroup = builders[i % builders.length]();

      meshGroup.position.set(
        slot.x + (Math.random() - 0.5) * 1.5,
        slot.y + (Math.random() - 0.5) * 1.5,
        slot.z + (Math.random() - 0.5) * 1.5
      );

      meshGroup.rotation.set(
        Math.random() * Math.PI,
        Math.random() * Math.PI,
        Math.random() * Math.PI
      );

      const entity = {
        group: meshGroup,
        radius: meshGroup.userData.radius || 1.6,
        basePos: meshGroup.position.clone(),
        velocity: new THREE.Vector3(
          (Math.random() - 0.5) * 0.008,
          (Math.random() - 0.5) * 0.008,
          (Math.random() - 0.5) * 0.005
        ),
        rotSpeed: new THREE.Vector3(
          (Math.random() - 0.5) * 0.012,
          (Math.random() - 0.5) * 0.014,
          (Math.random() - 0.5) * 0.010
        ),
        phase: Math.random() * Math.PI * 2,
        bobSpeed: 0.6 + Math.random() * 0.5,
      };

      scene.add(meshGroup);
      floatingEntities.push(entity);
    }

    // 7. Mouse Parallax (Subtle camera tilt)
    const mouse = new THREE.Vector2(0, 0);
    const targetCam = new THREE.Vector3(0, 0, 26);

    const handlePointerMove = (e) => {
      const rect = container.getBoundingClientRect();
      mouse.x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
      mouse.y = -((e.clientY - rect.top) / rect.height) * 2 + 1;

      if (interactive) {
        targetCam.x = mouse.x * 2.0;
        targetCam.y = mouse.y * 1.4;
      }
    };

    container.addEventListener('pointermove', handlePointerMove);

    // 8. Animation Loop
    const startTime = performance.now();
    let animId;

    const animate = () => {
      animId = requestAnimationFrame(animate);
      const elapsed = (performance.now() - startTime) * 0.001;

      camera.position.lerp(targetCam, 0.03);
      camera.lookAt(0, 0, 0);

      for (let i = 0; i < floatingEntities.length; i++) {
        const entA = floatingEntities[i];
        const groupA = entA.group;

        groupA.rotation.x += entA.rotSpeed.x;
        groupA.rotation.y += entA.rotSpeed.y;
        groupA.rotation.z += entA.rotSpeed.z;

        const bob = Math.sin(elapsed * entA.bobSpeed + entA.phase) * 0.02;
        const sway = Math.cos(elapsed * 0.5 * entA.bobSpeed + entA.phase) * 0.015;

        groupA.position.x += entA.velocity.x + sway;
        groupA.position.y += entA.velocity.y + bob;
        groupA.position.z += entA.velocity.z;

        entA.velocity.multiplyScalar(0.995);

        // Anti-Collision
        for (let j = i + 1; j < floatingEntities.length; j++) {
          const entB = floatingEntities[j];
          const groupB = entB.group;

          const distVec = groupA.position.clone().sub(groupB.position);
          const dist = distVec.length();
          const minDist = entA.radius + entB.radius + 0.6;

          if (dist < minDist && dist > 0.001) {
            distVec.normalize();
            const overlap = (minDist - dist) * 0.035;

            groupA.position.addScaledVector(distVec, overlap);
            groupB.position.addScaledVector(distVec, -overlap);

            entA.velocity.addScaledVector(distVec, 0.005);
            entB.velocity.addScaledVector(distVec, -0.005);
          }
        }

        // Center Exclusion
        const centerZoneX = 6.0;
        const centerZoneY = 6.5;
        if (Math.abs(groupA.position.x) < centerZoneX && Math.abs(groupA.position.y) < centerZoneY) {
          const pushDirX = groupA.position.x >= 0 ? 1 : -1;
          const pushDirY = groupA.position.y >= 0 ? 1 : -1;
          groupA.position.x += pushDirX * 0.06;
          groupA.position.y += pushDirY * 0.06;
        }

        // Bounds
        const boundX = 14.5;
        const boundY = 9.5;
        const boundZ = 5.0;

        if (Math.abs(groupA.position.x) > boundX) entA.velocity.x *= -0.8;
        if (Math.abs(groupA.position.y) > boundY) entA.velocity.y *= -0.8;
        if (Math.abs(groupA.position.z) > boundZ) entA.velocity.z *= -0.8;
      }

      renderer.render(scene, camera);
    };

    animate();

    const handleResize = () => {
      if (!container) return;
      const nw = container.clientWidth || window.innerWidth;
      const nh = container.clientHeight || window.innerHeight;
      camera.aspect = nw / nh;
      camera.updateProjectionMatrix();
      renderer.setSize(nw, nh);
    };

    window.addEventListener('resize', handleResize);

    return () => {
      cancelAnimationFrame(animId);
      window.removeEventListener('resize', handleResize);
      container.removeEventListener('pointermove', handlePointerMove);
      scene.traverse((obj) => {
        if (obj.geometry) {
          obj.geometry.dispose();
        }
        if (obj.material) {
          if (Array.isArray(obj.material)) {
            obj.material.forEach((mat) => mat.dispose());
          } else {
            obj.material.dispose();
          }
        }
      });
      if (renderer.domElement && container.contains(renderer.domElement)) {
        container.removeChild(renderer.domElement);
      }
      renderer.dispose();
    };
  }, [density, interactive, showGrid]);

  return (
    <div
      ref={containerRef}
      className={`relative w-full h-full select-none overflow-hidden pointer-events-none ${className}`}
    />
  );
}

ColdCalling3DScene.propTypes = {
  interactive: PropTypes.bool,
  density: PropTypes.oneOf(['low', 'medium', 'high']),
  className: PropTypes.string,
  showGrid: PropTypes.bool,
};
