import { InvalidPhoneError } from '@errors/DomainErrors.js'

export class Phone {
    private readonly value: string

    constructor(value: string) {
        const normalized = typeof value === 'string' ? value.replace(/\s+/g, '') : ''
        if (!this.isValid(normalized)) {
            throw new InvalidPhoneError()
        }
        this.value = normalized
    }

    private isValid(phone: string): boolean {
        return /^\+?\d{9,15}$/.test(phone)
    }

    public getValue(): string {
        return this.value
    }
}
