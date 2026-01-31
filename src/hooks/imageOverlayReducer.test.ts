import { describe, expect, it } from "vitest"
import {
  IMAGE_OVELAY_INITIAL_STATE,
  type ImageOverlayAction,
  type ImageOverlayState,
  imageOverlayReducer,
} from "@/hooks/imageOverlayReducer"

describe("imageOverlayReducer", () => {
  describe("initial state", () => {
    it("should have correct initial values", () => {
      expect(IMAGE_OVELAY_INITIAL_STATE).toEqual({
        position: { x: 100, y: 100 },
        size: { width: 200, height: 200 },
        aspectRatio: 1,
        lockAspectRatio: true,
        opacity: 100,
        isVisibleImage: true,
      })
    })
  })

  describe("SET_POSITION", () => {
    it("should update position", () => {
      const state = IMAGE_OVELAY_INITIAL_STATE
      const action: ImageOverlayAction = {
        type: "SET_POSITION",
        payload: { x: 200, y: 300 },
      }

      const newState = imageOverlayReducer(state, action)

      expect(newState.position).toEqual({ x: 200, y: 300 })
      expect(newState.size).toEqual(state.size)
    })
  })

  describe("SET_SIZE", () => {
    it("should update size", () => {
      const state = IMAGE_OVELAY_INITIAL_STATE
      const action: ImageOverlayAction = {
        type: "SET_SIZE",
        payload: { width: 400, height: 300 },
      }

      const newState = imageOverlayReducer(state, action)

      expect(newState.size).toEqual({ width: 400, height: 300 })
      expect(newState.position).toEqual(state.position)
    })
  })

  describe("SET_ASPECT_RATIO", () => {
    it("should update aspect ratio", () => {
      const state = IMAGE_OVELAY_INITIAL_STATE
      const action: ImageOverlayAction = {
        type: "SET_ASPECT_RATIO",
        payload: 1.5,
      }

      const newState = imageOverlayReducer(state, action)

      expect(newState.aspectRatio).toBe(1.5)
    })
  })

  describe("TOGGLE_LOCK_ASPECT_RATIO", () => {
    it("should toggle lock aspect ratio from true to false", () => {
      const state: ImageOverlayState = {
        ...IMAGE_OVELAY_INITIAL_STATE,
        lockAspectRatio: true,
      }
      const action: ImageOverlayAction = { type: "TOGGLE_LOCK_ASPECT_RATIO" }

      const newState = imageOverlayReducer(state, action)

      expect(newState.lockAspectRatio).toBe(false)
    })
  })

  describe("SET_OPACITY", () => {
    it("should update opacity", () => {
      const state = IMAGE_OVELAY_INITIAL_STATE
      const action: ImageOverlayAction = {
        type: "SET_OPACITY",
        payload: 50,
      }

      const newState = imageOverlayReducer(state, action)

      expect(newState.opacity).toBe(50)
    })
  })

  describe("TOGGLE_VISIBILITY", () => {
    it("should toggle visibility from true to false", () => {
      const state: ImageOverlayState = {
        ...IMAGE_OVELAY_INITIAL_STATE,
        isVisibleImage: true,
      }
      const action: ImageOverlayAction = { type: "TOGGLE_VISIBILITY" }

      const newState = imageOverlayReducer(state, action)

      expect(newState.isVisibleImage).toBe(false)
    })
  })

  describe("unknown action", () => {
    it("should return current state for unknown action", () => {
      const state = IMAGE_OVELAY_INITIAL_STATE
      // @ts-expect-error testing unknown action
      const action: ImageOverlayAction = { type: "UNKNOWN_ACTION" }

      const newState = imageOverlayReducer(state, action)

      expect(newState).toBe(state)
    })
  })
})
