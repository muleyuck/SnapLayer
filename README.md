
<picture>
  <source media="(prefers-color-scheme: dark)" srcset="/public/logo-dark.svg">
  <img width="512" src="/public/logo-light.svg">
</picture>

[![unit-test](https://github.com/muleyuck/SnapLayer/actions/workflows/unit-test.yml/badge.svg)](https://github.com/muleyuck/SnapLayer/actions/workflows/unit-test.yml)
![Software License](https://img.shields.io/badge/license-MIT-brightgreen.svg?style=flat-square)
[![Release](https://img.shields.io/github/release/muleyuck/SnapLayer.svg)](https://github.com/muleyuck/SnapLayer/releases/latest)

🎞️ A Chrome extension that lets you overlay JPEG/PNG/SVG images on any webpage.  
Perfect for designers comparing mockups, developers checking pixel-perfect implementations, or anyone who needs to visually compare images against web content. No more switching tabs — compare side by side in real time.

## Screenshots

![SnapLayer screenshot](https://github.com/user-attachments/assets/ea26b139-053c-46d1-8e8b-2c0fa4391f5f)

## Features

- **Drag & Drop Positioning** - Move the overlay anywhere on the page
- **8-Direction Resizing** - Resize from any corner or edge
- **Aspect Ratio Lock** - Maintain proportions while resizing (toggleable)
- **Opacity Control** - Adjust transparency for easy comparison
- **Visibility Toggle** - Quickly show/hide the overlay
- **JPEG/PNG & SVG Support** - Works with common image formats
- **Style Isolation** - Shadow DOM ensures no conflicts with host page styles
- **Keyboard Shortcuts** - Move with arrow keys; Shift+arrow for 10 px jumps; Backspace to delete
- **Clipboard Paste** - Paste images with Cmd/Ctrl+V, including SVG as plain text
- **Fit to Viewport** - Expand image to fill the viewport width and toggle back to original size
- **Manual Size Input** - Type exact pixel dimensions directly in the toolbar

## Installation

### Recommend

- [Chrome Web Store](https://chromewebstore.google.com/detail/snaplayer/mlfijeojnbmhecfigldlcmjfjbcdgpgm)

### Optional (Manual install from source)

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
| Width / Height | Enter exact pixel dimensions |
| Expand Icon | Fit to viewport width (click again to restore) |
| Opacity Slider | Adjust image transparency (0-100%) |
| Lock Icon | Toggle aspect ratio lock |
| Eye Icon | Toggle image visibility |
| Trash Icon | Remove the overlay |

## Keyboard Shortcuts

| Key | Action |
|-----|--------|
| Arrow keys | Move overlay 1 px |
| Shift + Arrow keys | Move overlay 10 px |
| Backspace / Delete | Remove overlay |
| Cmd/Ctrl + V | Paste image from clipboard |

## License

[The MIT Licence](https://github.com/muleyuck/SnapLayer/blob/main/LICENSE)
