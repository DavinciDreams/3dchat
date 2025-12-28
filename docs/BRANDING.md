# Branding Guidelines

This document outlines the branding assets, color scheme, and social media preview implementation for the 3D AI Chat application.

## Overview

The 3D AI Chat application uses a cohesive branding identity centered around a brain icon motif, with teal as the primary brand color. The branding is designed to convey intelligence, innovation, and modern technology.

## Brand Assets

### Favicon and Icons

The application includes multiple favicon formats to ensure optimal display across different platforms and devices:

| File | Format | Size | Purpose |
|------|--------|------|---------|
| [`brain-icon.svg`](../public/brain-icon.svg) | SVG | Vector | Primary favicon for modern browsers |
| [`brain-icon-192.png`](../public/brain-icon-192.png) | PNG | 192×192px | Apple touch icon, high-DPI displays |
| [`brain-icon-512.png`](../public/brain-icon-512.png) | PNG | 512×512px | Larger icon requirements (Windows tiles, etc.) |

### Social Preview Image

| File | Format | Size | Purpose |
|------|--------|------|---------|
| [`og-image.png`](../public/og-image.png) | PNG | 1200×630px | Open Graph and Twitter Card previews |

The social preview image features:
- Teal gradient background (teal-600 to teal-500)
- Centered brain icon (200×200px)
- "3D AI Chat" title in bold white text
- Subtitle: "Real-time 3D AI chat with voice capabilities"

## Color Scheme

### Primary Brand Colors

| Color Name | Hex Code | Usage |
|------------|----------|-------|
| Teal-500 | `#14b8a6` | Primary brand color, theme color, icon stroke |
| Teal-600 | `#0d9488` | Secondary brand color, gradient start |
| Teal-50 | `#f0fdfa` | Light accent color, subtitle text |

### Color Applications

- **Theme Color**: The browser's theme color is set to `#14b8a6` (teal-500) for consistent branding in browser UI elements
- **Icon Stroke**: All brain icon variants use teal-500 (`#14b8a6`) for the stroke color
- **Gradient Background**: Social preview uses a linear gradient from teal-600 to teal-500
- **Text Colors**: White for primary text, teal-50 for secondary text on dark backgrounds

## HTML Meta Tags

The [`index.html`](../index.html) file includes comprehensive meta tags for branding and social media:

### Favicon References
```html
<link rel="icon" type="image/svg+xml" href="/brain-icon.svg" />
<link rel="icon" type="image/png" sizes="192x192" href="/brain-icon-192.png" />
<link rel="icon" type="image/png" sizes="512x512" href="/brain-icon-512.png" />
<link rel="apple-touch-icon" sizes="192x192" href="/brain-icon-192.png" />
```

### Theme Color
```html
<meta name="theme-color" content="#14b8a6" />
```

### Page Description
```html
<meta name="description" content="Real-time 3D AI chat with voice capabilities and animated VRM avatars" />
```

### Open Graph Tags (Facebook, LinkedIn, etc.)
```html
<meta property="og:type" content="website" />
<meta property="og:title" content="3D AI Chat" />
<meta property="og:description" content="Real-time 3D AI chat with voice capabilities and animated VRM avatars" />
<meta property="og:image" content="/og-image.png" />
```

### Twitter Card Tags
```html
<meta name="twitter:card" content="summary_large_image" />
<meta name="twitter:title" content="3D AI Chat" />
<meta name="twitter:description" content="Real-time 3D AI chat with voice capabilities and animated VRM avatars" />
<meta name="twitter:image" content="/og-image.png" />
```

## Regenerating Favicons

The favicon PNG files and social preview image can be regenerated using the provided Node.js script.

### Prerequisites

Install the required dependency:
```bash
npm install canvas
```

### Running the Script

To regenerate all favicon and social preview assets:
```bash
node scripts/generate-favicons.js
```

### What the Script Does

The [`generate-favicons.js`](../scripts/generate-favicons.js) script:

1. **Generates PNG favicons** from the SVG brain icon:
   - Creates `brain-icon-192.png` (192×192px)
   - Creates `brain-icon-512.png` (512×512px)

2. **Creates the social preview image**:
   - Generates `og-image.png` (1200×630px)
   - Applies teal gradient background
   - Centers the brain icon
   - Adds "3D AI Chat" title and subtitle text

### Customization

To customize the branding:

1. **Modify the SVG icon**: Edit the `svgContent` variable in [`generate-favicons.js`](../scripts/generate-favicons.js:10-20)
2. **Change colors**: Update the hex codes in the script (e.g., `#14b8a6` for teal-500)
3. **Update text**: Modify the title and subtitle in the `createOGImage` function
4. **Regenerate**: Run the script again to create new assets

## Browser Support

The favicon implementation provides broad compatibility:

- **Modern browsers**: SVG favicon for crisp rendering at any size
- **Legacy browsers**: PNG fallbacks at multiple resolutions
- **Apple devices**: Dedicated apple-touch-icon for iOS home screen bookmarks
- **High-DPI displays**: 512×512 PNG ensures sharp rendering on retina displays
- **Windows tiles**: Large PNG for Windows Start Menu pinning

## Social Media Preview

The Open Graph and Twitter Card tags ensure consistent, branded previews when links are shared:

- **Facebook**: Uses og:title, og:description, and og:image
- **Twitter**: Uses summary_large_image card type with dedicated tags
- **LinkedIn**: Falls back to Open Graph tags
- **Other platforms**: Use Open Graph tags as the standard

### Testing Social Previews

Use these tools to verify social media previews:

- [Facebook Sharing Debugger](https://developers.facebook.com/tools/debug/)
- [Twitter Card Validator](https://cards-dev.twitter.com/validator)
- [LinkedIn Post Inspector](https://www.linkedin.com/post-inspector/)

## Best Practices

1. **Keep SVG source**: Always maintain the SVG version as the source of truth
2. **Regenerate after changes**: Run the script after any icon or color modifications
3. **Test across platforms**: Verify favicon appearance on different browsers and devices
4. **Validate meta tags**: Use social media debugging tools to ensure previews render correctly
5. **Maintain aspect ratios**: Keep the 1200×630 aspect ratio for og-image.png to avoid cropping

## Additional Resources

- [Favicon Best Practices](https://evilmartians.com/chronicles/how-to-favicon-in-2021-six-files-that-fit-most-needs)
- [Open Graph Protocol](https://ogp.me/)
- [Twitter Card Documentation](https://developer.twitter.com/en/docs/twitter-for-websites/cards/overview/abouts-cards)
- [HTML5 Theme Color](https://developer.mozilla.org/en-US/docs/Web/HTML/Element/meta/name/theme-color)
