import { describe, it, expect, vi } from 'vitest'
import type { Request, Response } from 'express'
import { errorHandler } from './errorHandler.js'
import {
    TableNotFoundError,
    TableNotAvailableError,
    InvalidTableCapacityError,
    DuplicateTableNumberError
} from '@errors/DomainErrors.js'

function run(error: unknown) {
    const json = vi.fn()
    const status = vi.fn().mockReturnValue({ json })
    errorHandler(error, {} as Request, { status } as unknown as Response, vi.fn())
    return { status, json }
}

describe('errorHandler (table errors)', () => {
    it('should map TableNotFoundError to 404', () => {
        const { status, json } = run(new TableNotFoundError())
        expect(status).toHaveBeenCalledWith(404)
        expect(json).toHaveBeenCalledWith({ error: 'TableNotFoundError', message: 'Table not found' })
    })

    it('should map TableNotAvailableError to 409', () => {
        const { status, json } = run(new TableNotAvailableError())
        expect(status).toHaveBeenCalledWith(409)
        expect(json).toHaveBeenCalledWith({ error: 'TableNotAvailableError', message: 'Table is not available' })
    })

    it.each([new InvalidTableCapacityError(), new DuplicateTableNumberError()])('should map %s to 400', (error) => {
        const { status } = run(error)
        expect(status).toHaveBeenCalledWith(400)
    })
})
