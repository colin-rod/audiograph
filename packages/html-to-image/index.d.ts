export type ToImageOptions = {
  width?: number
  height?: number
  quality?: number
  pixelRatio?: number
  backgroundColor?: string
  cacheBust?: boolean
}

export declare function toPng(
  node: HTMLElement,
  options?: ToImageOptions
): Promise<string>

export declare function toSvg(
  node: HTMLElement,
  options?: ToImageOptions
): Promise<string>
