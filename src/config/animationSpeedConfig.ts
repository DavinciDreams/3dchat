import { useChatStore } from '../store/chatStore';

export const getAnimationTimeScale = (): number => {
  return useChatStore.getState().animationSpeed;
};
