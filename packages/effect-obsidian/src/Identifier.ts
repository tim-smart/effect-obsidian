/**
 * @since 1.0.0
 */

/**
 * @since 1.0.0
 * @category constructors
 */
export const make = (): string => {
  const t = []
  for (let n = 0; n < 16; n++) {
    t.push((16 * Math.random() | 0).toString(16))
  }
  return t.join("")
}
