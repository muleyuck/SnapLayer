interface Position {
  x: number
  y: number
}

interface Size {
  width: number
  height: number
}

export type ImageOverlayState = {
  position: Position
  size: Size
  aspectRatio: number
  lockAspectRatio: boolean
  opacity: number
  isVisibleImage: boolean
}

export const IMAGE_OVELAY_INITIAL_STATE: ImageOverlayState = {
  position: { x: 100, y: 100 },
  size: { width: 200, height: 200 },
  aspectRatio: 1,
  lockAspectRatio: true,
  opacity: 100,
  isVisibleImage: true,
}

export type ImageOverlayAction =
  | { type: "SET_POSITION"; payload: Position }
  | { type: "SET_SIZE"; payload: Size }
  | { type: "SET_ASPECT_RATIO"; payload: number }
  | { type: "TOGGLE_LOCK_ASPECT_RATIO" }
  | { type: "SET_OPACITY"; payload: number }
  | { type: "TOGGLE_VISIBILITY" }

export function imageOverlayReducer(state: ImageOverlayState, action: ImageOverlayAction): ImageOverlayState {
  switch (action.type) {
    case "SET_POSITION":
      return { ...state, position: action.payload }
    case "SET_SIZE":
      return { ...state, size: action.payload }
    case "SET_ASPECT_RATIO":
      return { ...state, aspectRatio: action.payload }
    case "TOGGLE_LOCK_ASPECT_RATIO":
      return { ...state, lockAspectRatio: !state.lockAspectRatio }
    case "TOGGLE_VISIBILITY":
      return { ...state, isVisibleImage: !state.isVisibleImage }
    case "SET_OPACITY": {
      return { ...state, opacity: action.payload }
    }
    default:
      return state
  }
}
