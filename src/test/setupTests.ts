import "@testing-library/jest-dom/vitest"
import { vi } from "vitest"

class ResizeObserverStub implements ResizeObserver {
  private callback: ResizeObserverCallback

  constructor(callback: ResizeObserverCallback) {
    this.callback = callback
  }

  observe(target: Element): void {
    const contentRect = {
      x: 0,
      y: 0,
      top: 0,
      left: 0,
      right: 800,
      bottom: 400,
      width: 800,
      height: 400,
      toJSON() {
        return {}
      },
    } satisfies DOMRectReadOnly

    this.callback(
      [
        {
          target,
          contentRect,
          borderBoxSize: [],
          contentBoxSize: [],
          devicePixelContentBoxSize: [],
        } as ResizeObserverEntry,
      ],
      this
    )
  }

  unobserve(): void {}

  disconnect(): void {}
}

if (!globalThis.ResizeObserver) {
  ;(globalThis as { ResizeObserver: typeof ResizeObserver }).ResizeObserver =
    ResizeObserverStub
}

if (!window.matchMedia) {
  Object.defineProperty(window, "matchMedia", {
    writable: true,
    value: (query: string) => ({
      matches: false,
      media: query,
      onchange: null,
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      addListener: vi.fn(),
      removeListener: vi.fn(),
      dispatchEvent: vi.fn(),
    }),
  })
}

// Polyfill for File.arrayBuffer() in Node.js test environment (jsdom)
if (typeof File !== 'undefined' && !File.prototype.arrayBuffer) {
  File.prototype.arrayBuffer = function(this: File): Promise<ArrayBuffer> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader()
      reader.onloadend = () => {
        if (reader.error) {
          reject(reader.error)
        } else {
          resolve(reader.result as ArrayBuffer)
        }
      }
      reader.readAsArrayBuffer(this)
    })
  }
}

// Polyfill for Blob.arrayBuffer() in Node.js test environment (jsdom)
if (typeof Blob !== 'undefined' && !Blob.prototype.arrayBuffer) {
  Blob.prototype.arrayBuffer = function(this: Blob): Promise<ArrayBuffer> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader()
      reader.onloadend = () => {
        if (reader.error) {
          reject(reader.error)
        } else {
          resolve(reader.result as ArrayBuffer)
        }
      }
      reader.readAsArrayBuffer(this)
    })
  }
}
