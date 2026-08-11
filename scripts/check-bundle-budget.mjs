import { readdirSync, readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { gzipSync } from 'node:zlib'

const DIST_ASSETS = resolve(process.cwd(), 'dist/assets')
const KIB = 1_024

// These ceilings leave deliberate release headroom above the measured 1.0
// candidate while keeping the static client inexpensive on constrained links.
// A budget change requires an explicit performance/release review.
const BUDGETS = Object.freeze({
  totalJavaScriptGzip: 90 * KIB,
  largestJavaScriptChunkGzip: 75 * KIB,
  totalCssGzip: 20 * KIB,
})

const formatKib = (bytes) => `${(bytes / KIB).toFixed(2)} KiB`

let filenames
try {
  filenames = readdirSync(DIST_ASSETS)
} catch (error) {
  throw new Error(
    `Bundle assets are unavailable at ${DIST_ASSETS}; run the production build first.`,
    { cause: error },
  )
}

const assets = filenames
  .filter((filename) => /\.(?:js|css)$/.test(filename))
  .map((filename) => {
    const body = readFileSync(resolve(DIST_ASSETS, filename))
    return {
      filename,
      type: filename.endsWith('.js') ? 'javascript' : 'css',
      rawBytes: body.byteLength,
      gzipBytes: gzipSync(body, { level: 9 }).byteLength,
    }
  })

const javascript = assets.filter((asset) => asset.type === 'javascript')
const css = assets.filter((asset) => asset.type === 'css')
if (javascript.length === 0 || css.length === 0) {
  throw new Error('The production bundle must contain JavaScript and CSS assets.')
}

const sumGzip = (items) =>
  items.reduce((total, asset) => total + asset.gzipBytes, 0)
const totalJavaScriptGzip = sumGzip(javascript)
const totalCssGzip = sumGzip(css)
const largestJavaScriptChunk = javascript.reduce((largest, asset) =>
  asset.gzipBytes > largest.gzipBytes ? asset : largest,
)

const failures = []
if (totalJavaScriptGzip > BUDGETS.totalJavaScriptGzip) {
  failures.push(
    `total JavaScript ${formatKib(totalJavaScriptGzip)} exceeds ${formatKib(BUDGETS.totalJavaScriptGzip)}`,
  )
}
if (
  largestJavaScriptChunk.gzipBytes >
  BUDGETS.largestJavaScriptChunkGzip
) {
  failures.push(
    `${largestJavaScriptChunk.filename} ${formatKib(largestJavaScriptChunk.gzipBytes)} exceeds the largest-chunk budget ${formatKib(BUDGETS.largestJavaScriptChunkGzip)}`,
  )
}
if (totalCssGzip > BUDGETS.totalCssGzip) {
  failures.push(
    `total CSS ${formatKib(totalCssGzip)} exceeds ${formatKib(BUDGETS.totalCssGzip)}`,
  )
}

process.stdout.write(
  [
    `Bundle budget: ${javascript.length} JS chunk(s), ${formatKib(totalJavaScriptGzip)} gzip total`,
    `Largest JS chunk: ${largestJavaScriptChunk.filename} (${formatKib(largestJavaScriptChunk.gzipBytes)} gzip)`,
    `CSS: ${css.length} asset(s), ${formatKib(totalCssGzip)} gzip total`,
  ].join('\n') + '\n',
)

if (failures.length > 0) {
  throw new Error(`Bundle budget failed: ${failures.join('; ')}.`)
}

