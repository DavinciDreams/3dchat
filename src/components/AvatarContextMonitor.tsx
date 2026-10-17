import { useEffect, useState } from 'react';
import { useThree } from '@react-three/fiber';

/** Turn a runtime context loss into a local, retryable React error. */
export function AvatarContextMonitor(): null {
  const canvas = useThree(state => state.gl.domElement);
  const [lost, setLost] = useState(false);

  useEffect(() => {
    const onLost = (event: Event) => {
      event.preventDefault();
      setLost(true);
    };
    canvas.addEventListener('webglcontextlost', onLost);
    return () => canvas.removeEventListener('webglcontextlost', onLost);
  }, [canvas]);

  if (lost) throw new Error('Avatar graphics context lost');
  return null;
}
