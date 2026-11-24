const HEX_COLOR = /^#(?:[0-9a-f]{3}|[0-9a-f]{6})$/i
const CHANNEL_MAX = 255
const DARK_TEXT = '#0F172A'
const LIGHT_TEXT = '#FFFFFF'

export const isHexColor = (value: string) => HEX_COLOR.test(value)

function channels(hex: string): [number, number, number] {
  const digits = hex.length === 4 ? [...hex.slice(1)].map(digit => digit + digit).join('') : hex.slice(1)
  const [red, green, blue] = [0, 2, 4].map(start => parseInt(digits.slice(start, start + 2), 16))
  return [red, green, blue]
}

/** Relative luminance as WCAG defines it: 0 is black, 1 is white. */
function luminance(hex: string) {
  const [red, green, blue] = channels(hex).map(channel => {
    const value = channel / CHANNEL_MAX
    return value <= 0.03928 ? value / 12.92 : ((value + 0.055) / 1.055) ** 2.4
  })
  return 0.2126 * red + 0.7152 * green + 0.0722 * blue
}

const contrast = (first: string, second: string) => {
  const [lighter, darker] = [luminance(first), luminance(second)].sort((a, b) => b - a)
  return (lighter + 0.05) / (darker + 0.05)
}

/** White or dark text, whichever is easier to read on this colour. */
export const readableTextColor = (background: string) =>
  contrast(background, LIGHT_TEXT) >= contrast(background, DARK_TEXT) ? LIGHT_TEXT : DARK_TEXT
