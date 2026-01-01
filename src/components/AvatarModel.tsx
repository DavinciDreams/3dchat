import React, { useRef, useEffect, Suspense, useMemo, useState } from 'react';
import { Canvas, useFrame, useLoader } from '@react-three/fiber';
import { OrbitControls } from '@react-three/drei';
import * as THREE from 'three';
import { VRMUtils } from '@pixiv/three-vrm';
import { useChatStore } from '../store/chatStore';
import { CharacterProps, SceneProps, AVAILABLE_VRM_MODELS } from '../types';
import vrmaAnimationService, { VRMA_ANIMATIONS } from '../services/vrmaAnimationService';
import { useAnimationLoadingStore } from '../store/animationLoadingStore';
import { VRMOptimizedLoader } from '../services/vrmLoaderHelper';
import { simpleAnimationService } from '../services/simpleAnimationService';
import { animationLayeringService } from '../services/animationLayeringService';
import { getAnimationTimeScale } from '../config/animationSpeedConfig';

export interface ExtendedCharacterProps extends CharacterProps {
  selectedModel?: string;
}

// Default values as constants to prevent new array creation on each render
const DEFAULT_POSITION: [number, number, number] = [0, 0, 0];
const DEFAULT_ROTATION: [number, number, number] = [0, 0, 0];

const Character: React.FC<ExtendedCharacterProps> = ({
  position = DEFAULT_POSITION,
  scale = 1,
  rotation = DEFAULT_ROTATION,
}) => {
  const store = useChatStore();
  const { selectedModelId, currentAnimation } = store;
  const loadingStore = useAnimationLoadingStore();

  // Get model config based on the selected model ID
  const modelConfig = useMemo(() => {
    const model = AVAILABLE_VRM_MODELS.find(m => m.id === selectedModelId);
    return model || AVAILABLE_VRM_MODELS[0];
  }, [selectedModelId]);

  const MODEL_PATH_VRM = modelConfig.path;
  
  // Load VRM model using optimized loader that skips external texture lookups
  // VRM files have all textures embedded as data URIs, so external lookups are wasteful
  const gltf = useLoader(VRMOptimizedLoader, MODEL_PATH_VRM);
  
  const mixer = useRef<THREE.AnimationMixer | null>(null);
  const currentActions = useRef<Record<string, THREE.AnimationAction>>({});
  const vrmaActions = useRef<Record<string, THREE.AnimationAction>>({});
  const vrmaClips = useRef<Record<string, THREE.AnimationClip>>({});
  const vrmRef = useRef<unknown>(null);
  const sceneRef = useRef<THREE.Group | null>(null);
  const isInitialized = useRef<boolean>(false);
  // FIX: Track model ID separately to detect model changes for re-initialization
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const initializedModelId = useRef<string | null>(null);
  const [vrmaAnimationsLoaded, setVrmaAnimationsLoaded] = useState(false);

  const vrm = gltf.userData.vrm as unknown;
  const scene = gltf.scene;

  /**
   * Load a single VRMA animation on-demand with caching
   * Only loads the animation when first triggered, not all upfront
   * PERFORMANCE: Reduced console logging to minimize frame time impact
   */
  const loadVRMAAnimation = async (animationName: string) => {
    if (!mixer.current || !vrm) {
      return;
    }

    try {
      // First, load the VRMA file if not already loaded
      const animConfig = VRMA_ANIMATIONS.find(a => a.name === animationName);
      
      if (!animConfig) {
        console.warn(`VRMA animation '${animationName}' not found in config`);
        return;
      }

      // Load the VRMA animation file
      const loadedAnim = await vrmaAnimationService.loadAnimation(animConfig);
      
      if (!loadedAnim) {
        console.warn(`Failed to load VRMA animation '${animationName}'`);
        return;
      }

      // Now retarget the animation for the current model
      const retargetedClip = vrmaAnimationService.getOrCreateRetargetedClip(
        loadedAnim.vrmAnimation,
        vrm,
        selectedModelId,
        animationName,
        undefined // No layer for simple service
      );
      
      const action = mixer.current!.clipAction(retargetedClip);
      
      vrmaActions.current[animationName] = action;
      vrmaClips.current[animationName] = retargetedClip;
    } catch (error) {
      // Log errors but continue - some animations may not be compatible with all models
      console.warn(`Failed to load VRMA animation '${animationName}':`, error);
    }
  };

  // Note: VRM T-pose violation warnings are cosmetic and don't affect animation playback
  // These warnings appear because some VRMA animations were converted from Mixamo/FBX files
  // The animations still work correctly despite the warnings

  useEffect(() => {
    if (scene && vrm) {
      // PERFORMANCE FIX: Use initializedModelId ref to track model changes
      // Previously isInitialized.current was a boolean, causing TypeScript error
      if (isInitialized.current && mixer.current) {
        // Check if model ID has changed since last initialization
        const lastInitializedModelId = initializedModelId.current;
        if (lastInitializedModelId === selectedModelId) {
          return;
        }
      }

      const vrmObj = vrm as Record<string, unknown>;
      vrmRef.current = vrm;
      sceneRef.current = scene;
      
      // Detect VRM version
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const metaVersion = (vrmObj.meta as any)?.metaVersion;
      // Handle both "1" and "1.0" format for VRM1.0
      const isVRM1 = metaVersion === '1.0' || metaVersion === '1';
      const isVRM0 = metaVersion === '0.0' || metaVersion === '0' || !metaVersion;
      
      // Apply VRM 0.x specific transformations
      if (isVRM0) {
        try {
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          VRMUtils.rotateVRM0(vrmObj as any);
        } catch (error) {
          console.warn('Failed to apply VRM 0.x rotation:', error);
        }
      }
      
      // Apply VRM optimizations with error handling for VRM 1.0 textures
      try {
        VRMUtils.removeUnnecessaryVertices(gltf.scene);
      } catch (error) {
        console.warn('Failed to remove unnecessary vertices:', error);
      }
      
      try {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        VRMUtils.combineSkeletons((vrmObj as any).scene);
      } catch (error) {
        console.warn('Failed to combine skeletons:', error);
      }
      
      // Handle VRM 1.0 texture colorSpace issues
      if (isVRM1) {
        try {
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          const vrmScene = (vrmObj as any).scene;
          if (vrmScene) {
            vrmScene.traverse((node: THREE.Object3D) => {
              // eslint-disable-next-line @typescript-eslint/no-explicit-any
              const mesh = node as THREE.Mesh;
              if (mesh && mesh.material) {
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                const material = mesh.material as any;
                if (material.map && !material.map.colorSpace) {
                  // Set colorSpace if texture exists but doesn't have it
                  material.map.colorSpace = THREE.SRGBColorSpace;
                }
                // Handle other texture types
                ['emissiveMap', 'normalMap', 'roughnessMap', 'metalnessMap'].forEach((mapName) => {
                  // eslint-disable-next-line @typescript-eslint/no-explicit-any
                  const map = material[mapName];
                  if (map && !map.colorSpace) {
                    map.colorSpace = THREE.SRGBColorSpace;
                  }
                });
              }
            });
          }
        } catch (error) {
          console.warn('Failed to process VRM 1.0 textures:', error);
        }
      }
      

      // Apply VRM optimizations
      VRMUtils.removeUnnecessaryVertices(gltf.scene);
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      VRMUtils.combineSkeletons((vrmObj as any).scene);

      // Calculate model bounds for auto-scaling
      const box = new THREE.Box3().setFromObject(scene);
      const modelHeight = box.max.y - box.min.y;
      const modelCenter = new THREE.Vector3();
      box.getCenter(modelCenter);

      // Target height for consistent avatar sizing (fits nicely in viewport)
      const TARGET_HEIGHT = 1.6;
      const autoScale = TARGET_HEIGHT / modelHeight;

      // Apply scale: auto-scale * config scale * prop scale
      const finalScale = autoScale * (modelConfig.scale ?? 1) * scale;
      scene.scale.setScalar(finalScale);

      // Recalculate bounds after scaling
      const scaledBox = new THREE.Box3().setFromObject(scene);
      const groundOffset = -scaledBox.min.y; // Move model so feet touch y=0

      // Position model with feet on ground + any config offset
      const modelPositionY = position[1] + groundOffset + (modelConfig.positionY ?? 0);
      scene.position.set(position[0], modelPositionY, position[2]);

      // Apply rotation with model-specific adjustment to face camera
      // VRM0.x models: rotateVRM0() already provides 180° rotation, so use 0 from config
      // VRM1.0 models: may need rotation adjustment
      
      // For VRM1.0 models, apply rotation only if explicitly set in config
      // If rotationY is undefined, use default behavior (no additional rotation)
      const configRotationY = modelConfig.rotationY ?? 0;
      
      const yRotation = rotation[1] + configRotationY;
      
      scene.rotation.set(rotation[0], yRotation, rotation[2]);

      // Setup animation mixer with VRM scene
      mixer.current = new THREE.AnimationMixer(scene);

      // Initialize animation layering service with mixer
      animationLayeringService.setMixer(mixer.current);

      // Initialize simple animation service
      if (!isInitialized.current) {
        simpleAnimationService.initialize(mixer.current, vrm, selectedModelId);
        isInitialized.current = true;
        initializedModelId.current = selectedModelId;
      }

      const animations = gltf.animations;

      // Load embedded animations from VRM file
      animations.forEach(clip => {
        const action = mixer.current!.clipAction(clip);
        currentActions.current[clip.name] = action;
      });

      // Load CRITICAL animations synchronously for immediate avatar functionality
      vrmaAnimationService.loadCriticalAnimations()
        .then(async () => {
          // CRITICAL FIX: Call loadVRMAAnimation for each CRITICAL animation to create THREE.js actions
          // The service only loads VRMA files, we need to create actions from them
          const { CRITICAL_ANIMATIONS } = await import('../config/animationPriorities');
          
          for (const animName of CRITICAL_ANIMATIONS) {
            await loadVRMAAnimation(animName);
          }
          
          loadingStore.setCriticalLoaded(true);
          setVrmaAnimationsLoaded(true);
          isInitialized.current = true;

          // Prefetch commonly used animations in background to reduce loading delays
          // These animations are frequently triggered by the animation judge system
          const COMMON_ANIMATIONS = [
            'greeting', 'thinking', 'happyIdle', 'talking',
            'sneakingForward', 'sneakyWalking', 'lookAround',
            'hipHopDancing', 'hipHopDance', 'breakdance1990', 'victory'
          ];
          console.log(`%c📥 [AvatarModel] Prefetching ${COMMON_ANIMATIONS.length} common animations...`, 'color: #f39c12;');
          prefetchAnimations(COMMON_ANIMATIONS);

          // Only start idle animation if no explicit animation is playing
          const store = useChatStore.getState();
          if (!store.currentAnimation) {
            if (vrmaActions.current['modelPose']) {
              try {
                vrmaActions.current['modelPose'].reset().fadeIn(0.3).play();
              } catch {
                console.warn('Failed to play modelPose animation');
              }
            }
          }
        })
        .catch((error) => {
          console.error('Failed to load CRITICAL animations:', error);
          setVrmaAnimationsLoaded(false);
        });
    }

    return () => {
      if (mixer.current) {
        mixer.current.stopAllAction();
      }
      // Clear animation service caches to free GPU memory when switching models
      simpleAnimationService.clear();
      animationLayeringService.clear();
      vrmaAnimationService.clearRetargetedClipsForModel(selectedModelId);
      isInitialized.current = false;
    };
  }, [position, scale, rotation, selectedModelId, modelConfig]);

  // Apply a natural standing pose to the VRM model
  const applyNaturalPose = (vrm: unknown) => {
    const vrmObj = vrm as Record<string, unknown>;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const humanoid = (vrmObj.humanoid as unknown) as any;
    if (!humanoid) return;

    // Helper function to set bone rotation in degrees
    const setBoneRotation = (boneName: string, x: number, y: number, z: number) => {
      try {
        const bone = humanoid.getNormalizedBoneNode(boneName);
        if (bone) {
          bone.rotation.set(
            THREE.MathUtils.degToRad(x),
            THREE.MathUtils.degToRad(y),
            THREE.MathUtils.degToRad(z)
          );
        }
      } catch {
        // Silently ignore bone errors - different VRM models may have different bone structures
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
    
    // Update the VRM to apply changes - wrap in try-catch to handle null bone nodes
    try {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (vrmObj as any).update();
    } catch (error) {
      console.warn('Failed to update VRM pose (this is normal for some VRM models):', error);
    }
  };

  // Simple frame loop - just update mixer and VRM
  useFrame((_, delta) => {
    // PERFORMANCE FIX: Clamp delta to prevent large time jumps
    // Large deltas (e.g., from tab switching) cause animations to jump
    // and the mixer to process too much time at once
    const clampedDelta = Math.min(delta, 0.1);
    
    // Update animation mixer to advance animations
    // Only update if mixer exists and delta is reasonable
    if (mixer.current) {
      mixer.current.update(clampedDelta);
    }

    // PERFORMANCE FIX: Call animationLayeringService.update() to handle weight interpolation
    // This enables smooth blending between animation layers
    // Note: animationLayeringService.update() NO LONGER calls mixer.update() to avoid
    // triple processing of the same time delta (the main performance bottleneck)
    animationLayeringService.update(clampedDelta);

    // PERFORMANCE FIX: Only update VRM when animations are actually playing
    // VRM.update() is expensive as it recalculates all bone transforms
    // Skip update when no animations are active to save CPU cycles
    const hasActiveAnimations =
      Object.values(vrmaActions.current).some(action => action.isRunning()) ||
      Object.values(currentActions.current).some(action => action.isRunning());
    
    if (vrmRef.current && hasActiveAnimations) {
      try {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (vrmRef.current as any).update(clampedDelta);
      } catch {
        // Some VRM models may not support update() - handle gracefully
      }
    }
  });

  // Prefetch animations in background to reduce loading delays
  // PERFORMANCE: Load commonly used animations before they're needed
  const prefetchAnimations = async (animationNames: string[]) => {
    if (!mixer.current || !vrm) {
      return;
    }

    console.log(`%c📥 [AvatarModel] Prefetching ${animationNames.length} animations...`, 'color: #f39c12;');

    for (const animName of animationNames) {
      // Skip if already loaded
      if (vrmaActions.current[animName] || vrmaClips.current[animName]) {
        continue;
      }

      try {
        await loadVRMAAnimation(animName);
      } catch (error) {
        // Silently skip prefetch errors
        console.debug(`Prefetch failed for ${animName}:`, error);
      }
    }
  };

  // Helper function to play animation using animation layering service for smooth transitions
  // PERFORMANCE: Reduced console logging to minimize frame time impact
  const playAnimationDirectly = async (animationName: string) => {
    if (!mixer.current) {
      return;
    }

    // If animation not loaded yet, load it on-demand then play
    if (!vrmaActions.current[animationName] && !currentActions.current[animationName]) {
      await loadVRMAAnimation(animationName);
    }

    const action = vrmaActions.current[animationName] || currentActions.current[animationName];
    if (!action) {
      console.warn(`Animation action not found: ${animationName}`);
      // Fall back to natural pose if no animation found
      if (vrmRef.current) {
        applyNaturalPose(vrmRef.current);
      }
      return;
    }

    // Use animation layering service for smooth cross-fade transitions
    // This provides proper blending between animations instead of abrupt cuts
    try {
      // Register animation with layering service if not already registered
      const clip = action.getClip();
      if (clip && !animationLayeringService.getRegisteredAnimations().includes(animationName)) {
        animationLayeringService.registerAnimation(animationName, clip);
      }

      // Play animation on full_body layer for maximum impact
      // Using layering service provides smooth cross-fade between animations
      animationLayeringService.playAnimation(animationName, 'full_body', {
        fadeInDuration: 0.5, // Longer fade-in for smoother transitions
        fadeOutDuration: 0.5, // Longer fade-out for smoother transitions
        loop: THREE.LoopRepeat,
        weight: 1.0
      });
    } catch (error) {
      console.warn(`Failed to play animation using layering service: ${animationName}`, error);
      // Fallback to direct playback if layering service fails
      action.reset();
      // Set animation playback speed
      action.timeScale = getAnimationTimeScale();
      action.fadeIn(0.3);
      action.setLoop(THREE.LoopRepeat, Infinity);
      action.play();
    }
  };

  // Handle explicit animation triggers from the LLM judge
  // PERFORMANCE: Reduced console logging to minimize frame time impact
  useEffect(() => {
    if (!mixer.current || !vrmaAnimationsLoaded) {
      return;
    }

    if (currentAnimation) {
      playAnimationDirectly(currentAnimation);
    } else {
      // Play idle animation when currentAnimation is null
      playAnimationDirectly('modelPose');
    }
  }, [currentAnimation, vrmaAnimationsLoaded]);

  // Note: Emotion-based animations are now handled by the judge system
  // The judge system determines appropriate animations based on context
  // This component only responds to explicit animation triggers via currentAnimation

  return scene ? <primitive object={scene} /> : null;
};

const MemoizedCharacter = React.memo(Character);

const Scene: React.FC<SceneProps> = ({
  shadows = true,
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

interface AvatarModelProps {
  className?: string;
}

const AvatarModel: React.FC<AvatarModelProps> = ({ className = '' }) => {
  return (
    <div className={`w-full h-full ${className}`}>
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
