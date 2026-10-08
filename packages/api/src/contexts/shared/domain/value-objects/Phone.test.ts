import { Phone } from '@shared/domain/value-objects/Phone.js'
import { InvalidPhoneError } from '@errors/DomainErrors.js'
import { describe, it, expect } from 'vitest'

describe('Phone Value Object', () => {
    it('should create a valid phone', () => {
        expect(new Phone('612345678').getValue()).toBe('612345678')
    })

    it('should accept a leading plus', () => {
        expect(new Phone('+34612345678').getValue()).toBe('+34612345678')
    })

    it('should strip spaces', () => {
        expect(new Phone('+34 612 345 678').getValue()).toBe('+34612345678')
    })

    it('should throw InvalidPhoneError for letters', () => {
        expect(() => new Phone('61234abcd')).toThrow(InvalidPhoneError)
    })

    it('should throw InvalidPhoneError when too short', () => {
        expect(() => new Phone('12345678')).toThrow(InvalidPhoneError)
    })

    it('should throw InvalidPhoneError when too long', () => {
        expect(() => new Phone('1234567890123456')).toThrow(InvalidPhoneError)
    })

    it('should throw InvalidPhoneError for empty value', () => {
        expect(() => new Phone('')).toThrow(InvalidPhoneError)
    })
})
