import { IMAGE_OVELAY_INITIAL_STATE, type ImageOverlayState } from "@/hooks/imageOverlayReducer"

export type LayerSource = { kind: "image"; dataUrl: string } | { kind: "html"; html: string }

interface LayerOptions {
  initialState: ImageOverlayState
  passThroughInactiveEdges: boolean
}

export const LAYER_OPTIONS: Record<LayerSource["kind"], LayerOptions> = {
  image: {
    initialState: IMAGE_OVELAY_INITIAL_STATE,
    passThroughInactiveEdges: true,
  },
  html: {
    initialState: {
      ...IMAGE_OVELAY_INITIAL_STATE,
      size: { width: 640, height: 480 },
      aspectRatio: 4 / 3,
      lockAspectRatio: false,
    },
    // Chrome does not report parent hover while the pointer is over the preview iframe.
    passThroughInactiveEdges: false,
  },
}
