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
import vrmaAnimationService, { VRMA_ANIMATIONS } from '../services/vrmaAnimationService';

export interface ExtendedCharacterProps extends CharacterProps {
  selectedModel?: string;
}

const Character: React.FC<ExtendedCharacterProps> = ({
  position = [0, 0, 0],
  scale = 1,
  rotation = [0, 0, 0],
}) => {
  const store = useChatStore();
  const { emotion, isSpeaking, visemes, selectedModelId } = store;

  // Get model path based on the selected model ID
  // The key prop on the parent component handles model changes, so no timestamp needed
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
  const vrmaClips = useRef<Record<string, THREE.AnimationClip>>({});
  const visemeStartTime = useRef<number>(0);
  const speakingStartTime = useRef<number>(0);
  const lastUpdate = useRef<number>(0);
  const frameSkip = useRef<number>(1);
  const vrmRef = useRef<unknown>(null);
  const sceneRef = useRef<THREE.Group | null>(null);
  const [vrmaAnimationsLoaded, setVrmaAnimationsLoaded] = useState(false);
  // Track which VRMA animations have been loaded for lazy loading
  const loadedVrmaAnimations = useRef<Set<string>>(new Set());

  
  const vrm = gltf.userData.vrm as unknown;
  const scene = gltf.scene;

  /**
   * Load a single VRMA animation on-demand with caching
   * Only loads the animation when first triggered, not all upfront
   */
  const loadVRMAAnimation = async (animationName: string) => {
    if (!mixer.current || !vrm) return;

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
        animationName
      );
      const action = mixer.current!.clipAction(retargetedClip);
      vrmaActions.current[animationName] = action;
      vrmaClips.current[animationName] = retargetedClip;
      loadedVrmaAnimations.current.add(animationName);

      console.log(`VRMA animation '${animationName}' loaded`);
    } catch (error) {
      // Log errors but continue - some animations may not be compatible with all models
      console.warn(`Failed to load VRMA animation '${animationName}':`, error);
    }
  };

  useEffect(() => {
    if (scene && vrm) {
      const vrmObj = vrm as Record<string, unknown>;
      vrmRef.current = vrm;
      sceneRef.current = scene;
      
      // Detect VRM version
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const metaVersion = (vrmObj.meta as any)?.metaVersion;
      const isVRM1 = metaVersion === '1.0';
      const isVRM0 = metaVersion === '0.0' || !metaVersion;
      
      console.log(`Loading VRM model: ${selectedModelId}, Version: ${metaVersion || 'unknown'}`);
      
      // Apply VRM 0.x specific transformations
      if (isVRM0) {
        try {
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          VRMUtils.rotateVRM0(vrmObj as any);
          console.log('Applied VRM 0.x rotation');
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
      
      // Register VRM with viseme applier
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      visemeApplier.setVRM(vrmObj as any);
      
      // Position and scale the model
      scene.position.set(position[0], position[1], position[2]);
      scene.scale.setScalar(scale);
      // Rotate to face the camera - Different models have different default orientations
      const isPeachModel = selectedModelId === 'peach';
      let yRotation = rotation[1];
      
      // Apply model-specific rotation adjustments
      // Models may have different default orientations - adjust as needed
      if (isPeachModel) {
        yRotation += Math.PI; // Peach faces backwards by default
      }
      // Billy and Mega may need adjustment based on testing
      
      scene.rotation.set(rotation[0], yRotation, rotation[2]);
      
      // Setup animation mixer with VRM scene
      mixer.current = new THREE.AnimationMixer(scene);
      const animations = gltf.animations;
      
      // Load embedded animations from VRM file
      animations.forEach(clip => {
        const action = mixer.current!.clipAction(clip);
        currentActions.current[clip.name] = action;
      });

      // Load VRMA animations with proper retargeting
      loadVRMAAnimation('modelPose').then(() => {
        console.log('VRMA animations loaded successfully');
        setVrmaAnimationsLoaded(true);
        
        // Start idle animation from VRMA after loading
        if (vrmaActions.current['modelPose']) {
          try {
            vrmaActions.current['modelPose'].reset().fadeIn(0.3).play();
            console.log('Playing idle animation (modelPose)');
          } catch {
            console.warn('Failed to play modelPose animation');
          }
        }
        
        console.log('VRM model loaded:', vrm);
        console.log('Available embedded animations:', animations.map(a => a.name));
        console.log('Available VRMA animations:', Object.keys(vrmaClips.current));
        console.log('Total available animations:', [
          ...animations.map(a => a.name),
          ...Object.keys(vrmaClips.current)
        ]);
      }).catch((error) => {
        console.warn('Failed to load VRMA animations:', error);
        setVrmaAnimationsLoaded(false);
      });
    }
    
    return () => {
      if (mixer.current) {
        mixer.current.stopAllAction();
      }
      visemeApplier.setVRM(null);
    };
  }, [position, scale, rotation, selectedModelId]);

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

  // Handle viseme animation (simplified for GLB model - log viseme changes)
  useFrame((_, delta) => {
    if (frameSkip.current > 1) {
      lastUpdate.current++;
      if (lastUpdate.current % frameSkip.current !== 0) return;
    }

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

    const fadeToAction = async (actionName: string, duration: number = 0.3) => {
      // Try VRMA actions first
      let action = vrmaActions.current[actionName];
      
      // If VRMA action doesn't exist, try to load it on-demand
      if (!action && !loadedVrmaAnimations.current.has(actionName)) {
        await loadVRMAAnimation(actionName);
        action = vrmaActions.current[actionName];
      }
      
      // Fall back to embedded animations
      if (!action) {
        action = currentActions.current[actionName];
      }
      
      if (!action) {
        console.warn(`Animation action not found: ${actionName}`);
        if (vrmRef.current) {
          applyNaturalPose(vrmRef.current);
        }
        return;
      }

      // Fade out all other actions
      Object.values(currentActions.current).forEach(a => {
        if (a !== action) a.fadeOut(duration);
      });
      Object.values(vrmaActions.current).forEach(a => {
        if (a !== action) a.fadeOut(duration);
      });

      // Try to play the animation, but handle binding failures gracefully
      try {
        action.reset().fadeIn(duration).play();
      } catch {
        console.warn(`Failed to play animation '${actionName}' - bone structure mismatch with current VRM model`);
        // Fall back to natural pose if VRMA animation fails
        if (vrmRef.current) {
          applyNaturalPose(vrmRef.current);
        }
      }
    };

    if (isSpeaking) {
      fadeToAction('greeting');  // Will now load on-demand
    } else {
      switch (emotion) {
        case 'thinking':
          fadeToAction('spin');
          break;
        case 'happy':
          fadeToAction('peace');
          break;
        default:
          fadeToAction('modelPose');
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
