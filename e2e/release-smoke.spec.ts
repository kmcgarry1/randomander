import AxeBuilder from '@axe-core/playwright'
import { expect, test, type Page, type TestInfo } from '@playwright/test'
import {
  cardResponse,
  createCard,
  createDoubleFacedCard,
  deferredCardResponse,
  errorResponse,
  installMockedUpstream,
  type MockedUpstream,
} from './fixtures/upstream'

test.beforeEach(async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' })
})

const openOptions = async (page: Page) => {
  const opener = page.getByRole('button', { name: 'Filters' })
  await opener.click()
  const dialog = page.getByRole('dialog', { name: 'Randomizer options' })
  await expect(dialog).toBeVisible()
  return { dialog, opener }
}

const selectMode = async (page: Page, mode: string) => {
  const { dialog } = await openOptions(page)
  await dialog.getByRole('button', { name: new RegExp(`^${mode}`, 'i') }).click()
  await dialog.getByRole('button', { name: 'Done' }).click()
  await expect(dialog).toBeHidden()
}

const randomize = (page: Page) =>
  page.getByRole('button', { name: 'Randomize', exact: true }).click()

const expectResult = async (page: Page, title: string) => {
  const heading = page.locator('[data-result-heading]')
  await expect(heading).toHaveText(title)
  await expect(heading).toBeVisible()
}

const expectIsolated = (upstream: MockedUpstream) => {
  expect(
    upstream.unexpectedExternalRequests,
    'Every external browser request must be explicitly mocked.',
  ).toEqual([])
}

const scanAccessibility = async (
  page: Page,
  testInfo: TestInfo,
  label: string,
) => {
  const results = await new AxeBuilder({ page })
    .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa'])
    .analyze()

  await testInfo.attach(`${label}-axe-results`, {
    body: Buffer.from(JSON.stringify(results, null, 2)),
    contentType: 'application/json',
  })
  expect(
    results.violations,
    results.violations
      .map((violation) => `${violation.id}: ${violation.help}`)
      .join('\n'),
  ).toEqual([])
}

test('draws Commander, Partner pair, and Spark with mocked contracts', async ({
  page,
}) => {
  const commander = createCard('Release Commander')
  const partnerCommander = createCard('Background Captain', {
    oracle_text: 'Choose a Background',
  })
  const background = createCard('Haunted Background', {
    type_line: 'Legendary Enchantment — Background',
  })
  const sparks = [
    createCard('Spark One'),
    createCard('Spark Two'),
    createCard('Spark Three'),
  ]
  const upstream = await installMockedUpstream(page, [
    cardResponse(commander),
    cardResponse(partnerCommander),
    cardResponse(background),
    ...sparks.map((card) => cardResponse(card)),
  ])

  await page.goto('/')
  await randomize(page)
  await expectResult(page, commander.name)

  await selectMode(page, 'Partner pair')
  await randomize(page)
  await expectResult(page, `${partnerCommander.name} + ${background.name}`)

  await selectMode(page, '3-card spark')
  await randomize(page)
  await expectResult(page, sparks.map((card) => card.name).join(' + '))

  expect(upstream.scryfallRequests).toHaveLength(6)
  expect(upstream.remainingScryfallResponses()).toBe(0)
  expectIsolated(upstream)
})

test('completes a choice and turns a double-faced card independently', async ({
  page,
}) => {
  const background = createCard('Agent of Browser Tests', {
    type_line: 'Legendary Enchantment — Background',
  })
  const doubleFaced = createDoubleFacedCard(
    'browser-dfc',
    'Fixture Front',
    'Fixture Back',
  )
  const backgroundCommander = createCard('Fixture Party Leader', {
    oracle_text: 'Choose a Background',
  })
  const upstream = await installMockedUpstream(page, [
    cardResponse(background),
    cardResponse(doubleFaced),
    cardResponse(backgroundCommander),
  ])

  await page.goto('/')
  const { dialog } = await openOptions(page)
  await dialog
    .getByRole('checkbox', { name: 'Show two commander options' })
    .check()
  await dialog.getByRole('button', { name: 'Done' }).click()
  await randomize(page)
  await expectResult(page, 'Compare commanders')

  const optionOne = page
    .getByRole('list', { name: 'Cards in option 1' })
    .locator('xpath=ancestor::article')
  const optionTwo = page
    .getByRole('list', { name: 'Cards in option 2' })
    .locator('xpath=ancestor::article')

  await optionTwo
    .getByRole('button', { name: 'Show Fixture Back (back face)' })
    .click()
  await expect(
    optionTwo.getByRole('img', { name: 'Fixture Back (back face)' }),
  ).toBeVisible()

  await optionOne.getByRole('button', { name: 'Find commander' }).click()
  await expect(
    optionOne.getByRole('heading', {
      name: `${backgroundCommander.name} + ${background.name}`,
    }),
  ).toBeVisible()
  await expect(
    optionTwo.getByRole('img', { name: 'Fixture Front (front face)' }),
  ).toBeVisible()

  expect(upstream.scryfallRequests).toHaveLength(3)
  expect(upstream.remainingScryfallResponses()).toBe(0)
  expectIsolated(upstream)
})

test('persists, reloads, and restores a saved pull in native Web Storage', async ({
  page,
}) => {
  const savedCard = createCard('Persistent Commander')
  const upstream = await installMockedUpstream(page, [cardResponse(savedCard)])

  await page.goto('/')
  await randomize(page)
  await expectResult(page, savedCard.name)
  await page.getByRole('button', { name: 'Save pull' }).click()
  await expect(page.getByRole('button', { name: 'Pull saved' })).toBeDisabled()

  await page.reload()
  await page.getByRole('button', { name: 'Saved', exact: true }).click()
  const savedDialog = page.getByRole('dialog', { name: 'Saved pulls' })
  await expect(savedDialog.getByText(savedCard.name, { exact: true })).toBeVisible()
  await expect(savedDialog.getByLabel('Saved pull count')).toContainText('1 saved')
  await savedDialog.getByRole('button', { name: 'Load' }).click()
  await expect(savedDialog).toBeHidden()
  await expectResult(page, savedCard.name)

  const savedCount = await page.evaluate(() => {
    const value = localStorage.getItem('randomander:state:v3:saved')
    if (!value) return 0
    const envelope = JSON.parse(value) as {
      schema?: unknown
      version?: unknown
      partition?: unknown
      value?: unknown
    }
    if (
      envelope.schema !== 'randomander-partition' ||
      envelope.version !== 1 ||
      envelope.partition !== 'saved' ||
      !Array.isArray(envelope.value)
    ) {
      return 0
    }
    return envelope.value.length
  })
  expect(savedCount).toBe(1)
  expectIsolated(upstream)
})

test('traps keyboard focus, restores the opener, and passes axe scans', async ({
  page,
}, testInfo) => {
  const upstream = await installMockedUpstream(page, [])
  await page.goto('/')
  await scanAccessibility(page, testInfo, 'initial-draw')

  const { dialog, opener } = await openOptions(page)
  await expect
    .poll(() => dialog.evaluate((node) => node.contains(document.activeElement)))
    .toBe(true)
  await page.keyboard.press('Shift+Tab')
  await expect
    .poll(() => dialog.evaluate((node) => node.contains(document.activeElement)))
    .toBe(true)
  await scanAccessibility(page, testInfo, 'options-dialog')

  await page.keyboard.press('Escape')
  await expect(dialog).toBeHidden()
  await expect(opener).toBeFocused()
  expectIsolated(upstream)
})

test('recovers after a request timeout and an upstream HTTP failure', async ({
  page,
}) => {
  await page.clock.install()
  const recovered = createCard('Recovered Commander')
  const delayed = deferredCardResponse(createCard('Too Slow'))
  const upstream = await installMockedUpstream(page, [
    delayed.response,
    errorResponse(503),
    cardResponse(recovered),
  ])

  await page.goto('/')
  await randomize(page)
  await expect.poll(() => upstream.scryfallRequests.length).toBe(1)
  await page.clock.fastForward(10_000)
  await expect(page.getByRole('alert')).toContainText(
    'This draw timed out after 10 seconds.',
  )
  delayed.release()
  await upstream.waitForScryfallIdle()
  await page.evaluate(
    () =>
      new Promise<void>((resolve) =>
        requestAnimationFrame(() => requestAnimationFrame(() => resolve())),
      ),
  )
  await expect(page.getByRole('alert')).toContainText(
    'This draw timed out after 10 seconds.',
  )
  await expect(
    page.getByRole('heading', { name: 'Too Slow', exact: true }),
  ).toHaveCount(0)

  await randomize(page)
  await expect(page.getByRole('alert')).toContainText('Request failed (503).')

  await randomize(page)
  await expectResult(page, recovered.name)
  expect(upstream.scryfallRequests).toHaveLength(3)
  expect(upstream.remainingScryfallResponses()).toBe(0)
  expectIsolated(upstream)
})

test('cancels an in-flight draw from the modal and remains usable', async ({
  page,
}) => {
  const recovered = createCard('Commander After Cancellation')
  const cancelled = deferredCardResponse(createCard('Cancelled Commander'))
  const upstream = await installMockedUpstream(page, [
    cancelled.response,
    cardResponse(recovered),
  ])

  await page.goto('/')
  const randomizeButton = page.getByRole('button', {
    name: 'Randomize',
    exact: true,
  })
  await randomizeButton.click()
  const loadingDialog = page.getByRole('dialog', { name: 'Shuffling cards...' })
  await expect(loadingDialog).toBeVisible()
  await expect.poll(() => upstream.scryfallRequests.length).toBe(1)
  try {
    await loadingDialog.getByRole('button', { name: 'Cancel draw' }).click()
  } finally {
    cancelled.release()
  }
  await upstream.waitForScryfallIdle()
  await expect(loadingDialog).toBeHidden()
  await expect(randomizeButton).toBeFocused()
  await expect(
    page.getByRole('heading', { name: 'Cancelled Commander', exact: true }),
  ).toHaveCount(0)

  const cancellation = page.getByRole('alert')
  await expect(cancellation).toContainText('Draw cancelled.')
  await cancellation.getByRole('button', { name: 'Try again' }).click()
  await expectResult(page, recovered.name)
  expect(upstream.scryfallRequests).toHaveLength(2)
  expect(upstream.remainingScryfallResponses()).toBe(0)
  expectIsolated(upstream)
})

test('[responsive evidence] contains long pair choices and a modal DFC at narrow and 200% text sizes', async ({
  page,
}, testInfo) => {
  test.setTimeout(60_000)
  const unbrokenName = (prefix: string) => `${prefix}${'X'.repeat(72)}`
  const firstPartner = createCard(unbrokenName('FirstPartner'), {
    oracle_text: 'Partner',
    color_identity: ['W'],
  })
  const doubleFacedPartner = createDoubleFacedCard(
    'responsive-modal-dfc',
    unbrokenName('ModalFront'),
    unbrokenName('ModalBack'),
  )
  doubleFacedPartner.oracle_text = 'Partner'
  doubleFacedPartner.color_identity = ['W']
  const secondPartner = createCard(unbrokenName('SecondPartner'), {
    oracle_text: 'Partner',
    color_identity: ['W'],
  })
  const fourthPartner = createCard(unbrokenName('FourthPartner'), {
    oracle_text: 'Partner',
    color_identity: ['W'],
  })
  const upstream = await installMockedUpstream(page, [
    cardResponse(firstPartner),
    cardResponse(doubleFacedPartner),
    cardResponse(secondPartner),
    cardResponse(fourthPartner),
  ])

  await page.goto('/')
  const { dialog } = await openOptions(page)
  await dialog.getByRole('button', { name: /^Partner pair/i }).click()
  await dialog
    .getByRole('checkbox', { name: 'Show two partner options' })
    .check()
  await dialog.getByRole('button', { name: 'Done' }).click()
  await expect(dialog).toBeHidden()
  await randomize(page)
  await expect.poll(() => upstream.scryfallRequests.length).toBeGreaterThan(0)
  await expectResult(page, 'Compare pairings')
  await page.getByRole('region', { name: 'Randomizer result' }).scrollIntoViewIfNeeded()
  await page.waitForLoadState('networkidle')
  const assetRequestCountBeforeBackdrop = upstream.externalAssetRequests.length

  const setBackdropState = async ({
    ambient,
    simplified,
  }: {
    ambient: boolean
    simplified: boolean
  }) => {
    await page.getByRole('button', { name: 'Settings', exact: true }).click()
    const settings = page.getByRole('dialog', { name: 'Settings' })
    await expect(settings).toBeVisible()
    if (simplified) {
      await settings
        .getByRole('checkbox', { name: /Simplify backdrop/i })
        .check()
    } else {
      await settings
        .getByRole('button', { name: 'Standard', exact: true })
        .click()
    }
    const ambientToggle = settings.getByRole('checkbox', {
      name: /Ambient backdrop/i,
    })
    if (ambient) await ambientToggle.check()
    else await ambientToggle.uncheck()
    await settings.getByRole('button', { name: 'Close', exact: true }).click()
    await expect(settings).toBeHidden()
  }

  const inspectBackdrop = async (mode: 'full' | 'simplified') => {
    const backdrop = page.getByTestId('draw-backdrop')
    await expect(backdrop).toHaveAttribute('data-mode', mode)
    const sourceEvidence = await backdrop.evaluate((node) => {
      const elements = [node, ...Array.from(node.querySelectorAll<HTMLElement>('*'))]
      return {
        mediaElements: node.querySelectorAll('img, picture, source, video').length,
        backgroundImages: elements
          .map((element) => getComputedStyle(element).backgroundImage)
          .filter((value) => value !== 'none'),
      }
    })
    expect(sourceEvidence.mediaElements).toBe(0)
    expect(sourceEvidence.backgroundImages.some((value) => /url\(/i.test(value))).toBe(
      false,
    )
    return sourceEvidence
  }

  const backdropEvidence: Array<{
    state: string
    mediaElements: number
    backgroundImages: string[]
  }> = []
  await setBackdropState({ ambient: true, simplified: false })
  backdropEvidence.push({
    state: 'standard',
    ...(await inspectBackdrop('full')),
  })
  await testInfo.attach(`${testInfo.project.name}-backdrop-standard`, {
    body: await page.getByRole('region', { name: 'Randomizer result' }).screenshot(),
    contentType: 'image/png',
  })

  await setBackdropState({ ambient: true, simplified: true })
  backdropEvidence.push({
    state: 'simplified',
    ...(await inspectBackdrop('simplified')),
  })
  await testInfo.attach(`${testInfo.project.name}-backdrop-simplified`, {
    body: await page.getByRole('region', { name: 'Randomizer result' }).screenshot(),
    contentType: 'image/png',
  })

  await setBackdropState({ ambient: false, simplified: true })
  await expect(page.getByTestId('draw-backdrop')).toHaveCount(0)
  backdropEvidence.push({
    state: 'ambient-off',
    mediaElements: 0,
    backgroundImages: [],
  })
  await testInfo.attach(`${testInfo.project.name}-backdrop-ambient-off`, {
    body: await page.getByRole('region', { name: 'Randomizer result' }).screenshot(),
    contentType: 'image/png',
  })
  expect(
    upstream.externalAssetRequests.length,
    'Backdrop states must not request external image, font, or analytics assets.',
  ).toBe(assetRequestCountBeforeBackdrop)
  await testInfo.attach(`${testInfo.project.name}-backdrop-evidence`, {
    body: Buffer.from(JSON.stringify(backdropEvidence, null, 2)),
    contentType: 'application/json',
  })

  const cardSurfaces = page.locator('.prestige-card')
  await expect(cardSurfaces).toHaveCount(4)
  const doubleFacedItem = page
    .getByRole('listitem')
    .filter({ has: page.locator('[data-card-face]') })
  await expect(doubleFacedItem).toHaveCount(1)

  const scenarios = [
    { width: 320, rootTextPercent: 100 },
    { width: 375, rootTextPercent: 100 },
    { width: 390, rootTextPercent: 100 },
    { width: 320, rootTextPercent: 200 },
    { width: 375, rootTextPercent: 200 },
    { width: 390, rootTextPercent: 200 },
  ]
  const webkitScreenshotPixelLimit = 32_767
  const measurements: Array<{
    width: number
    rootTextPercent: number
    innerWidth: number
    scrollWidth: number
    documentHeight: number
    devicePixelRatio: number
    scrollX: number
    settleAttempts: number
    screenshotMode: 'full-page' | 'viewport'
    documentWidths: {
      htmlClient: number
      htmlOffset: number
      htmlScroll: number
      bodyClient: number
      bodyOffset: number
      bodyScroll: number
    }
    overflowingElements: Array<{
      tag: string
      id: string
      className: string
      text: string
      left: number
      right: number
      width: number
    }>
    effectElements: Array<{
      tag: string
      id: string
      className: string
      text: string
      left: number
      right: number
      clientWidth: number
      offsetWidth: number
      scrollWidth: number
      overflowX: string
      transform: string
      translate: string
      before: string
      after: string
    }>
    boxes: Array<{ label: string; x: number; y: number; width: number; height: number }>
  }> = []

  for (const scenario of scenarios) {
    await page.setViewportSize({ width: scenario.width, height: 844 })
    await page.evaluate(async (rootTextPercent) => {
      document.documentElement.style.fontSize = `${rootTextPercent}%`
      await document.fonts.ready
      await new Promise<void>((resolve) => {
        requestAnimationFrame(() => requestAnimationFrame(() => resolve()))
      })
    }, scenario.rootTextPercent)

    const documentSize = await page.evaluate(async () => {
      const describePseudo = (element: HTMLElement, pseudo: '::before' | '::after') => {
        const style = getComputedStyle(element, pseudo)
        const hasContent = !['none', 'normal', '""'].includes(style.content)
        const hasEffect =
          style.transform !== 'none' ||
          style.translate !== 'none' ||
          style.filter !== 'none'
        if (!hasContent && !hasEffect) return ''
        return [
          `content=${style.content}`,
          `display=${style.display}`,
          `position=${style.position}`,
          `left=${style.left}`,
          `right=${style.right}`,
          `width=${style.width}`,
          `overflow-x=${style.overflowX}`,
          `transform=${style.transform}`,
          `translate=${style.translate}`,
          `filter=${style.filter}`,
        ].join(';')
      }
      const measure = () => {
        const html = document.documentElement
        const body = document.body
        const innerWidth = window.innerWidth
        const candidates = Array.from(body.querySelectorAll<HTMLElement>('*')).map((element) => {
          const rect = element.getBoundingClientRect()
          const style = getComputedStyle(element)
          return {
            tag: element.tagName.toLowerCase(),
            id: element.id,
            className: element.getAttribute('class') ?? '',
            text: element.textContent?.trim().replace(/\s+/g, ' ').slice(0, 120) ?? '',
            left: rect.left,
            right: rect.right,
            width: rect.width,
            clientWidth: element.clientWidth,
            offsetWidth: element.offsetWidth,
            scrollWidth: element.scrollWidth,
            overflowX: style.overflowX,
            transform: style.transform,
            translate: style.translate,
            before: describePseudo(element, '::before'),
            after: describePseudo(element, '::after'),
          }
        })
        const overflowingElements = candidates
          .filter(({ left, right, width }) =>
            width > 0 && (left < -1 || right > innerWidth + 1),
          )
          .map(({ tag, id, className, text, left, right, width }) => ({
            tag,
            id,
            className,
            text,
            left,
            right,
            width,
          }))
          .slice(0, 30)
        const effectElements = candidates
          .filter(
            ({
              left,
              right,
              clientWidth,
              scrollWidth,
              transform,
              translate,
              before,
              after,
            }) =>
              left < -1 ||
              right > innerWidth + 1 ||
              scrollWidth > clientWidth + 1 ||
              transform !== 'none' ||
              translate !== 'none' ||
              Boolean(before) ||
              Boolean(after),
          )
          .sort((first, second) => {
            const propagationScore = (candidate: (typeof candidates)[number]) =>
              Math.max(0, candidate.scrollWidth - candidate.clientWidth) * 100 +
              (candidate.overflowX === 'visible' ? 10_000 : 0)
            return (
              propagationScore(second) - propagationScore(first) ||
              second.right - first.right
            )
          })
          .map(
            ({
              tag,
              id,
              className,
              text,
              left,
              right,
              clientWidth,
              offsetWidth,
              scrollWidth,
              overflowX,
              transform,
              translate,
              before,
              after,
            }) => ({
              tag,
              id,
              className,
              text,
              left,
              right,
              clientWidth,
              offsetWidth,
              scrollWidth,
              overflowX,
              transform,
              translate,
              before,
              after,
            }),
          )
          .slice(0, 100)
        const documentWidths = {
          htmlClient: html.clientWidth,
          htmlOffset: html.offsetWidth,
          htmlScroll: html.scrollWidth,
          bodyClient: body.clientWidth,
          bodyOffset: body.offsetWidth,
          bodyScroll: body.scrollWidth,
        }
        return {
          innerWidth,
          scrollWidth: Math.max(documentWidths.htmlScroll, documentWidths.bodyScroll),
          documentHeight: Math.max(
            html.scrollHeight,
            html.offsetHeight,
            body.scrollHeight,
            body.offsetHeight,
          ),
          devicePixelRatio: window.devicePixelRatio,
          scrollX: window.scrollX,
          documentWidths,
          overflowingElements,
          effectElements,
        }
      }

      let snapshot = measure()
      let settleAttempts = 0
      while (snapshot.scrollWidth > snapshot.innerWidth && settleAttempts < 4) {
        const scrollY = window.scrollY
        document.documentElement.scrollLeft = 0
        document.body.scrollLeft = 0
        window.scrollTo(0, scrollY)
        void document.documentElement.offsetWidth
        await new Promise<void>((resolve) => {
          requestAnimationFrame(() => requestAnimationFrame(() => resolve()))
        })
        snapshot = measure()
        settleAttempts += 1
      }
      return { ...snapshot, settleAttempts }
    })
    expect(documentSize.innerWidth).toBe(scenario.width)
    expect.soft(
      documentSize.scrollWidth,
      `${scenario.width}px at ${scenario.rootTextPercent}% text must not scroll horizontally. Offenders: ${documentSize.overflowingElements
        .slice(0, 5)
        .map(({ tag, id, className }) => `${tag}${id ? `#${id}` : ''}.${className}`)
        .join(', ')}. Diagnostics: ${JSON.stringify({
        scrollX: documentSize.scrollX,
        settleAttempts: documentSize.settleAttempts,
        documentWidths: documentSize.documentWidths,
        effects: documentSize.effectElements.slice(0, 10),
      })}`,
    ).toBeLessThanOrEqual(documentSize.innerWidth)

    const boxes: Array<{
      label: string
      x: number
      y: number
      width: number
      height: number
    }> = []
    const boundedElements = [
      ...Array.from({ length: await cardSurfaces.count() }, (_, index) => ({
        label: `card-${index + 1}`,
        locator: cardSurfaces.nth(index),
      })),
      {
        label: 'face-control',
        locator: doubleFacedItem.getByRole('button'),
      },
    ]

    for (const bounded of boundedElements) {
      const viewportHeight = page.viewportSize()?.height ?? 844
      await expect
        .poll(
          async () => {
            await bounded.locator.evaluate((element) =>
              element.scrollIntoView({ block: 'center', inline: 'center' }),
            )
            await page.evaluate(
              () =>
                new Promise<void>((resolve) => {
                  requestAnimationFrame(() => requestAnimationFrame(() => resolve()))
                }),
            )
            const candidate = await bounded.locator.boundingBox()
            return Boolean(
              candidate && candidate.y < viewportHeight && candidate.y + candidate.height > 0,
            )
          },
          {
            message: `${bounded.label} must become reachable after scrolling.`,
            timeout: 3_000,
          },
        )
        .toBe(true)
      await expect(bounded.locator).toBeVisible()
      const box = await bounded.locator.boundingBox()
      expect(box, `${bounded.label} must have a rendered bounding box.`).not.toBeNull()
      if (!box) continue
      boxes.push({ label: bounded.label, ...box })
      const viewport = page.viewportSize()
      expect.soft(box.x, `${bounded.label} must start inside the viewport.`).toBeGreaterThanOrEqual(0)
      expect
        .soft(
          box.x + box.width,
          `${bounded.label} must end inside the viewport.`,
        )
        .toBeLessThanOrEqual((viewport?.width ?? scenario.width) + 1)
      const mustFitVertically =
        scenario.rootTextPercent === 100 || bounded.label === 'face-control'
      if (mustFitVertically) {
        expect
          .soft(box.y, `${bounded.label} must be scrolled into view.`)
          .toBeGreaterThanOrEqual(0)
        expect
          .soft(
            box.y + box.height,
            `${bounded.label} must fit in the visible viewport.`,
          )
          .toBeLessThanOrEqual(viewportHeight + 1)
      } else {
        expect
          .soft(box.y, `${bounded.label} must intersect the visible viewport.`)
          .toBeLessThan(viewportHeight)
        expect
          .soft(
            box.y + box.height,
            `${bounded.label} must remain reachable by normal page scrolling.`,
          )
          .toBeGreaterThan(0)
      }
    }

    await expect(doubleFacedItem.locator('[data-card-face]')).toHaveAttribute(
      'data-card-face',
      'front',
    )
    await doubleFacedItem.getByRole('button').click()
    await expect(doubleFacedItem.locator('[data-card-face]')).toHaveAttribute(
      'data-card-face',
      'back',
    )
    await doubleFacedItem.getByRole('button').click()
    await expect(doubleFacedItem.locator('[data-card-face]')).toHaveAttribute(
      'data-card-face',
      'front',
    )

    const isWebKit = testInfo.project.name.includes('webkit')
    const exceedsWebKitScreenshotLimit =
      isWebKit &&
      documentSize.documentHeight * documentSize.devicePixelRatio >
        webkitScreenshotPixelLimit
    const screenshotMode = exceedsWebKitScreenshotLimit
      ? 'viewport'
      : 'full-page'
    measurements.push({
      ...scenario,
      ...documentSize,
      boxes,
      screenshotMode,
    })
    await testInfo.attach(
      `${testInfo.project.name}-${scenario.width}px-${scenario.rootTextPercent}pct-text-${screenshotMode}`,
      {
        body: await page.screenshot({
          fullPage: screenshotMode === 'full-page',
          animations: 'disabled',
        }),
        contentType: 'image/png',
      },
    )
  }

  await testInfo.attach(`${testInfo.project.name}-responsive-measurements`, {
    body: Buffer.from(JSON.stringify(measurements, null, 2)),
    contentType: 'application/json',
  })
  expect(upstream.scryfallRequests).toHaveLength(4)
  expect(upstream.remainingScryfallResponses()).toBe(0)
  expectIsolated(upstream)
})
