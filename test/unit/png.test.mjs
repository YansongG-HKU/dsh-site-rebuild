import assert from 'node:assert/strict'
import { test } from 'node:test'
import { deflateSync } from 'node:zlib'
import { crc32, decodePng, encodePng, pngSize } from '../../lib/png.js'

/** Build a raw PNG from scanlines already filtered. */
function rawPng(width, height, colorType, channels, scanlines, filterType = 0) {
  const signature = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])
  const chunk = (type, data) => {
    const out = Buffer.alloc(12 + data.length)
    out.writeUInt32BE(data.length, 0)
    out.write(type, 4, 'latin1')
    data.copy(out, 8)
    out.writeUInt32BE(crc32(type, data), 8 + data.length)
    return out
  }
  const ihdr = Buffer.alloc(13)
  ihdr.writeUInt32BE(width, 0)
  ihdr.writeUInt32BE(height, 4)
  ihdr[8] = 8
  ihdr[9] = colorType
  const raw = Buffer.concat(scanlines.map((row) => Buffer.concat([Buffer.from([filterType]), row])))
  return Buffer.concat([signature, chunk('IHDR', ihdr), chunk('IDAT', deflateSync(raw)), chunk('IEND', Buffer.alloc(0))])
}

test('encode and decode round-trip RGBA', () => {
  const width = 5
  const height = 3
  const rgba = new Uint8Array(width * height * 4)
  for (let i = 0; i < rgba.length; i += 1) rgba[i] = (i * 37) % 256
  const png = encodePng(rgba, width, height)
  assert.deepEqual(pngSize(png), { width, height })
  const decoded = decodePng(png)
  assert.equal(decoded.width, width)
  assert.equal(decoded.height, height)
  assert.deepEqual([...decoded.rgba], [...rgba])
})

test('decode supports the five PNG filter types', () => {
  // 3x3 RGB image; the same pixel data encoded with each filter.
  const pixels = []
  for (let y = 0; y < 3; y += 1) {
    for (let x = 0; x < 3; x += 1) pixels.push([x * 40 + 10, y * 50 + 20, 100])
  }
  for (let filter = 0; filter < 5; filter += 1) {
    const scanlines = []
    let previous = [0, 0, 0]
    for (let y = 0; y < 3; y += 1) {
      const row = Buffer.alloc(9)
      for (let x = 0; x < 3; x += 1) {
        const [r, g, b] = pixels[y * 3 + x]
        const left = x > 0 ? pixels[y * 3 + x - 1] : [0, 0, 0]
        const up = y > 0 ? pixels[(y - 1) * 3 + x] : [0, 0, 0]
        const upLeft = x > 0 && y > 0 ? pixels[(y - 1) * 3 + x - 1] : [0, 0, 0]
        const encoded = [
          filterValue(filter, r, left[0], up[0], upLeft[0]),
          filterValue(filter, g, left[1], up[1], upLeft[1]),
          filterValue(filter, b, left[2], up[2], upLeft[2]),
        ]
        row[x * 3] = encoded[0] & 0xff
        row[x * 3 + 1] = encoded[1] & 0xff
        row[x * 3 + 2] = encoded[2] & 0xff
      }
      scanlines.push(row)
      previous = row
    }
    const decoded = decodePng(rawPng(3, 3, 2, 3, scanlines, filter))
    for (let i = 0; i < 9; i += 1) {
      const [r, g, b] = pixels[i]
      assert.equal(decoded.rgba[i * 4], r, `filter ${filter} red at ${i}`)
      assert.equal(decoded.rgba[i * 4 + 1], g, `filter ${filter} green at ${i}`)
      assert.equal(decoded.rgba[i * 4 + 2], b, `filter ${filter} blue at ${i}`)
      assert.equal(decoded.rgba[i * 4 + 3], 255)
    }
  }
})

/** Encode one channel value with the PNG filter being tested. */
function filterValue(filter, value, left, up, upLeft) {
  if (filter === 0) return value
  if (filter === 1) return value - left
  if (filter === 2) return value - up
  if (filter === 3) return value - Math.floor((left + up) / 2)
  const p = left + up - upLeft
  const pa = Math.abs(p - left)
  const pb = Math.abs(p - up)
  const pc = Math.abs(p - upLeft)
  const predictor = pa <= pb && pa <= pc ? left : pb <= pc ? up : upLeft
  return value - predictor
}

test('decodes greyscale PNGs to RGBA', () => {
  const scanlines = [Buffer.from([10, 20, 30]), Buffer.from([40, 50, 60])]
  const decoded = decodePng(rawPng(3, 2, 0, 1, scanlines))
  assert.deepEqual([...decoded.rgba.slice(0, 8)], [10, 10, 10, 255, 20, 20, 20, 255])
})

test('rejects bad input clearly', () => {
  assert.throws(() => decodePng(Buffer.from('not a png')), /signature/u)
  assert.throws(() => decodePng(Buffer.alloc(10)), /signature|truncated/u)
  assert.throws(() => encodePng(new Uint8Array(4), 2, 2), /smaller/u)
})

test('pngSize reads dimensions without decoding', () => {
  const rgba = new Uint8Array(8)
  const png = encodePng(rgba, 2, 1)
  assert.deepEqual(pngSize(png), { width: 2, height: 1 })
  assert.equal(pngSize(Buffer.from('nope')), null)
})
