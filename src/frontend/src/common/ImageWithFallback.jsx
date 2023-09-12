/*
https://www.joshwcomeau.com/performance/embracing-modern-image-formats/
Some browsers do not yet support the webp format, which is used by the
dfinity astronaut in loader.webp
This function falls back on a fallback image in another format

Use as:
  <ImageWithFallback
    src="/images/cereal.webp"
    fallback="/images/cereal.png"
    alt="A photo showing the expiration date on a box of Lucky Charms"
  /> 
*/

// eslint-disable-next-line no-use-before-define
import React from 'react'

export function ImageWithFallback({
  src,
  fallback,
  height = '150',
  width = '150',
  type = 'image/webp',
  ...delegated
}) {
  return (
    <picture>
      <source srcSet={src} type={type} height={height} width={width} />
      <img src={fallback} height={height} width={width} {...delegated} />
    </picture>
  )
}
