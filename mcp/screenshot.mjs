// Pictures a project in a headless Chrome of its own, over the DevTools protocol. No packages: Node has WebSocket.
import { spawn } from 'node:child_process'
import { existsSync } from 'node:fs'
import { mkdtemp, readFile, rm } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'

const CHROME_PATHS = [
  '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
  '/Applications/Chromium.app/Contents/MacOS/Chromium',
  '/usr/bin/google-chrome',
  '/usr/bin/chromium',
  '/usr/bin/chromium-browser',
  'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
]
const TIMEOUT_MS = 30_000
const POLL_MS = 100
const MAX_HEIGHT = 6000
const LOCAL_ORIGIN = /^http:\/\/(localhost|127\.0\.0\.1|\[::1\])(:\d+)?$/

/** Only an editor served from this computer is opened. */
export const isLocalOrigin = origin => LOCAL_ORIGIN.test(origin ?? '')

export function findChrome(env = process.env, exists = existsSync) {
  const found = [env.UI_BUILDER_CHROME, ...CHROME_PATHS].find(path => path && exists(path))
  if (!found) throw new Error('A screenshot needs Chrome or Chromium. Set UI_BUILDER_CHROME to its executable.')
  return found
}

const sleep = ms => new Promise(resolve => setTimeout(resolve, ms))

async function until(read, what) {
  for (let waited = 0; waited < TIMEOUT_MS; waited += POLL_MS) {
    const value = await read().catch(() => null)
    if (value) return value
    await sleep(POLL_MS)
  }
  throw new Error(`The screenshot timed out waiting for ${what}.`)
}

async function connect(url) {
  const socket = new WebSocket(url)
  await new Promise((resolve, reject) => {
    socket.onopen = resolve
    socket.onerror = () => reject(new Error('Could not connect to the headless browser.'))
  })
  const pending = new Map()
  let lastId = 0
  socket.onmessage = event => {
    const message = JSON.parse(event.data)
    pending.get(message.id)?.(message)
    pending.delete(message.id)
  }
  const send = (method, params = {}) =>
    new Promise((resolve, reject) => {
      const id = ++lastId
      const timer = setTimeout(() => reject(new Error(`The headless browser did not answer ${method}.`)), TIMEOUT_MS)
      pending.set(id, ({ result, error }) => {
        clearTimeout(timer)
        error ? reject(new Error(error.message)) : resolve(result)
      })
      socket.send(JSON.stringify({ id, method, params }))
    })
  const evaluate = async expression => {
    const { result, exceptionDetails } = await send('Runtime.evaluate', {
      expression,
      awaitPromise: true,
      returnByValue: true,
    })
    if (exceptionDetails) throw new Error(exceptionDetails.exception?.description ?? 'The page failed.')
    return result.value
  }
  return { send, evaluate, close: () => socket.close() }
}

/** A PNG of the page as base64, with its size. `fullPage` takes everything below the window too. */
export async function takeScreenshot({ origin, source, width, height, fullPage }) {
  if (!isLocalOrigin(origin)) throw new Error(`The editor must be served from this computer, not ${origin}.`)
  const profile = await mkdtemp(join(tmpdir(), 'ui-builder-shot-'))
  const chrome = spawn(
    findChrome(),
    [
      '--headless=new',
      '--hide-scrollbars',
      '--no-first-run',
      '--remote-debugging-port=0',
      `--user-data-dir=${profile}`,
    ],
    { stdio: 'ignore' },
  )
  const exited = new Promise(resolve => chrome.once('exit', resolve))
  let page = null
  try {
    const port = await until(
      async () => (await readFile(join(profile, 'DevToolsActivePort'), 'utf8')).split('\n')[0],
      'the browser to start',
    )
    const target = await until(
      async () => (await (await fetch(`http://127.0.0.1:${port}/json`)).json()).find(item => item.type === 'page'),
      'a browser tab',
    )
    page = await connect(target.webSocketDebuggerUrl)
    const resize = size =>
      page.send('Emulation.setDeviceMetricsOverride', { width, height: size, deviceScaleFactor: 1, mobile: false })
    await resize(height)
    await page.send('Page.navigate', { url: `${origin}/?screenshot` })
    await until(() => page.evaluate("typeof window.uiBuilderScreenshot === 'function'"), `the editor at ${origin}`)
    await page.evaluate(`window.uiBuilderScreenshot(${JSON.stringify(source)})`)
    const content = await page.evaluate('document.documentElement.scrollHeight')
    const shot = fullPage ? Math.min(MAX_HEIGHT, Math.max(height, content)) : height
    if (shot !== height) await resize(shot)
    // Let the browser lay out and paint at the final size.
    await page.evaluate('new Promise(done => requestAnimationFrame(() => requestAnimationFrame(done)))')
    const { data } = await page.send('Page.captureScreenshot', { format: 'png' })
    return { data, width, height: shot, contentHeight: content }
  } finally {
    page?.close()
    chrome.kill()
    await exited
    await rm(profile, { recursive: true, force: true, maxRetries: 5, retryDelay: POLL_MS })
  }
}
