
import React, { useRef, useMemo, useState, useEffect } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { Stars, Float, MeshWobbleMaterial, Points, PointMaterial, Grid } from '@react-three/drei';
import * as THREE from 'three';
import { Target, Particle, Point } from '../types/game';

const TARGET_COLOR = "#b4ff32";
const WORLD_BOUNDS = { x: 5, y: 3, z: 2 };

// تولید صدای انفجار با کد
const playExplodeSound = () => {
  const ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();
  osc.type = 'sawtooth';
  osc.frequency.setValueAtTime(150, ctx.currentTime);
  osc.frequency.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.3);
  gain.gain.setValueAtTime(0.1, ctx.currentTime);
  gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.3);
  osc.connect(gain);
  gain.connect(ctx.destination);
  osc.start();
  osc.stop(ctx.currentTime + 0.3);
};

const TargetObject: React.FC<{ target: Target }> = ({ target }) => {
  const meshRef = useRef<THREE.Mesh>(null!);
  
  useFrame((state, delta) => {
    meshRef.current.rotation.x += target.rotation[0] * delta;
    meshRef.current.rotation.y += target.rotation[1] * delta;
  });

  return (
    <Float speed={4} rotationIntensity={0.5} floatIntensity={1}>
      {/* @ts-ignore - Fix: mesh is a valid R3F intrinsic element */}
      <mesh ref={meshRef} position={target.position}>
        {/* @ts-ignore - Fix: icosahedronGeometry is a valid R3F intrinsic element */}
        <icosahedronGeometry args={[target.size, 1]} />
        <MeshWobbleMaterial 
          color={target.color} 
          factor={0.2} 
          speed={3} 
          emissive={target.color}
          emissiveIntensity={1}
          wireframe
        />
      {/* @ts-ignore - Fix: mesh is a valid R3F intrinsic element */}
      </mesh>
    </Float>
  );
};

const Explosion: React.FC<{ particles: Particle[] }> = ({ particles }) => {
  const positions = useMemo(() => {
    const arr = new Float32Array(particles.length * 3);
    particles.forEach((p, i) => {
      arr[i * 3] = p.position[0];
      arr[i * 3 + 1] = p.position[1];
      arr[i * 3 + 2] = p.position[2];
    });
    return arr;
  }, [particles]);

  return (
    <Points positions={positions} stride={3}>
      <PointMaterial
        transparent
        size={0.12}
        sizeAttenuation={true}
        depthWrite={false}
        color={TARGET_COLOR}
        opacity={0.8}
      />
    </Points>
  );
};

const BackgroundEffects = () => {
  const gridRef = useRef<any>(null);
  useFrame((state) => {
    if (gridRef.current) {
      gridRef.current.position.z = (state.clock.elapsedTime % 1) * 2;
    }
  });

  return (
    <>
      <Grid
        ref={gridRef}
        position={[0, -3, 0]}
        infiniteGrid
        cellSize={1}
        cellThickness={1}
        sectionSize={3}
        sectionThickness={1.5}
        sectionColor={TARGET_COLOR}
        cellColor="#111"
        fadeDistance={30}
      />
      <Stars radius={50} depth={50} count={1000} factor={4} saturation={0} fade speed={1} />
    </>
  );
};

interface GameEngineProps {
  handPos: Point | null;
  fireTrigger: boolean;
  onHit: (count: number) => void;
}

const GameEngine: React.FC<GameEngineProps> = ({ handPos, fireTrigger, onHit }) => {
  const { camera, raycaster } = useThree();
  const [targets, setTargets] = useState<Target[]>([]);
  const [particles, setParticles] = useState<Particle[]>([]);

  useEffect(() => {
    const initialTargets: Target[] = Array.from({ length: 4 }).map(() => ({
      id: Math.random().toString(),
      position: [(Math.random() - 0.5) * 6, (Math.random() - 0.5) * 4, -3] as [number, number, number],
      velocity: [(Math.random() - 0.5) * 2, (Math.random() - 0.5) * 2, 0] as [number, number, number],
      size: 0.35,
      color: TARGET_COLOR,
      rotation: [Math.random(), Math.random(), Math.random()] as [number, number, number]
    }));
    setTargets(initialTargets);
  }, []);

  useFrame((state, delta) => {
    // Update Targets
    setTargets(prev => prev.map(t => {
      let nx = t.position[0] + t.velocity[0] * delta;
      let ny = t.position[1] + t.velocity[1] * delta;
      let vx = t.velocity[0];
      let vy = t.velocity[1];
      if (Math.abs(nx) > WORLD_BOUNDS.x) vx *= -1;
      if (Math.abs(ny) > WORLD_BOUNDS.y) vy *= -1;
      return { ...t, position: [nx, ny, t.position[2]] as [number, number, number], velocity: [vx, vy, 0] as [number, number, number] };
    }));

    // PRECISION Hit Logic (1.2x size)
    if (fireTrigger && handPos) {
      const nx = (handPos.x / window.innerWidth) * 2 - 1;
      const ny = -(handPos.y / window.innerHeight) * 2 + 1;
      raycaster.setFromCamera(new THREE.Vector2(nx, ny), camera);

      setTargets(prev => {
        const nextTargets = [...prev];
        let hitIndex = -1;
        
        for(let i = 0; i < nextTargets.length; i++) {
          const t = nextTargets[i];
          // کاهش محدوده برخورد به ۱.۲ برابر اندازه واقعی برای دقت بالا
          const hitSphere = new THREE.Sphere(new THREE.Vector3(...t.position), t.size * 1.2);
          if (raycaster.ray.intersectsSphere(hitSphere)) {
            hitIndex = i;
            break;
          }
        }

        if (hitIndex !== -1) {
          onHit(1);
          playExplodeSound();
          const hitTarget = nextTargets[hitIndex];
          const newParticles: Particle[] = Array.from({ length: 12 }).map(() => ({
            id: Math.random().toString(),
            position: [...hitTarget.position] as [number, number, number],
            velocity: [(Math.random() - 0.5) * 15, (Math.random() - 0.5) * 15, (Math.random() - 0.5) * 15] as [number, number, number],
            life: 0.6,
            color: TARGET_COLOR
          }));
          setParticles(p => [...p, ...newParticles]);

          nextTargets[hitIndex] = {
            ...hitTarget,
            id: Math.random().toString(),
            position: [(Math.random() - 0.5) * 6, (Math.random() - 0.5) * 4, -3] as [number, number, number]
          };
        }
        return nextTargets;
      });
    }

    if (particles.length > 0) {
      setParticles(prev => prev.map(p => ({
        ...p,
        position: [p.position[0] + p.velocity[0] * delta, p.position[1] + p.velocity[1] * delta, p.position[2] + p.velocity[2] * delta] as [number, number, number],
        life: p.life - delta * 2
      })).filter(p => p.life > 0));
    }
  });

  return (
    <>
      {/* @ts-ignore - Fix: ambientLight is a valid R3F intrinsic element */}
      <ambientLight intensity={0.4} />
      <BackgroundEffects />
      {targets.map(t => <TargetObject key={t.id} target={t} />)}
      {particles.length > 0 && <Explosion particles={particles} />}
    </>
  );
};

const GameScene: React.FC<GameEngineProps> = (props) => {
  return (
    <div className="absolute inset-0 z-10">
      <Canvas shadows camera={{ fov: 60, position: [0, 0, 5] }}>
        {/* @ts-ignore - Fix: color is a valid R3F intrinsic element */}
        <color attach="background" args={['#050505']} />
        <GameEngine {...props} />
      </Canvas>
    </div>
  );
};

export default GameScene;
