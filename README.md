[![unit-test](https://github.com/muleyuck/SnapLayer/actions/workflows/unit-test.yml/badge.svg)](https://github.com/muleyuck/SnapLayer/actions/workflows/unit-test.yml)

<picture>
  <source media="(prefers-color-scheme: dark)" srcset="/public/logo-dark.svg">
  <img width="512" src="/public/logo-light.svg">
</picture>

# SnapLayer

🎞️ A Chrome extension that lets you overlay JPEG/PNG/SVG images on any webpage.  
Perfect for designers comparing mockups, developers checking pixel-perfect implementations, or anyone who needs to visually compare images against web content.

<!--
## Screenshots

TODO: Add screenshots/GIF demo here
![SnapLayer Demo](docs/demo.gif)
-->

## Features

- **Drag & Drop Positioning** - Move the overlay anywhere on the page
- **8-Direction Resizing** - Resize from any corner or edge
- **Aspect Ratio Lock** - Maintain proportions while resizing (toggleable)
- **Opacity Control** - Adjust transparency for easy comparison
- **Visibility Toggle** - Quickly show/hide the overlay
- **JPEG/PNG & SVG Support** - Works with common image formats
- **Style Isolation** - Shadow DOM ensures no conflicts with host page styles

## Installation

### Manual Installation (Developer Mode)

1. Clone or download this repository
2. Build the extension:
   ```bash
   npm install
   npm run build
   ```
3. Open Chrome and navigate to `chrome://extensions/`
4. Enable **Developer mode** (toggle in top-right corner)
5. Click **Load unpacked** and select the `dist/` folder

## Usage

1. Click the SnapLayer extension icon in Chrome toolbar
2. Select a JPEG, PNG or SVG image file from your computer
3. The image appears as an overlay on the current page
4. **Move**: Drag the image to reposition
5. **Resize**: Drag the corner or edge handles
6. **Adjust**: Use the toolbar to change opacity, toggle visibility, or delete

### Toolbar Controls

| Control | Description |
|---------|-------------|
| Opacity Slider | Adjust image transparency (0-100%) |
| Lock Icon | Toggle aspect ratio lock |
| Eye Icon | Toggle image visibility |
| Trash Icon | Remove the overlay |

## License

[The MIT Licence](https://github.com/muleyuck/SnapLayer/blob/main/LICENSE)
