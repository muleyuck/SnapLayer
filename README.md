
<picture>
  <source media="(prefers-color-scheme: dark)" srcset="/public/logo-dark.svg">
  <img width="512" src="/public/logo-light.svg">
</picture>

[![unit-test](https://github.com/muleyuck/SnapLayer/actions/workflows/unit-test.yml/badge.svg)](https://github.com/muleyuck/SnapLayer/actions/workflows/unit-test.yml)
![Software License](https://img.shields.io/badge/license-MIT-brightgreen.svg?style=flat-square)
[![Release](https://img.shields.io/github/release/muleyuck/SnapLayer.svg)](https://github.com/muleyuck/SnapLayer/releases/latest)

🎞️ A Chrome extension that lets you overlay JPEG/PNG/SVG images and HTML mockups on any webpage.
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
- **HTML Mockups** - Load a single HTML file with CSS, images and rendering scripts; change its viewport dimensions and scroll within the overlay
- **Style Isolation** - Shadow DOM ensures no conflicts with host page styles
- **Keyboard Shortcuts** - Move with arrow keys; Shift+arrow for 10 px jumps; Backspace or Delete to delete
- **Clipboard Paste** - Paste images, SVG source or HTML source with Cmd/Ctrl+V
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
2. Select a JPEG, PNG, SVG or HTML file from your computer
3. The file appears as an overlay on the current page
4. **Move**: Drag any outer edge or the toolbar background to reposition any layer; images can also be dragged directly
5. **Resize**: Drag the corner or edge handles
6. **Adjust**: Use the toolbar to change opacity, toggle visibility, or delete

Select an `.html` or `.htm` file, or paste HTML source to preview it. Relative companion files are not imported.

Pasted HTML source must start with an HTML doctype or a standard HTML opening tag, ignoring surrounding whitespace and tag case. Fragments such as `<div>Mockup</div>` are supported; custom or unknown opening tags and ordinary text are rejected. SVG source starting with an `svg` opening tag stays an image. Images take precedence over accompanying text. Only the clipboard's plain text is used as source; rich HTML from copying a rendered webpage is ignored, even when present alongside plain text.

Resizing HTML changes its viewport dimensions so responsive layouts reflow instead of scaling. Scroll over the HTML to scroll the mockup.

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

Drag any of the four outer edges to move an image, SVG or HTML layer. The square handles resize it. The toolbar stays within the viewport and its background remains draggable when the edges are offscreen. Buttons and inputs keep their normal actions.

Click an edge, the toolbar background or a resize handle to focus the layer. Shortcuts apply while the layer or its controls are focused; editing a toolbar input keeps its native key behavior. Keys pressed inside an HTML mockup are handled by that HTML.

| Key | Action |
|-----|--------|
| Arrow keys | Move overlay 1 px |
| Shift + Arrow keys | Move overlay 10 px |
| Backspace / Delete | Remove overlay |
| Cmd/Ctrl + V | Paste image, SVG source or HTML source from clipboard |

## Privacy

See the [Privacy Policy](PRIVACY.md).

## License

[The MIT Licence](https://github.com/muleyuck/SnapLayer/blob/main/LICENSE)
