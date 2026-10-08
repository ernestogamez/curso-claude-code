import { describe, it, expect } from 'vitest'
import { normalizeTableStatus } from './table.model.js'
import { InvalidTableStatusError } from '@errors/DomainErrors.js'

describe('normalizeTableStatus', () => {
    it.each(['libre', 'ocupada', 'reservada'])('should accept %s', (status) => {
        expect(normalizeTableStatus(status)).toBe(status)
    })

    it('should trim and lowercase the value', () => {
        expect(normalizeTableStatus('  LIBRE ')).toBe('libre')
    })

    it('should throw InvalidTableStatusError for unknown values', () => {
        expect(() => normalizeTableStatus('roto')).toThrow(InvalidTableStatusError)
    })

    it('should throw InvalidTableStatusError for empty or non-string values', () => {
        expect(() => normalizeTableStatus('')).toThrow(InvalidTableStatusError)
        expect(() => normalizeTableStatus(undefined as unknown as string)).toThrow(InvalidTableStatusError)
    })
})
