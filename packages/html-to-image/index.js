const SVG_NS = "http://www.w3.org/2000/svg"

const serializeNode = (node) => {
  const serializer = new XMLSerializer()
  return serializer.serializeToString(node)
}

const getNodeDimensions = (node, options = {}) => {
  if (!(node instanceof HTMLElement)) {
    return { width: 0, height: 0 }
  }

  if (typeof options.width === "number" && typeof options.height === "number") {
    return { width: options.width, height: options.height }
  }

  const rect = node.getBoundingClientRect()
  const width = options.width ?? Math.ceil(rect.width || node.offsetWidth || node.scrollWidth || 0)
  const height = options.height ?? Math.ceil(rect.height || node.offsetHeight || node.scrollHeight || 0)

  return { width, height }
}

const buildStyleText = (computedStyle) => {
  let styleText = ""
  for (let i = 0; i < computedStyle.length; i += 1) {
    const property = computedStyle[i]
    const value = computedStyle.getPropertyValue(property)
    styleText += `${property}:${value};`
  }
  return styleText
}

const inlineComputedStyles = (source, target) => {
  if (!(source instanceof Element) || !(target instanceof Element)) {
    return
  }

  const sources = [source, ...source.querySelectorAll("*")]
  const targets = [target, ...target.querySelectorAll("*")]

  sources.forEach((sourceElement, index) => {
    const targetElement = targets[index]

    if (!(sourceElement instanceof Element) || !(targetElement instanceof Element)) {
      return
    }

    const computedStyle = window.getComputedStyle(sourceElement)
    const existingStyle = targetElement.getAttribute("style") ?? ""
    const styleText = buildStyleText(computedStyle)

    const needsSemicolon = existingStyle.trim().length > 0 && !existingStyle.trim().endsWith(";")
    const separator = needsSemicolon ? ";" : ""
    targetElement.setAttribute("style", `${existingStyle}${separator}${styleText}`)
  })
}

const applyCacheBustToImages = (root, cacheBustValue) => {
  if (!(root instanceof Element)) {
    return
  }

  const images = root.querySelectorAll("img")
  images.forEach((image) => {
    const src = image.getAttribute("src")
    if (!src || src.startsWith("data:")) {
      return
    }

    const separator = src.includes("?") ? "&" : "?"
    image.setAttribute("src", `${src}${separator}cacheBust=${cacheBustValue}`)
  })
}

const cloneNodeForExport = (node, options = {}) => {
  const clone = node.cloneNode(true)

  if (clone instanceof HTMLElement && node instanceof HTMLElement) {
    inlineComputedStyles(node, clone)

    if (options.cacheBust) {
      applyCacheBustToImages(clone, Date.now())
    }
  }

  return clone
}

const createSvgDocument = (node, options = {}) => {
  if (!(node instanceof HTMLElement)) {
    throw new Error("Expected an HTMLElement to convert to SVG")
  }

  const { width, height } = getNodeDimensions(node, options)

  if (width === 0 || height === 0) {
    throw new Error("Unable to determine node dimensions for export")
  }

  const clone = cloneNodeForExport(node, options)

  const svg = document.createElementNS(SVG_NS, "svg")
  svg.setAttribute("xmlns", SVG_NS)
  svg.setAttribute("width", String(width))
  svg.setAttribute("height", String(height))
  svg.setAttribute("viewBox", `0 0 ${width} ${height}`)

  const foreignObject = document.createElementNS(SVG_NS, "foreignObject")
  foreignObject.setAttribute("width", "100%")
  foreignObject.setAttribute("height", "100%")

  const wrapper = document.createElement("div")
  wrapper.setAttribute("xmlns", "http://www.w3.org/1999/xhtml")
  wrapper.style.width = `${width}px`
  wrapper.style.height = `${height}px`
  wrapper.style.overflow = "hidden"
  wrapper.style.display = "block"
  wrapper.style.boxSizing = "border-box"
  wrapper.style.margin = "0"

  if (options.backgroundColor) {
    wrapper.style.backgroundColor = options.backgroundColor
  }

  wrapper.appendChild(clone)
  foreignObject.appendChild(wrapper)
  svg.appendChild(foreignObject)

  return serializeNode(svg)
}

const loadImage = (src) =>
  new Promise((resolve, reject) => {
    const image = new Image()
    image.crossOrigin = "anonymous"
    image.onload = () => resolve(image)
    image.onerror = (error) => reject(error ?? new Error("Failed to load image"))
    image.src = src
  })

const drawImageToCanvas = (image, width, height, options = {}) => {
  const pixelRatio = options.pixelRatio && options.pixelRatio > 0 ? options.pixelRatio : 1
  const canvas = document.createElement("canvas")
  canvas.width = Math.round(width * pixelRatio)
  canvas.height = Math.round(height * pixelRatio)

  const context = canvas.getContext("2d")
  if (!context) {
    throw new Error("Unable to access 2D canvas context")
  }

  if (options.backgroundColor) {
    context.fillStyle = options.backgroundColor
    context.fillRect(0, 0, canvas.width, canvas.height)
  }

  if (pixelRatio !== 1) {
    context.scale(pixelRatio, pixelRatio)
  }

  context.drawImage(image, 0, 0, width, height)

  return canvas
}

const waitForFonts = async () => {
  if (document.fonts && typeof document.fonts.ready?.then === "function") {
    try {
      await document.fonts.ready
    } catch (error) {
      // Ignore font loading errors and continue with export
      void error
    }
  }
}

const toSvg = async (node, options = {}) => {
  if (!(node instanceof HTMLElement)) {
    throw new Error("Expected an HTMLElement to convert to SVG")
  }

  await waitForFonts()

  return createSvgDocument(node, options)
}

const toPng = async (node, options = {}) => {
  if (!(node instanceof HTMLElement)) {
    throw new Error("Expected an HTMLElement to convert to PNG")
  }

  const { width, height } = getNodeDimensions(node, options)

  if (width === 0 || height === 0) {
    throw new Error("Unable to determine node dimensions for export")
  }

  const pixelRatio = options.pixelRatio && options.pixelRatio > 0 ? options.pixelRatio : 1

  const svgMarkup = await toSvg(node, options)
  const blob = new Blob([svgMarkup], {
    type: "image/svg+xml;charset=utf-8",
  })
  const url = URL.createObjectURL(blob)

  try {
    const image = await loadImage(url)
    const canvas = drawImageToCanvas(image, width, height, {
      backgroundColor: options.backgroundColor,
      pixelRatio,
    })

    return canvas.toDataURL("image/png", options.quality ?? 0.92)
  } finally {
    URL.revokeObjectURL(url)
  }
}

module.exports = {
  toPng,
  toSvg,
}
