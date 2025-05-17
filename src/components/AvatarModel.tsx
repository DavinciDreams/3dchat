import React, { useRef, useEffect, Suspense } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { OrbitControls, useGLTF } from '@react-three/drei';
import * as THREE from 'three';
import { useChatStore } from '../store/chatStore';
import { AnimationState, VisemeData, CharacterProps, SceneProps } from '../types';

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
  
  const animationState = useRef<AnimationState>({
    visemes: [],
    blinkEnabled: true,
    idleEnabled: true
  });
  
  const mixer = useRef<THREE.AnimationMixer | null>(null);
  const currentActions = useRef<Record<string, THREE.AnimationAction>>({});

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
    if (mixer.current) {
      mixer.current.update(delta);
    }
  });

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
  const { emotion, isSpeaking } = useChatStore();

  useEffect(() => {
    if (!isSpeaking) return;

    // Implement viseme updates here
    const visemes: VisemeData[] = [];
    onVisemeUpdate?.(visemes);

  }, [isSpeaking, onVisemeUpdate]);

  return null;
};

const Scene: React.FC<SceneProps> = ({
  cameraPosition = [0, 1.5, 3],
  shadows = true
}) => {
  const { camera } = useThree();
  
  useEffect(() => {
    camera.position.set(...cameraPosition);
  }, [camera, cameraPosition]);
  
  return (
    <>
      <ambientLight intensity={0.5} />
      <directionalLight 
        position={[10, 10, 5]} 
        intensity={1} 
        castShadow={shadows}
        shadow-mapSize-width={2048} 
        shadow-mapSize-height={2048} 
      />
      <directionalLight position={[-10, 10, 5]} intensity={0.5} />
      
      <Suspense fallback={null}>
        <Character />
        <VisemeBlendshapes />
      </Suspense>
      
      <OrbitControls 
        enablePan={false} 
        enableZoom={true} 
        minPolarAngle={Math.PI / 4} 
        maxPolarAngle={Math.PI / 2} 
        minDistance={2} 
        maxDistance={5} 
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
          antialias: true,
          alpha: true,
          preserveDrawingBuffer: true
        }}
      >
        <Scene />
      </Canvas>
    </div>
  );
};

export default AvatarModel;