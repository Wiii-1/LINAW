const { describe, it, expect, vi } = require('vitest')

vi.mock('../../config/firebase-config', () => {
  return {
    auth: {
      verifyIdToken: vi.fn(),
    },
  }
})

const { auth } = require('../../../../config/firebase-config')
const authenticate = require('../../../../middleware/authenticate')
const AppError = require('../../../../utils/AppError')

describe('authenticate.decodeToken', () => {
  it('calls next with AppError when uid missing', async () => {
    const req = { headers: { authorization: 'Bearer tok' } }
    const res = {}
    const next = vi.fn()

    auth.verifyIdToken.mockResolvedValue({ email: 'a@b.com' })

    await authenticate.decodeToken(req, res, next)

    expect(next).toHaveBeenCalled()
    const err = next.mock.calls[0][0]
    expect(err).toBeInstanceOf(AppError)
    expect(err.statusCode).toBe(401)
    expect(err.code).toBe('INVALID_TOKEN')
    expect(err.message).toMatch(/uid/)
  })

  it('calls next with AppError when email missing', async () => {
    const req = { headers: { authorization: 'Bearer tok' } }
    const res = {}
    const next = vi.fn()

    auth.verifyIdToken.mockResolvedValue({ uid: 'u1' })

    await authenticate.decodeToken(req, res, next)

    expect(next).toHaveBeenCalled()
    const err = next.mock.calls[0][0]
    expect(err).toBeInstanceOf(AppError)
    expect(err.statusCode).toBe(401)
    expect(err.code).toBe('INVALID_TOKEN')
    expect(err.message).toMatch(/email/)
  })
})
