import React, { useRef, useEffect, Suspense, useState } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { OrbitControls, useGLTF } from '@react-three/drei';
import * as THREE from 'three';
import { useChatStore } from '../store/chatStore';
import { CharacterProps, SceneProps } from '../types';

export interface ExtendedCharacterProps extends CharacterProps {
  selectedModel?: string;
}


// Available VRM models with blend shapes
const VRM_MODELS: Record<string, string> = {
  'Billy.vrm': '/model/Billy.vrm',
  'Glenda.vrm': '/model/Glenda.vrm',
  'Peach.vrm': '/model/peach.vrm'
};

const DEFAULT_MODEL = 'Billy.vrm'; // Billy.vrm likely has better blend shapes

const MODEL_PATH = '/model/An_ancient_android_gold_dress.glb';
const MODEL_PATH_VRM = '/model/Billy.vrm';

const Character: React.FC<ExtendedCharacterProps> = ({
  position = [0, 0, 0],
  scale = 1,
  rotation = [0, 0, 0],
  selectedModel,
}) => {
  const store = useChatStore();
  const { emotion, isSpeaking, visemes } = store;
  
  const mixer = useRef<THREE.AnimationMixer | null>(null);
  const currentActions = useRef<Record<string, THREE.AnimationAction>>({});
  const lastVisemeIndex = useRef<number>(-1);
  const visemeStartTime = useRef<number>(0);
  const lastUpdate = useRef<number>(0);
  const frameSkip = useRef<number>(1);

  // Load VRM model
  const gltf = useGLTF(MODEL_PATH_VRM);
  const scene = gltf.scene;

  useEffect(() => {
    if (scene) {
      scene.position.set(position[0], position[1], position[2]);
      scene.scale.setScalar(scale);
      // Rotate 180 degrees around Y-axis to face the camera
      scene.rotation.set(rotation[0], rotation[1] + Math.PI, rotation[2]);
      
      // Setup animation mixer
      mixer.current = new THREE.AnimationMixer(scene);
      const animations = gltf.animations;
      
      animations.forEach(clip => {
        const action = mixer.current!.clipAction(clip);
        currentActions.current[clip.name] = action;
      });

      // Start idle animation if available
      if (currentActions.current['idle']) {
        currentActions.current['idle'].play();
      }
      
      console.log('VRM model loaded:', gltf);
      console.log('Available animations:', animations.map(a => a.name));
    }
    
    return () => {
      if (mixer.current) {
        mixer.current.stopAllAction();
      }
    };
  }, [position, scale, rotation, selectedModel]);

  // Handle viseme animation (simplified for GLB model - log viseme changes)
useFrame((_, delta) => {
  if (frameSkip.current > 1) {
    lastUpdate.current++;
    if (lastUpdate.current % frameSkip.current !== 0) return;
  }

  if (mixer.current && delta < 0.1) {
    mixer.current.update(delta);
  }

  // Handle viseme animation when speaking
  if (isSpeaking && visemes.length > 0) {
    const currentTime = visemeStartTime.current + delta;
    const viseme = visemes[Math.floor(currentTime / 0.15) % visemes.length];
    
    // Only update when viseme changes
    const currentViseme = visemes[lastVisemeIndex.current];
    if (viseme !== currentViseme?.name) {
      // Log viseme change for debugging
      console.log('Viseme change:', currentViseme?.name, '->', viseme);
      
      lastVisemeIndex.current = visemes.findIndex(v => v.name === viseme);
      if (lastVisemeIndex.current !== -1) {
        visemeStartTime.current = currentTime;
      }
    } else {
      visemeStartTime.current = currentTime;
    }
  } else if (!isSpeaking) {
    lastVisemeIndex.current = -1;
  }
});

  // Handle emotion animations
  useEffect(() => {
    if (!mixer.current || !currentActions.current) return;

    const fadeToAction = (actionName: string, duration: number = 0.3) => {
      const action = currentActions.current[actionName];
      if (!action) return;

      Object.values(currentActions.current).forEach(a => {
        if (a !== action) a.fadeOut(duration);
      });

      action.reset().fadeIn(duration).play();
    };

    if (isSpeaking) {
      fadeToAction('talking');
    } else {
      switch (emotion) {
        case 'thinking':
          fadeToAction('thinking');
          break;
        case 'happy':
          fadeToAction('happy');
          break;
        default:
          fadeToAction('idle');
      }
    }
  }, [emotion, isSpeaking]);

  // Performance monitoring
  useEffect(() => {
    let frameCount = 0;
    let lastTime = performance.now();

    const checkPerformance = () => {
      const currentTime = performance.now();
      const elapsed = currentTime - lastTime;
      
      if (elapsed >= 1000) {
        const fps = frameCount / (elapsed / 1000);
        
        if (fps < 30) {
          frameSkip.current = 2;
        } else if (fps < 20) {
          frameSkip.current = 3;
        } else {
          frameSkip.current = 1;
        }
        
        frameCount = 0;
        lastTime = currentTime;
      }
      
      frameCount++;
      requestAnimationFrame(checkPerformance);
    };

    const handle = requestAnimationFrame(checkPerformance);
    return () => cancelAnimationFrame(handle);
  }, []);

  return scene ? <primitive object={scene} /> : null;
};

const MemoizedCharacter = React.memo(Character);

const Scene: React.FC<SceneProps> = ({
  shadows = true
}) => {
  return (
    <>
      <ambientLight intensity={0.6} />
      <directionalLight
        position={[5, 10, 7.5]}
        intensity={1.2}
        castShadow={shadows}
        shadow-mapSize={[1024, 1024]}
      />
      <directionalLight
        position={[-5, 5, -5]}
        intensity={0.3}
      />
      <Suspense fallback={null}>
        <MemoizedCharacter />
      </Suspense>
      
      <OrbitControls
        enablePan={false}
        enableZoom={true}
        minPolarAngle={Math.PI / 6}
        maxPolarAngle={Math.PI / 2.2}
        minDistance={2}
        maxDistance={5}
        target={[0, 1.2, 0]}
        enableDamping={true}
        dampingFactor={0.05}
      />
    </>
  );
};

const AvatarModel: React.FC = () => {
  return (
    <div className="w-full h-full absolute top-0 left-0 z-0">
      <Canvas
        shadows
        gl={{
          antialias: false,
          alpha: true,
          powerPreference: 'high-performance',
          precision: 'lowp',
        }}
        camera={{
          fov: 40,
          near: 0.1,
          far: 100,
          position: [0, 1.4, 3.5]
        }}
        performance={{
          min: 0.5,
          max: 1
        }}
        dpr={[1, 2]}
      >
        <Scene />
      </Canvas>
    </div>
  );
};

export default AvatarModel;
