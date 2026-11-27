import { describe, it, expect } from 'vitest'
import {
  createErrorContext,
  addBreadcrumb,
  mergeErrorContexts,
  type ErrorContext,
} from '../../lib/errorContext'

describe('ErrorContext - Structured error metadata', () => {
  it('creates context with all fields', () => {
    const ctx = createErrorContext({
      requestId: 'req-123',
      sourceId: 'https://api.example.com/card',
      metadata: { status: 500, url: 'https://api.example.com' },
      operation: 'fetchCard',
    })

    expect(ctx.requestId).toBe('req-123')
    expect(ctx.sourceId).toBe('https://api.example.com/card')
    expect(ctx.metadata.status).toBe(500)
    expect(ctx.operation).toBe('fetchCard')
    expect(ctx.timestamp).toBeDefined()
    expect(ctx.breadcrumbs).toEqual([])
  })

  it('handles undefined metadata gracefully', () => {
    const ctx = createErrorContext({
      requestId: 'req-456',
    })

    expect(ctx.metadata).toEqual({})
    expect(ctx.sourceId).toBeUndefined()
    expect(ctx.timestamp).toBeDefined()
  })

  it('preserves provided timestamp', () => {
    const customTime = 1234567890000
    const ctx = createErrorContext({
      timestamp: customTime,
    })

    expect(ctx.timestamp).toBe(customTime)
  })

  it('adds breadcrumb to context', () => {
    let ctx = createErrorContext({ requestId: 'req-789' })

    ctx = addBreadcrumb(ctx, {
      operation: 'fetchCard',
      timestamp: 100,
      outcome: 'success',
    })

    expect(ctx.breadcrumbs).toHaveLength(1)
    expect(ctx.breadcrumbs?.[0].operation).toBe('fetchCard')
    expect(ctx.breadcrumbs?.[0].outcome).toBe('success')
  })

  it('limits breadcrumbs to 5 entries', () => {
    let ctx = createErrorContext()

    for (let i = 0; i < 7; i++) {
      ctx = addBreadcrumb(ctx, {
        operation: `op-${i}`,
        timestamp: i,
        outcome: 'success',
      })
    }

    expect(ctx.breadcrumbs).toHaveLength(5)
    expect(ctx.breadcrumbs?.[0].operation).toBe('op-2')
    expect(ctx.breadcrumbs?.[4].operation).toBe('op-6')
  })

  it('adds error breadcrumb with code', () => {
    let ctx = createErrorContext()

    ctx = addBreadcrumb(ctx, {
      operation: 'fetchEdhrec',
      timestamp: 500,
      outcome: 'error',
      errorCode: 'timeout',
    })

    expect(ctx.breadcrumbs?.[0].outcome).toBe('error')
    expect(ctx.breadcrumbs?.[0].errorCode).toBe('timeout')
  })

  it('merges contexts with override', () => {
    const ctx1 = createErrorContext({
      requestId: 'req-1',
      sourceId: 'src-1',
      metadata: { a: 1, b: 2 },
    })

    const merged = mergeErrorContexts(ctx1, {
      sourceId: 'src-2',
      metadata: { b: 20, c: 3 },
    })

    expect(merged.requestId).toBe('req-1')
    expect(merged.sourceId).toBe('src-2')
    expect(merged.metadata.a).toBe(1)
    expect(merged.metadata.b).toBe(20)
    expect(merged.metadata.c).toBe(3)
  })

  it('merges breadcrumbs from both contexts', () => {
    const ctx1 = createErrorContext({
      breadcrumbs: [
        { operation: 'op-1', timestamp: 1, outcome: 'success' },
      ],
    })

    const ctx2: Partial<ErrorContext> = {
      breadcrumbs: [
        { operation: 'op-2', timestamp: 2, outcome: 'success' },
      ],
    }

    const merged = mergeErrorContexts(ctx1, ctx2)

    expect(merged.breadcrumbs).toHaveLength(2)
    expect(merged.breadcrumbs?.[0].operation).toBe('op-1')
    expect(merged.breadcrumbs?.[1].operation).toBe('op-2')
  })

  it('handles HTTP-specific metadata', () => {
    const ctx = createErrorContext({
      statusCode: 404,
      headers: { 'content-type': 'application/json' },
      requestBody: { query: 'some query' },
      responseBody: { error: 'not found' },
    })

    expect(ctx.statusCode).toBe(404)
    expect(ctx.headers?.['content-type']).toBe('application/json')
    expect(ctx.requestBody).toEqual({ query: 'some query' })
    expect(ctx.responseBody).toEqual({ error: 'not found' })
  })
})
