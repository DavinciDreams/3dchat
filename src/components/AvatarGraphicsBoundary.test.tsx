import { useState } from 'react';
import { act, cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { AvatarGraphicsBoundary } from './AvatarGraphicsBoundary';
import { AvatarContextMonitor } from './AvatarContextMonitor';

let canvas: HTMLCanvasElement;
vi.mock('@react-three/fiber', () => ({
  useThree: (selector: (state: { gl: { domElement: HTMLCanvasElement } }) => unknown) => selector({ gl: { domElement: canvas } }),
}));

function Chat() {
  const [draft, setDraft] = useState('Unsaved message');
  return <input aria-label="Chat message" value={draft} onChange={event => setDraft(event.target.value)} />;
}

describe('avatar graphics recovery', () => {
  beforeEach(() => {
    canvas = document.createElement('canvas');
    vi.spyOn(console, 'error').mockImplementation(() => {});
  });
  afterEach(() => { cleanup(); vi.restoreAllMocks(); });

  it('keeps chat and voice controls when graphics creation fails, then retries only the avatar', () => {
    let unavailable = true;
    function Avatar(): JSX.Element {
      if (unavailable) throw new Error('Error creating WebGL context.');
      return <div>Avatar rendered</div>;
    }
    render(<>
      <AvatarGraphicsBoundary><Avatar /></AvatarGraphicsBoundary>
      <Chat />
      <button>Voice picker</button>
    </>);
    expect(screen.getByRole('alert')).toHaveTextContent('3D avatar unavailable');
    fireEvent.change(screen.getByRole('textbox'), { target: { value: 'Keep this draft' } });
    expect(screen.getByRole('button', { name: 'Voice picker' })).toBeEnabled();
    unavailable = false;
    fireEvent.click(screen.getByRole('button', { name: 'Retry 3D avatar' }));
    expect(screen.getByText('Avatar rendered')).toBeInTheDocument();
    expect(screen.getByRole('textbox')).toHaveValue('Keep this draft');
  });

  it('contains repeated retry failures without removing chat', () => {
    function BrokenAvatar(): never { throw new Error('Error creating WebGL context.'); }
    render(<><AvatarGraphicsBoundary><BrokenAvatar /></AvatarGraphicsBoundary><Chat /></>);
    fireEvent.click(screen.getByRole('button', { name: 'Retry 3D avatar' }));
    expect(screen.getByRole('alert')).toHaveTextContent('Chat and voice are still available');
    expect(screen.getByRole('textbox')).toHaveValue('Unsaved message');
  });

  it('handles a context lost after startup and removes the canvas listener', () => {
    const remove = vi.spyOn(canvas, 'removeEventListener');
    render(<><AvatarGraphicsBoundary><AvatarContextMonitor /></AvatarGraphicsBoundary><Chat /></>);
    const lost = new Event('webglcontextlost', { cancelable: true });
    act(() => { canvas.dispatchEvent(lost); });
    expect(lost.defaultPrevented).toBe(true);
    expect(screen.getByRole('alert')).toBeInTheDocument();
    expect(screen.getByRole('textbox')).toHaveValue('Unsaved message');
    expect(remove).toHaveBeenCalledWith('webglcontextlost', expect.any(Function));
  });
});
