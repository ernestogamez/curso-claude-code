import { describe, it, expect, vi, beforeEach } from 'vitest'
import { RegisterClientUseCase } from '@employee/application/RegisterClientUseCase.js'
import type { IEmployeeRepository } from '@employee/domain/IEmployeeRepository.js'
import type { IAuthService } from '@employee/domain/IAuthService.js'
import { DuplicatedEmailError, DuplicatedPhoneError, InvalidPhoneError } from '@errors/DomainErrors.js'

describe('RegisterClientUseCase', () => {
    let mockEmployeeRepo: Partial<IEmployeeRepository>
    let mockAuthService: Partial<IAuthService>
    let useCase: RegisterClientUseCase

    beforeEach(() => {
        mockEmployeeRepo = {
            findByEmail: vi.fn(),
            findByPhone: vi.fn().mockResolvedValue(null),
            save: vi.fn()
        }
        mockAuthService = {
            hashPassword: vi.fn().mockResolvedValue('hashedPassword'),
            generateToken: vi.fn().mockReturnValue('mockToken')
        }
        useCase = new RegisterClientUseCase(
            mockEmployeeRepo as IEmployeeRepository,
            mockAuthService as IAuthService
        )
    })

    it('should register a new client and return token + employee data', async () => {
        vi.mocked(mockEmployeeRepo.findByEmail!).mockResolvedValue(null)

        const result = await useCase.execute({
            firstName: 'John',
            lastName: 'Doe',
            email: 'john@example.com',
            password: 'password123'
        })

        expect(result.token).toBe('mockToken')
        expect(result.employee).toMatchObject({
            firstName: 'John',
            lastName: 'Doe',
            email: 'john@example.com',
            role: 'cliente',
            restaurantId: null
        })
        expect(mockEmployeeRepo.save).toHaveBeenCalledOnce()
    })

    it('should throw DuplicatedEmailError when email already exists', async () => {
        vi.mocked(mockEmployeeRepo.findByEmail!).mockResolvedValue({
            id: 'existing-id',
            firstName: 'Existing',
            lastName: 'User',
            email: 'john@example.com',
            passwordHash: 'hash',
            role: 'cliente',
            restaurantId: null
        } as any)

        await expect(useCase.execute({
            firstName: 'John',
            lastName: 'Doe',
            email: 'john@example.com',
            password: 'password123'
        })).rejects.toThrow(DuplicatedEmailError)

        expect(mockEmployeeRepo.save).not.toHaveBeenCalled()
    })

    it('should register a client with a normalized phone', async () => {
        vi.mocked(mockEmployeeRepo.findByEmail!).mockResolvedValue(null)

        const result = await useCase.execute({
            firstName: 'John',
            lastName: 'Doe',
            email: 'john@example.com',
            phone: '+34 612 345 678',
            password: 'password123'
        })

        expect(result.employee.phone).toBe('+34612345678')
        expect(mockEmployeeRepo.findByPhone).toHaveBeenCalledWith('+34612345678')
    })

    it('should register a client without phone', async () => {
        vi.mocked(mockEmployeeRepo.findByEmail!).mockResolvedValue(null)

        const result = await useCase.execute({
            firstName: 'John',
            lastName: 'Doe',
            email: 'john@example.com',
            password: 'password123'
        })

        expect(result.employee.phone).toBeNull()
        expect(mockEmployeeRepo.findByPhone).not.toHaveBeenCalled()
    })

    it('should throw DuplicatedPhoneError when phone already exists', async () => {
        vi.mocked(mockEmployeeRepo.findByEmail!).mockResolvedValue(null)
        vi.mocked(mockEmployeeRepo.findByPhone!).mockResolvedValue({ id: 'existing-id' } as any)

        await expect(useCase.execute({
            firstName: 'John',
            lastName: 'Doe',
            email: 'john@example.com',
            phone: '612345678',
            password: 'password123'
        })).rejects.toThrow(DuplicatedPhoneError)

        expect(mockEmployeeRepo.save).not.toHaveBeenCalled()
    })

    it('should throw InvalidPhoneError for an invalid phone', async () => {
        vi.mocked(mockEmployeeRepo.findByEmail!).mockResolvedValue(null)

        await expect(useCase.execute({
            firstName: 'John',
            lastName: 'Doe',
            email: 'john@example.com',
            phone: 'abc',
            password: 'password123'
        })).rejects.toThrow(InvalidPhoneError)

        expect(mockEmployeeRepo.save).not.toHaveBeenCalled()
    })
})
