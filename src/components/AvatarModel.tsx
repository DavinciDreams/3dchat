import React, { useRef, useEffect, Suspense } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { OrbitControls, useGLTF } from '@react-three/drei';
import * as THREE from 'three';
import { useChatStore } from '../store/chatStore';
import { VisemeData, CharacterProps, SceneProps } from '../types';

const MODEL_PATH = '/model/An_ancient_android_gold_dress.glb';

const Character: React.FC<CharacterProps> = ({
  position = [0, -1, 0],
  scale = 1,
  rotation = [0, 0, 0]
}) => {
  const { scene, animations } = useGLTF(MODEL_PATH, true, 
    (error) => {
      console.error('Error loading model:', error);
    }
  );
  const store = useChatStore();
  const { emotion, isSpeaking } = store;
  
  const mixer = useRef<THREE.AnimationMixer | null>(null);
  const currentActions = useRef<Record<string, THREE.AnimationAction>>({});
  const lastUpdate = useRef<number>(0);
  const frameSkip = useRef<number>(1); // Adjust this value to skip frames if needed

  useEffect(() => {
    if (scene) {
      mixer.current = new THREE.AnimationMixer(scene);
      
      // Load and setup animations
      animations.forEach(clip => {
        const action = mixer.current!.clipAction(clip);
        currentActions.current[clip.name] = action;
      });

      // Start idle animation
      if (currentActions.current['idle']) {
        currentActions.current['idle'].play();
      }
    }

    return () => {
      if (mixer.current) {
        mixer.current.stopAllAction();
      }
    };
  }, [scene, animations]);

  useEffect(() => {
    if (!mixer.current || !currentActions.current) return;

    const fadeToAction = (actionName: string, duration: number = 0.5) => {
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

  useFrame((_, delta) => {
    // Skip frames if performance is low
    if (frameSkip.current > 1) {
      lastUpdate.current++;
      if (lastUpdate.current % frameSkip.current !== 0) return;
    }

    // Only update mixer if it exists and delta is reasonable
    if (mixer.current && delta < 0.1) {
      mixer.current.update(delta);
    }
  });

  // Monitor performance and adjust frame skip
  useEffect(() => {
    let frameCount = 0;
    let lastTime = performance.now();

    const checkPerformance = () => {
      const currentTime = performance.now();
      const elapsed = currentTime - lastTime;
      
      if (elapsed >= 1000) { // Check every second
        const fps = frameCount / (elapsed / 1000);
        
        // Adjust frame skip based on FPS
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

  return (
    <primitive 
      object={scene} 
      position={position} 
      scale={scale} 
      rotation={rotation} 
    />
  );
};

useGLTF.preload(MODEL_PATH);

interface VisemeBlendshapesProps {
  onVisemeUpdate?: (visemes: VisemeData[]) => void;
}

const VisemeBlendshapes: React.FC<VisemeBlendshapesProps> = ({ onVisemeUpdate }) => {
  const { isSpeaking } = useChatStore();

  useEffect(() => {
    if (!isSpeaking) return;

    // Implement viseme updates here
    const visemes: VisemeData[] = [];
    onVisemeUpdate?.(visemes);

  }, [isSpeaking, onVisemeUpdate]);

  return null;
};

const MemoizedCharacter = React.memo(Character);

const Scene: React.FC<SceneProps> = ({
  shadows = true
}) => {
  return (
    <>
      <ambientLight intensity={0.5} />
      <directionalLight
        position={[10, 10, 5]}
        intensity={1}
        castShadow={shadows}
        shadow-mapSize={[1024, 1024]} // Reduced shadow map size
      />
      <Suspense fallback={null}>
        <MemoizedCharacter />
        <VisemeBlendshapes />
      </Suspense>
      
      <OrbitControls
        enablePan={false}
        enableZoom={true}
        minPolarAngle={Math.PI / 4}
        maxPolarAngle={Math.PI / 2}
        minDistance={2}
        maxDistance={5}
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
          antialias: false, // Disable antialiasing for better performance
          alpha: true,
          powerPreference: 'high-performance',
          precision: 'lowp',
        }}
        camera={{
          fov: 45,
          near: 1,
          far: 1000,
          position: [0, 1.5, 3]
        }}
        performance={{
          min: 0.5, // Minimum frame rate before quality reduction
          max: 1 // Maximum quality
        }}
        dpr={[1, 2]} // Limit pixel ratio range
      >
        <Scene />
      </Canvas>
    </div>
  );
};

export default AvatarModel;