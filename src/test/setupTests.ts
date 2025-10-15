import "@testing-library/jest-dom/vitest"

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
