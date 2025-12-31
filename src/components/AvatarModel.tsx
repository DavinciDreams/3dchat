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
  const [vrmaAnimationsLoaded, setVrmaAnimationsLoaded] = useState(false);

  const vrm = gltf.userData.vrm as unknown;
  const scene = gltf.scene;

  /**
   * Load a single VRMA animation on-demand with caching
   * Only loads the animation when first triggered, not all upfront
   */
  const loadVRMAAnimation = async (animationName: string) => {
    console.log(`%c📥 [loadVRMAAnimation] START: ${animationName}`, 'color: #3498db; font-weight: bold;');
    console.log(`%c📥 [loadVRMAAnimation] mixer.current:`, 'color: #3498db;', !!mixer.current);
    console.log(`%c📥 [loadVRMAAnimation] vrm:`, 'color: #3498db;', !!vrm);
    
    if (!mixer.current || !vrm) {
      console.warn(`%c📥 [loadVRMAAnimation] ABORT: mixer or vrm not ready`, 'color: #e74c3c;');
      return;
    }

    try {
      // First, load the VRMA file if not already loaded
      const animConfig = VRMA_ANIMATIONS.find(a => a.name === animationName);
      console.log(`%c📥 [loadVRMAAnimation] animConfig found:`, 'color: #3498db;', !!animConfig);
      
      if (!animConfig) {
        console.warn(`VRMA animation '${animationName}' not found in config`);
        return;
      }

      // Load the VRMA animation file
      console.log(`%c📥 [loadVRMAAnimation] Loading VRMA file: ${animConfig.path}`, 'color: #3498db;');
      const loadedAnim = await vrmaAnimationService.loadAnimation(animConfig);
      console.log(`%c📥 [loadVRMAAnimation] loadedAnim result:`, 'color: #3498db;', loadedAnim);
      
      if (!loadedAnim) {
        console.warn(`Failed to load VRMA animation '${animationName}'`);
        return;
      }

      // Now retarget the animation for the current model
      console.log(`%c📥 [loadVRMAAnimation] Creating retargeted clip for model: ${selectedModelId}`, 'color: #3498db;');
      const retargetedClip = vrmaAnimationService.getOrCreateRetargetedClip(
        loadedAnim.vrmAnimation,
        vrm,
        selectedModelId,
        animationName,
        undefined // No layer for simple service
      );
      console.log(`%c📥 [loadVRMAAnimation] retargetedClip created:`, 'color: #3498db;', !!retargetedClip);
      
      const action = mixer.current!.clipAction(retargetedClip);
      console.log(`%c📥 [loadVRMAAnimation] action created:`, 'color: #3498db;', !!action);
      
      vrmaActions.current[animationName] = action;
      vrmaClips.current[animationName] = retargetedClip;

      console.log(`%c✅ [loadVRMAAnimation] COMPLETE: '${animationName}' - vrmaActions.current now has:`, 'color: #27ae60; font-weight: bold;', Object.keys(vrmaActions.current));
    } catch (error) {
      // Log errors but continue - some animations may not be compatible with all models
      console.warn(`Failed to load VRMA animation '${animationName}':`, error);
    }
  };

  useEffect(() => {
    if (scene && vrm) {
      // Skip re-initialization if already done (prevents animation interruption)
      if (isInitialized.current && mixer.current) {
        console.log('%c⏭️ [AvatarModel] Skipping re-initialization - already initialized', 'color: #f39c12;');
        return;
      }

      console.log('%c🔧 [AvatarModel] Initializing VRM...', 'background: #3498db; color: white; padding: 2px 6px; border-radius: 3px;');

      const vrmObj = vrm as Record<string, unknown>;
      vrmRef.current = vrm;
      sceneRef.current = scene;
      
      // Detect VRM version
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const metaVersion = (vrmObj.meta as any)?.metaVersion;
      // Handle both "1" and "1.0" format for VRM1.0
      const isVRM1 = metaVersion === '1.0' || metaVersion === '1';
      const isVRM0 = metaVersion === '0.0' || metaVersion === '0' || !metaVersion;
      
      console.log(`%c🔍 [VRM Version] Model: ${selectedModelId}, Version: ${metaVersion || 'unknown'}, isVRM0: ${isVRM0}, isVRM1: ${isVRM1}`, 'background: #9b59b6; color: white; padding: 2px 6px; border-radius: 3px;');
      
      // Apply VRM 0.x specific transformations
      if (isVRM0) {
        try {
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          VRMUtils.rotateVRM0(vrmObj as any);
          console.log('%c✅ [VRM Rotation] Applied VRMUtils.rotateVRM0() (rotates VRM0.x by 180°)', 'color: #27ae60; font-weight: bold;');
        } catch (error) {
          console.warn('Failed to apply VRM 0.x rotation:', error);
        }
      } else {
        console.log('%c⏭️ [VRM Rotation] Skipping VRMUtils.rotateVRM0() - VRM1.0 model', 'color: #f39c12;');
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
      
      if (isVRM1 && configRotationY !== undefined) {
        console.log('%c🔄 [Rotation] Using explicit rotationY from config:', 'color: #3498db;', configRotationY);
      } else if (isVRM1) {
        console.log('%c⚠️ [Rotation] VRM1.0 model with no explicit rotationY - using default orientation', 'color: #f39c12;');
      }
      
      const yRotation = rotation[1] + configRotationY;
      
      console.log('%c🔄 [Rotation Debug]', 'background: #e67e22; color: white; padding: 2px 6px; border-radius: 3px;');
      console.log(`  - Model: ${modelConfig.id}`);
      console.log(`  - VRM Version: ${metaVersion || 'unknown'}`);
      console.log(`  - isVRM0: ${isVRM0} (rotateVRM0 was ${isVRM0 ? 'applied' : 'skipped'})`);
      console.log(`  - Base rotation[1]: ${rotation[1]} (${(rotation[1] * 180 / Math.PI).toFixed(1)}°)`);
      console.log(`  - modelConfig.rotationY: ${configRotationY} (${(configRotationY * 180 / Math.PI).toFixed(1)}°)`);
      console.log(`  - Final yRotation: ${yRotation} (${(yRotation * 180 / Math.PI).toFixed(1)}°)`);
      console.log(`  - Expected: ${isVRM0 ? 'VRM0.x: rotateVRM0() + 0 from config' : 'VRM1.0: Math.PI from config'}`);
      
      scene.rotation.set(rotation[0], yRotation, rotation[2]);

      console.log(`📏 [AvatarModel] Model "${modelConfig.id}" - height: ${modelHeight.toFixed(2)}m, autoScale: ${autoScale.toFixed(2)}, finalScale: ${finalScale.toFixed(2)}`);

      // Setup animation mixer with VRM scene
      mixer.current = new THREE.AnimationMixer(scene);

      // Initialize simple animation service
      if (!isInitialized.current) {
        console.log('%c🔧 [AvatarModel] Initializing simple animation service...', 'background: #3498db; color: white; padding: 2px 6px; border-radius: 3px;');
        simpleAnimationService.initialize(mixer.current, vrm, selectedModelId);
        isInitialized.current = true;
      }

      const animations = gltf.animations;

      // Load embedded animations from VRM file
      animations.forEach(clip => {
        const action = mixer.current!.clipAction(clip);
        currentActions.current[clip.name] = action;
      });

      // Load CRITICAL animations synchronously for immediate avatar functionality
      console.log('%c🚀 [AvatarModel] Loading CRITICAL animations...', 'color: #e74c3c; font-weight: bold;');

      vrmaAnimationService.loadCriticalAnimations()
        .then(async () => {
          console.log('%c🔍 [AvatarModel] loadCriticalAnimations() completed', 'color: #9b59b6; font-weight: bold;');
          console.log('%c🔍 [AvatarModel] vrmaActions.current BEFORE setting loaded:', 'color: #9b59b6;', Object.keys(vrmaActions.current));
          console.log('%c🔍 [AvatarModel] vrmaClips.current BEFORE setting loaded:', 'color: #9b59b6;', Object.keys(vrmaClips.current));
          console.log('%c🔍 [AvatarModel] vrmaAnimationService loadedAnimations:', 'color: #9b59b6;', vrmaAnimationService.getLoadedAnimationNames());
          
          // CRITICAL FIX: Call loadVRMAAnimation for each CRITICAL animation to create THREE.js actions
          // The service only loads VRMA files, we need to create actions from them
          const { CRITICAL_ANIMATIONS } = await import('../config/animationPriorities');
          console.log('%c🔧 [AvatarModel] Creating THREE.js actions for CRITICAL animations...', 'color: #e67e22; font-weight: bold;');
          
          for (const animName of CRITICAL_ANIMATIONS) {
            await loadVRMAAnimation(animName);
          }
          
          console.log('%c🔧 [AvatarModel] THREE.js actions created. vrmaActions.current:', 'color: #27ae60; font-weight: bold;', Object.keys(vrmaActions.current));
          
          loadingStore.setCriticalLoaded(true);
          setVrmaAnimationsLoaded(true);
          isInitialized.current = true;

          // Only start idle animation if no explicit animation is playing
          const store = useChatStore.getState();
          if (!store.currentAnimation) {
            if (vrmaActions.current['modelPose']) {
              try {
                vrmaActions.current['modelPose'].reset().fadeIn(0.3).play();
                console.log('Playing idle animation (modelPose)');
              } catch {
                console.warn('Failed to play modelPose animation');
              }
            } else {
              console.warn('%c⚠️ [AvatarModel] modelPose action NOT FOUND in vrmaActions.current', 'color: #e74c3c; font-weight: bold;');
            }
          } else {
            console.log('%c⏭️ [AvatarModel] Skipping idle - animation already playing: ' + store.currentAnimation, 'color: #f39c12;');
          }

          console.log('VRM model loaded:', vrm);
          console.log('Available embedded animations:', animations.map(a => a.name));
          console.log('Available VRMA animations:', Object.keys(vrmaClips.current));
          console.log('Total available animations:', [
            ...animations.map(a => a.name),
            ...Object.keys(vrmaClips.current)
          ]);
        })
        .catch((error) => {
          console.error('Failed to load CRITICAL animations:', error);
          setVrmaAnimationsLoaded(false);
        });

      console.log('VRM model loaded:', vrm);
      console.log('Available embedded animations:', animations.map(a => a.name));
      console.log('Available VRMA animations:', Object.keys(vrmaClips.current));
      console.log('Total available animations:', [
        ...animations.map(a => a.name),
        ...Object.keys(vrmaClips.current)
      ]);
    }

    return () => {
      if (mixer.current) {
        mixer.current.stopAllAction();
      }
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
    // Update animation mixer to advance animations
    if (mixer.current && delta < 0.1) {
      mixer.current.update(delta);
    }

    // Update VRM model to apply bone transformations from animations
    // This is critical - without this, animations won't affect the model's bones
    if (vrmRef.current) {
      try {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (vrmRef.current as any).update(delta);
      } catch {
        // Some VRM models may not support update() - handle gracefully
      }
    }
  });

  // Helper function to play animation using simple direct playback
  const playAnimationDirectly = async (animationName: string) => {
    console.log('%c🎭 [playAnimationDirectly] Called with:', 'color: #3498db; font-weight: bold;', animationName);
    console.log('%c🎭 [playAnimationDirectly] vrmaAnimationsLoaded:', 'color: #3498db;', vrmaAnimationsLoaded);
    console.log('%c🎭 [playAnimationDirectly] Available VRMA actions:', 'color: #3498db;', Object.keys(vrmaActions.current));
    
    if (!mixer.current) {
      console.log('%c🎭 [playAnimationDirectly] No mixer - aborting', 'color: #e74c3c;');
      return;
    }

    // If animation not loaded yet, load it on-demand then play
    if (!vrmaActions.current[animationName] && !currentActions.current[animationName]) {
      console.log('%c📥 [AvatarModel] Animation not loaded, loading on-demand:', 'color: #f39c12; font-weight: bold;', animationName);
      await loadVRMAAnimation(animationName);
    }

    const action = vrmaActions.current[animationName] || currentActions.current[animationName];
    if (!action) {
      console.warn('%c🎭 [playAnimationDirectly] Action not found: ' + animationName, 'background: #e74c3c; color: white; padding: 2px 6px;');
      // Fall back to natural pose if no animation found
      if (vrmRef.current) {
        applyNaturalPose(vrmRef.current);
      }
      return;
    }

    // Stop current action if playing
    if (mixer.current) {
      const allActions = Object.values(vrmaActions.current).concat(Object.values(currentActions.current));
      allActions.forEach(a => {
        if (a && a !== action) {
          a.fadeOut(0.2);
          a.stop();
        }
      });
    }

    // Play new animation
    action.reset();
    action.fadeIn(0.3);
    action.setLoop(THREE.LoopRepeat, Infinity);
    action.play();
    
    console.log('%c✨ [playAnimationDirectly] ANIMATION PLAYING: ' + animationName, 'background: #27ae60; color: white; padding: 4px 8px; border-radius: 4px; font-weight: bold; font-size: 14px;');
  };

  // Handle explicit animation triggers from the LLM judge
  useEffect(() => {
    console.log('%c🎯 [AvatarModel] Animation useEffect triggered', 'color: #9b59b6; font-weight: bold;');
    console.log('%c🎯 [AvatarModel] currentAnimation:', 'color: #9b59b6;', currentAnimation);
    console.log('%c🎯 [AvatarModel] mixer.current:', 'color: #9b59b6;', !!mixer.current);
    console.log('%c🎯 [AvatarModel] vrmaAnimationsLoaded:', 'color: #9b59b6;', vrmaAnimationsLoaded);

    if (!mixer.current || !vrmaAnimationsLoaded) {
      console.log('%c⛔ [AvatarModel] Early return - mixer or animations not ready', 'background: #e74c3c; color: white; padding: 2px 6px; border-radius: 3px;');
      return;
    }

    if (currentAnimation) {
      console.log('%c🌟 PLAYING ANIMATION: ' + currentAnimation, 'background: #9b59b6; color: white; padding: 4px 8px; border-radius: 4px; font-weight: bold; font-size: 16px;');
      console.log('%c🌟 Available VRMA actions:', 'color: #9b59b6; font-weight: bold;', Object.keys(vrmaActions.current));
      console.log('%c🌟 Action exists:', 'color: #9b59b6; font-weight: bold;', !!vrmaActions.current[currentAnimation]);

      playAnimationDirectly(currentAnimation);
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
