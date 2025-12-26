import React, { useRef, useEffect, Suspense, useMemo, useState } from 'react';
import { Canvas, useFrame, useLoader } from '@react-three/fiber';
import { OrbitControls } from '@react-three/drei';
import * as THREE from 'three';
import { VRMLoaderPlugin, VRMUtils } from '@pixiv/three-vrm';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { useChatStore } from '../store/chatStore';
import { CharacterProps, SceneProps, AVAILABLE_VRM_MODELS } from '../types';
import { visemeApplier } from '../services/visemeApplicationService';
import { getCurrentViseme } from '../services/visemePreprocessor';
import vrmaAnimationService, { VRMAAnimation } from '../services/vrmaAnimationService';

export interface ExtendedCharacterProps extends CharacterProps {
  selectedModel?: string;
}

const Character: React.FC<ExtendedCharacterProps> = ({
  position = [0, 0, 0],
  scale = 1,
  rotation = [0, 0, 0],
  selectedModel,
}) => {
  const store = useChatStore();
  const { emotion, isSpeaking, visemes, selectedModelId } = store;
  
  // Get model path based on the selected model ID
  const MODEL_PATH_VRM = useMemo(() => {
    const model = AVAILABLE_VRM_MODELS.find(m => m.id === selectedModelId);
    return model?.path || '/model/Billy.vrm';
  }, [selectedModelId]);
  
  // Load VRM model using VRMLoader
  const gltf = useLoader(GLTFLoader, MODEL_PATH_VRM, (loader) => {
    loader.register((parser) => new VRMLoaderPlugin(parser));
  });
  
  const mixer = useRef<THREE.AnimationMixer | null>(null);
  const currentActions = useRef<Record<string, THREE.AnimationAction>>({});
  const vrmaActions = useRef<Record<string, THREE.AnimationAction>>({});
  const visemeStartTime = useRef<number>(0);
  const speakingStartTime = useRef<number>(0);
  const lastUpdate = useRef<number>(0);
  const frameSkip = useRef<number>(1);
  const vrmRef = useRef<unknown>(null);
  const sceneRef = useRef<THREE.Group | null>(null);
  const [vrmaAnimationsLoaded, setVrmaAnimationsLoaded] = useState(false);

  
  const vrm = gltf.userData.vrm as unknown;
  const scene = gltf.scene;

  /**
   * Load VRMA animations and create actions for them
   */
  const loadVRMAAnimations = async () => {
    if (!mixer.current || !vrm) return;

    try {
      // Load all VRMA animations
      const animations = await vrmaAnimationService.loadAllAnimations();
      
      // Create animation actions for each VRMA animation
      animations.forEach((vrmaAnim: VRMAAnimation) => {
        const action = mixer.current!.clipAction(vrmaAnim.clip);
        vrmaActions.current[vrmaAnim.name] = action;
      });

      console.log('VRMA animations loaded:', animations.size);
      console.log('Available VRMA actions:', Object.keys(vrmaActions.current));
    } catch (error) {
      console.error('Error loading VRMA animations:', error);
      throw error;
    }
  };

  useEffect(() => {
    if (scene && vrm) {
      const vrmObj = vrm as Record<string, unknown>;
      vrmRef.current = vrm;
      sceneRef.current = scene;
      
      // Apply VRM optimizations
      VRMUtils.removeUnnecessaryVertices(gltf.scene);
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      VRMUtils.removeUnnecessaryJoints((vrmObj as any).scene);
      
      // Register VRM with viseme applier
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      visemeApplier.setVRM(vrmObj as any);
      
      // Position and scale the model
      scene.position.set(position[0], position[1], position[2]);
      scene.scale.setScalar(scale);
      // Rotate 180 degrees around Y-axis to face the camera
      scene.rotation.set(rotation[0], rotation[1] + Math.PI, rotation[2]);
      
      // Apply a natural standing pose instead of T-pose
      applyNaturalPose(vrmObj);
      
      // Setup animation mixer
      mixer.current = new THREE.AnimationMixer(scene);
      const animations = gltf.animations;
      
      animations.forEach(clip => {
        const action = mixer.current!.clipAction(clip);
        currentActions.current[clip.name] = action;
      });

      // Load VRMA animations
      loadVRMAAnimations().then(() => {
        console.log('VRMA animations loaded successfully');
        setVrmaAnimationsLoaded(true);
      }).catch((error) => {
        console.warn('Failed to load VRMA animations:', error);
        setVrmaAnimationsLoaded(false);
      });

      // Start idle animation if available
      if (currentActions.current['idle']) {
        currentActions.current['idle'].play();
      }
      
      console.log('VRM model loaded:', vrm);
      console.log('Available animations:', animations.map(a => a.name));
    }
    
    return () => {
      if (mixer.current) {
        mixer.current.stopAllAction();
      }
      visemeApplier.setVRM(null);
    };
  }, [position, scale, rotation, selectedModel]);

  // Apply a natural standing pose to the VRM model
  const applyNaturalPose = (vrm: unknown) => {
    const vrmObj = vrm as Record<string, unknown>;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const humanoid = (vrmObj.humanoid as unknown) as any;
    if (!humanoid) return;

    // Helper function to set bone rotation in degrees
    const setBoneRotation = (boneName: string, x: number, y: number, z: number) => {
      const bone = humanoid.getNormalizedBoneNode(boneName);
      if (bone) {
        bone.rotation.set(
          THREE.MathUtils.degToRad(x),
          THREE.MathUtils.degToRad(y),
          THREE.MathUtils.degToRad(z)
        );
      }
    };

    // Apply a natural standing pose
    // Arms down slightly from T-pose
    setBoneRotation('leftUpperArm', 10, 0, -5);
    setBoneRotation('rightUpperArm', 10, 0, 5);
    
    setBoneRotation('leftLowerArm', 0, 0, 5);
    setBoneRotation('rightLowerArm', 0, 0, -5);
    
    // Slight bend at elbows
    setBoneRotation('leftHand', 0, 0, 10);
    setBoneRotation('rightHand', 0, 0, -10);
    
    // Slight shoulder adjustment
    setBoneRotation('leftShoulder', 0, 0, -2);
    setBoneRotation('rightShoulder', 0, 0, 2);
    
    // Natural head position (slight tilt down)
    setBoneRotation('head', 5, 0, 0);
    
    // Slight spine curve for natural posture
    setBoneRotation('spine', 0, 0, 0);
    setBoneRotation('chest', 0, 0, 0);
    
    // Legs in neutral standing position
    setBoneRotation('leftUpperLeg', 0, 0, 0);
    setBoneRotation('rightUpperLeg', 0, 0, 0);
    setBoneRotation('leftLowerLeg', 0, 0, 0);
    setBoneRotation('rightLowerLeg', 0, 0, 0);
    
    // Feet flat
    setBoneRotation('leftFoot', 0, 0, 0);
    setBoneRotation('rightFoot', 0, 0, 0);
    
    // Update the VRM to apply changes
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (vrmObj as any).update();
  };

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
      // Track speaking time
      if (visemeStartTime.current === 0) {
        visemeStartTime.current = performance.now();
        speakingStartTime.current = performance.now();
      }
      
      // Calculate current time in seconds since speaking started
      const currentTime = (performance.now() - speakingStartTime.current) / 1000;
      
      // Get current viseme based on accumulated time
      const currentVisemeName = getCurrentViseme(visemes, currentTime);
      
      // Apply viseme with smooth transition
      visemeApplier.applyViseme(currentVisemeName, delta);
    } else if (!isSpeaking) {
      // Reset to neutral when not speaking
      if (visemeStartTime.current !== 0) {
        visemeApplier.reset();
        visemeStartTime.current = 0;
      }
    }
  });

  // Handle emotion animations
  useEffect(() => {
    if (!mixer.current) return;

    const fadeToAction = (actionName: string, duration: number = 0.3) => {
      // Try VRMA actions first, then embedded animations
      let action = vrmaActions.current[actionName];
      if (!action) {
        action = currentActions.current[actionName];
      }
      if (!action) {
        console.warn(`Animation action not found: ${actionName}`);
        return;
      }

      // Fade out all other actions
      Object.values(currentActions.current).forEach(a => {
        if (a !== action) a.fadeOut(duration);
      });
      Object.values(vrmaActions.current).forEach(a => {
        if (a !== action) a.fadeOut(duration);
      });

      action.reset().fadeIn(duration).play();
    };

    // Declare animation variables outside of switch/case to avoid lexical declaration issues
    let talkingAnim: THREE.AnimationAction | undefined;
    let thinkingAnim: THREE.AnimationAction | undefined;
    let happyAnim: THREE.AnimationAction | undefined;
    let idleAnim: THREE.AnimationAction | undefined;

    if (isSpeaking) {
      // Try VRMA 'greeting' animation for talking, fall back to 'talking'
      talkingAnim = vrmaActions.current['greeting'] || currentActions.current['talking'];
      if (talkingAnim) {
        fadeToAction(talkingAnim.getClip().name);
      }
    } else {
      switch (emotion) {
        case 'thinking':
          // Try VRMA 'spin' animation for thinking, fall back to 'thinking'
          thinkingAnim = vrmaActions.current['spin'] || currentActions.current['thinking'];
          if (thinkingAnim) {
            fadeToAction(thinkingAnim.getClip().name);
          }
          break;
        case 'happy':
          // Try VRMA 'peace' animation for happy, fall back to 'happy'
          happyAnim = vrmaActions.current['peace'] || currentActions.current['happy'];
          if (happyAnim) {
            fadeToAction(happyAnim.getClip().name);
          }
          break;
        default:
          // For neutral emotion and not speaking, ensure idle pose is maintained
          // Try VRMA 'modelPose' for idle, fall back to 'idle'
          idleAnim = vrmaActions.current['modelPose'] || currentActions.current['idle'];
          if (idleAnim) {
            fadeToAction(idleAnim.getClip().name);
          } else if (vrmRef.current) {
            // Re-apply natural pose if no idle animation exists
            applyNaturalPose(vrmRef.current);
          }
      }
    }
  }, [emotion, isSpeaking, vrmaAnimationsLoaded]);

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

const Scene: React.FC<SceneProps & { selectedModelId: string }> = ({
  shadows = true,
  selectedModelId
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
        <MemoizedCharacter key={selectedModelId} />
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
  const { selectedModelId } = useChatStore();
  
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
        <Scene selectedModelId={selectedModelId} />
      </Canvas>
    </div>
  );
};

export default AvatarModel;
