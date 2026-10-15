import React from 'react';
import {
  CanvasProvider,
  CanvasContainer,
  CanvasHeader,
  CanvasContent,
  CanvasToolbar,
  useCanvas,
  useCanvasContent,
  useCanvasLayout,
  ChartRenderer,
  TimelineRenderer,
  CodeRenderer,
  DocumentRenderer,
  CustomRenderer,
  defaultTheme,
  lightTheme,
  darkTheme,
  type ChartContent,
  type TimelineContent,
  type CodeContent,
  type DocumentContent,
  type CustomContent,
  type Theme,
} from '@davincidreams/dynamic-canvas-react';

/**
 * Example component demonstrating the use of the DynamicCanvas package
 * This shows how to integrate the canvas components with the 3D chat app
 */

// Example data for different content types
const exampleChartContent: ChartContent = {
  type: 'chart',
  chartType: 'bar',
  data: {
    labels: ['Animation A', 'Animation B', 'Animation C', 'Animation D'],
    values: [12, 19, 3, 5],
    series: [{
      name: 'Usage Count',
      data: [12, 19, 3, 5],
    }],
  },
  options: {
    title: 'Animation Usage Statistics',
    colors: ['#14b8a6', '#3b82f6', '#8b5cf6', '#f59e0b'],
    showLegend: true,
  },
};

const exampleTimelineContent: TimelineContent = {
  type: 'timeline',
  data: {}, // Required by TypeScript type definition
  events: [
    { date: '2024-01-15', title: 'User Login', description: 'User successfully authenticated' },
    { date: '2024-01-15', title: 'Avatar Loaded', description: 'VRM model loaded successfully' },
    { date: '2024-01-15', title: 'First Message', description: 'User sent first chat message' },
    { date: '2024-01-15', title: 'Animation Played', description: 'Wave animation triggered' },
  ],
  options: {
    orientation: 'vertical',
    showDate: true,
    showDescription: true,
  },
};

const exampleCodeContent: CodeContent = {
  type: 'code',
  data: {}, // Required by TypeScript type definition
  code: `import { useChatStore } from './store/chatStore';

function ChatComponent() {
  const { messages, addMessage } = useChatStore();

  const handleSendMessage = (text: string) => {
    addMessage({
      id: Date.now(),
      text,
      sender: 'user',
      timestamp: new Date(),
    });
  };

  return (
    <div className="chat-container">
      {messages.map(msg => (
        <div key={msg.id}>{msg.text}</div>
      ))}
    </div>
  );
}

export default ChatComponent;`,
  language: 'typescript',
  filename: 'ChatComponent.tsx',
  showLineNumbers: true,
  showCopyButton: true,
};

const exampleDocumentContent: DocumentContent = {
  type: 'document',
  data: {}, // Required by TypeScript type definition
  content: `# Dynamic Canvas Integration Guide

The Dynamic Canvas package provides a flexible way to render different types of content in your 3D chat application.

## Features

- **ChartRenderer**: Display charts and graphs
- **TimelineRenderer**: Show event timelines
- **CodeRenderer**: Render code snippets with syntax highlighting
- **DocumentRenderer**: Display formatted documents
- **CustomRenderer**: Create custom content renderers

## Usage

Wrap your components with CanvasProvider and use the provided hooks to access canvas state and functionality.

## Theme Support

The package includes three built-in themes:
- **defaultTheme**: Balanced dark theme
- **lightTheme**: Light color scheme
- **darkTheme**: Deep dark theme

You can also create custom themes by providing a Theme object with colors, spacing, typography, and shadows.
`,
  format: 'markdown',
  title: 'Dynamic Canvas Integration Guide',
};

// Custom renderer component
const CustomContentComponent: React.FC<{ content: any }> = ({ content }) => {
  return (
    <div className="p-6 bg-gradient-to-br from-purple-500/20 to-pink-500/20 rounded-lg border border-purple-300">
      <h3 className="text-xl font-bold mb-2 text-purple-800">Custom Content Renderer</h3>
      <p className="text-gray-700">{content.message}</p>
      <div className="mt-4 p-3 bg-white/50 rounded text-sm">
        <strong>Props received:</strong>
        <pre className="mt-2 text-xs">{JSON.stringify(content.props, null, 2)}</pre>
      </div>
    </div>
  );
};

const exampleCustomContent: CustomContent = {
  type: 'custom',
  data: {
    message: 'This is a custom renderer example!',
    props: {
      message: 'This is a custom renderer example!',
      data: { value: 42, label: 'Example Data' },
    },
  },
  props: {
    message: 'This is a custom renderer example!',
    data: { value: 42, label: 'Example Data' },
  },
};

// Toolbar buttons component
const CanvasToolbarButtons: React.FC = () => {
  const { theme, setTheme, themeMode, setThemeMode } = useCanvas();
  const { setContent } = useCanvasContent();

  const contentTypes = [
    { id: 'chart', label: 'Chart', content: exampleChartContent },
    { id: 'timeline', label: 'Timeline', content: exampleTimelineContent },
    { id: 'code', label: 'Code', content: exampleCodeContent },
    { id: 'document', label: 'Document', content: exampleDocumentContent },
    { id: 'custom', label: 'Custom', content: exampleCustomContent },
  ];

  const handleSetContent = (content: any) => {
    console.log('🎨 [DynamicCanvasExample] Button clicked, setting content:', content.type);
    console.log('🎨 [DynamicCanvasExample] Content object:', content);
    setContent(content);
  };

  const themeMap: Record<string, Theme> = {
    default: defaultTheme,
    light: lightTheme,
    dark: darkTheme,
  };

  return (
    <div className="flex flex-wrap gap-2">
      {/* Content Type Buttons */}
      <div className="flex gap-1">
        {contentTypes.map((type) => (
          <button
            key={type.id}
            onClick={() => handleSetContent(type.content)}
            className="px-3 py-1.5 rounded-md text-sm font-medium transition-all bg-gray-700 text-gray-200 hover:bg-gray-600 hover:text-white"
          >
            {type.label}
          </button>
        ))}
      </div>

      {/* Theme Mode Buttons */}
      <div className="flex gap-1 ml-4">
        {(['light', 'dark', 'system'] as const).map((mode) => (
          <button
            key={mode}
            onClick={() => setThemeMode(mode)}
            className={`px-3 py-1.5 rounded-md text-sm font-medium transition-all ${
              themeMode === mode
                ? 'bg-teal-500 text-white'
                : 'bg-gray-700 text-gray-200 hover:bg-gray-600'
            }`}
          >
            {mode.charAt(0).toUpperCase() + mode.slice(1)}
          </button>
        ))}
      </div>

      {/* Theme Buttons */}
      <div className="flex gap-1 ml-4">
        {(['default', 'light', 'dark'] as const).map((t) => (
          <button
            key={t}
            onClick={() => setTheme(themeMap[t])}
            className={`px-3 py-1.5 rounded-md text-sm font-medium transition-all ${
              theme === themeMap[t]
                ? 'bg-blue-500 text-white'
                : 'bg-gray-700 text-gray-200 hover:bg-gray-600'
            }`}
          >
            {t.charAt(0).toUpperCase() + t.slice(1)}
          </button>
        ))}
      </div>
    </div>
  );
};

// Main content renderer based on content type
const ContentRenderer: React.FC = () => {
  const { content } = useCanvasContent();
  const { theme } = useCanvas();

  console.log('🎨 [ContentRenderer] Rendering, content:', content);
  console.log('🎨 [ContentRenderer] Content type:', content?.type);

  if (!content) {
    return (
      <div className="flex items-center justify-center h-full p-8">
        <div className="text-center text-gray-400">
          <p className="text-lg mb-2">No content selected</p>
          <p className="text-sm">Click a button in the toolbar to view different content types</p>
        </div>
      </div>
    );
  }

  console.log('🎨 [ContentRenderer] Rendering content type:', content.type);
  switch (content.type) {
    case 'chart':
      return <ChartRenderer content={content as ChartContent} theme={theme} />;
    case 'timeline':
      return <TimelineRenderer content={content as TimelineContent} theme={theme} />;
    case 'code':
      return <CodeRenderer content={content as CodeContent} theme={theme} />;
    case 'document':
      return <DocumentRenderer content={content as DocumentContent} theme={theme} />;
    case 'custom':
      return <CustomContentComponent content={content} />;
    default:
      return <div className="p-4">Unknown content type</div>;
  }
};

// Layout info display
const LayoutInfo: React.FC = () => {
  const { layout, widthRatio } = useCanvasLayout();

  console.log('🎨 [LayoutInfo] Layout:', layout, 'Width Ratio:', widthRatio);

  return (
    <div className="text-xs text-gray-500 mt-2 p-2 bg-gray-100 rounded">
      <div>Layout: {layout}</div>
      <div>Width Ratio: {widthRatio}</div>
    </div>
  );
};

// Main example component
export const DynamicCanvasExample: React.FC = () => {
  return (
    <CanvasProvider
      initialTheme={defaultTheme}
      initialThemeMode="dark"
      initialContent={exampleChartContent}
    >
      <CanvasContainer theme={defaultTheme} className="w-full h-full bg-gray-900 flex flex-col">
        <CanvasHeader
          title="Dynamic Canvas Example"
          description="A demonstration of the dynamic-canvas-react package integration"
          theme={defaultTheme}
        />
        <CanvasToolbar theme={defaultTheme}>
          <CanvasToolbarButtons />
        </CanvasToolbar>
        <div className="flex-1 overflow-hidden">
          <CanvasContent theme={defaultTheme}>
            <ContentRenderer />
          </CanvasContent>
        </div>
      </CanvasContainer>
    </CanvasProvider>
  );
};

export default DynamicCanvasExample;
