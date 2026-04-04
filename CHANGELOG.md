# Changelog

## [0.3.0](https://github.com/muleyuck/SnapLayer/compare/v0.2.0...v0.3.0) (2026-03-28)

This release contains only build system and tooling changes (WXT migration, Vite 8 upgrade) with no user-facing feature or bug fix changes.

## [0.2.0](https://github.com/muleyuck/SnapLayer/compare/v0.1.1...v0.2.0) (2026-03-15)

### Features

* add CollapseIcon and restore position/size after viewport fit ([#32](https://github.com/muleyuck/SnapLayer/issues/32)) ([164b620](https://github.com/muleyuck/SnapLayer/commit/164b620020e49558d0fa1fdb06e3755b6626b09f))
* add arrow key movement support for ImageOverlay ([#31](https://github.com/muleyuck/SnapLayer/issues/31)) ([8c0ce8e](https://github.com/muleyuck/SnapLayer/commit/8c0ce8e4f5e498c469ab8cead1d3c3676b56e773))
* add Backspace key support to delete ImageOverlay ([#30](https://github.com/muleyuck/SnapLayer/issues/30)) ([7901c69](https://github.com/muleyuck/SnapLayer/commit/7901c6953ac4e7bb86b2b2a1d71e154d11eb8686))
* add SettingsIconFilled to indicate toolbar expanded/collapsed state ([4f4b563](https://github.com/muleyuck/SnapLayer/commit/4f4b56392ef65842991ff73cda0eb541e0cd4a3a))

## [0.1.1](https://github.com/muleyuck/SnapLayer/compare/v0.1.0...v0.1.1) (2026-02-07)

### Features

* load content script on demand via sendMessage ([22a65bb](https://github.com/muleyuck/SnapLayer/commit/22a65bb))

### Bug Fixes

* restrict manifest permissions to minimum required ([070f979](https://github.com/muleyuck/SnapLayer/commit/070f979))

## [0.1.0](https://github.com/muleyuck/SnapLayer/releases/tag/v0.1.0) (2026-02-01)

### Features

* implement image overlay component with drag, resize, and opacity controls ([f7c0c4b](https://github.com/muleyuck/SnapLayer/commit/f7c0c4b))
* popup UI to upload image file ([42ed4b3](https://github.com/muleyuck/SnapLayer/commit/42ed4b3))
* add content script to send uploaded image to active tab ([638f0f4](https://github.com/muleyuck/SnapLayer/commit/638f0f4))
* add favicon and logo ([c26cadd](https://github.com/muleyuck/SnapLayer/commit/c26cadd))

### Bug Fixes

* vite resolve absolute path ([3933556](https://github.com/muleyuck/SnapLayer/commit/3933556))
* relative public base path ([424f05a](https://github.com/muleyuck/SnapLayer/commit/424f05a))
* import absolute path ([e6c9852](https://github.com/muleyuck/SnapLayer/commit/e6c9852))
* fix app title name ([35f13ad](https://github.com/muleyuck/SnapLayer/commit/35f13ad))
* add detailed error handling on ImageUploader ([46b6f26](https://github.com/muleyuck/SnapLayer/commit/46b6f26))
