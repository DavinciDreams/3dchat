import React from 'react';

/** Keep a graphics failure inside the avatar pane, preserving chat and speech. */
export class AvatarGraphicsBoundary extends React.Component<
  { children: React.ReactNode },
  { failed: boolean }
> {
  state = { failed: false };

  static getDerivedStateFromError(): { failed: boolean } {
    return { failed: true };
  }

  render(): React.ReactNode {
    if (!this.state.failed) return this.props.children;

    return (
      <div className="h-full flex items-center justify-center p-6">
        <div role="alert" className="max-w-sm text-center text-gray-300">
          <h2 className="text-lg font-semibold text-white mb-3">3D avatar unavailable</h2>
          <p className="mb-3">The avatar couldn't start or lost its graphics connection. Chat and voice are still available.</p>
          <p className="text-sm mb-5">Try restarting your browser. If this keeps happening, check that graphics acceleration is enabled in your browser settings.</p>
          <button
            type="button"
            onClick={() => this.setState({ failed: false })}
            className="px-4 py-2 bg-teal-500 text-white rounded-md hover:bg-teal-600 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-teal-300"
          >
            Retry 3D avatar
          </button>
        </div>
      </div>
    );
  }
}
