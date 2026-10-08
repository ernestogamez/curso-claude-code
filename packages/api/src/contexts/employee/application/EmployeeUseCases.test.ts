import { MockEmployeeRepository, MockAuthService } from '@employee/application/mocks/MockDependencies.js'
import { CreateEmployeeUseCase } from '@employee/application/CreateEmployeeUseCase.js'
import { LoginUseCase } from '@employee/application/LoginUseCase.js'
import { Employee } from '@employee/domain/Employee.js'
import { InvalidPhoneError } from '@errors/DomainErrors.js'
import { describe, it, expect, beforeEach } from 'vitest'

describe('Employee Application Use Cases', () => {
    let employeeRepo: MockEmployeeRepository
    let authService: MockAuthService
    let createEmployeeUseCase: CreateEmployeeUseCase
    let loginUseCase: LoginUseCase

    beforeEach(() => {
        employeeRepo = new MockEmployeeRepository()
        authService = new MockAuthService()
        createEmployeeUseCase = new CreateEmployeeUseCase(employeeRepo, authService)
        loginUseCase = new LoginUseCase(employeeRepo, authService)
    })

    describe('CreateEmployeeUseCase', () => {
        it('should create and save a new employee', async () => {
            const dto = {
                firstName: 'Alice',
                lastName: 'Smith',
                email: 'alice@resttek.com',
                passwordPlain: 'securepassword123',
                role: 'cocinero',
                restaurantId: 'r1'
            }

            const result = await createEmployeeUseCase.execute(dto)

            expect(result.id).toBeDefined()
            expect(result.email).toBe('alice@resttek.com')
            expect(result.passwordHash).toBe('hashed_securepassword123')
            expect(result.role).toBe('cocinero')
            expect(result.restaurantId).toBe('r1')

            const saved = await employeeRepo.findByEmail('alice@resttek.com')
            expect(saved).not.toBeNull()
        })

        it('should throw DuplicatedEmailError if email already exists', async () => {
            await createEmployeeUseCase.execute({
                firstName: 'Alice',
                lastName: 'Smith',
                email: 'alice@resttek.com',
                passwordPlain: 'pass',
                role: 'manager',
                restaurantId: 'r1'
            })

            await expect(createEmployeeUseCase.execute({
                firstName: 'Bob',
                lastName: 'Jones',
                email: 'alice@resttek.com',
                passwordPlain: 'pass2',
                role: 'camarero',
                restaurantId: 'r1'
            })).rejects.toThrow('Email is already in use')
        })

        it('should save a normalized phone when provided', async () => {
            const result = await createEmployeeUseCase.execute({
                firstName: 'Alice',
                lastName: 'Smith',
                email: 'alice@resttek.com',
                phone: '+34 612 345 678',
                passwordPlain: 'pass',
                role: 'cocinero',
                restaurantId: 'r1'
            })

            expect(result.phone).toBe('+34612345678')
            expect(await employeeRepo.findByPhone('+34612345678')).not.toBeNull()
        })

        it('should create an employee without phone', async () => {
            const result = await createEmployeeUseCase.execute({
                firstName: 'Alice',
                lastName: 'Smith',
                email: 'alice@resttek.com',
                passwordPlain: 'pass',
                role: 'cocinero',
                restaurantId: 'r1'
            })

            expect(result.phone).toBeNull()
        })

        it('should throw DuplicatedPhoneError if phone already exists', async () => {
            await createEmployeeUseCase.execute({
                firstName: 'Alice',
                lastName: 'Smith',
                email: 'alice@resttek.com',
                phone: '612345678',
                passwordPlain: 'pass',
                role: 'manager',
                restaurantId: 'r1'
            })

            await expect(createEmployeeUseCase.execute({
                firstName: 'Bob',
                lastName: 'Jones',
                email: 'bob@resttek.com',
                phone: '612 345 678',
                passwordPlain: 'pass2',
                role: 'camarero',
                restaurantId: 'r1'
            })).rejects.toThrow('Phone is already in use')
        })

        it('should throw InvalidPhoneError for an invalid phone', async () => {
            await expect(createEmployeeUseCase.execute({
                firstName: 'Alice',
                lastName: 'Smith',
                email: 'alice@resttek.com',
                phone: 'abc',
                passwordPlain: 'pass',
                role: 'cocinero',
                restaurantId: 'r1'
            })).rejects.toThrow(InvalidPhoneError)
        })
    })

    describe('LoginUseCase', () => {
        it('should return token for valid credentials', async () => {
            const employee = Employee.create({
                id: '123',
                firstName: 'Admin',
                lastName: 'User',
                email: 'admin@resttek.com',
                passwordHash: 'hashed_password123',
                role: 'admin',
                restaurantId: null
            })
            await employeeRepo.save(employee)

            const result = await loginUseCase.execute({
                email: 'admin@resttek.com',
                passwordRaw: 'password123'
            })

            expect(result.token).toBe('fake-jwt-token-for-123')
            expect(result.employee.role).toBe('admin')
        })

        it('should throw InvalidCredentialsError for non-existent email', async () => {
            await expect(loginUseCase.execute({
                email: 'nobody@resttek.com',
                passwordRaw: 'password123'
            })).rejects.toThrow('Invalid credentials')
        })

        it('should throw InvalidCredentialsError for wrong password', async () => {
            const employee = Employee.create({
                id: '123',
                firstName: 'Admin',
                lastName: 'User',
                email: 'admin@resttek.com',
                passwordHash: 'hashed_password123',
                role: 'admin',
                restaurantId: null
            })
            await employeeRepo.save(employee)

            await expect(loginUseCase.execute({
                email: 'admin@resttek.com',
                passwordRaw: 'wrongpassword'
            })).rejects.toThrow('Invalid credentials')
        })

        describe('with phone', () => {
            beforeEach(async () => {
                await employeeRepo.save(Employee.create({
                    id: '456',
                    firstName: 'Phone',
                    lastName: 'User',
                    email: 'phone@resttek.com',
                    phone: '+34612345678',
                    passwordHash: 'hashed_password123',
                    role: 'camarero',
                    restaurantId: 'r1'
                }))
            })

            it('should return token and phone for valid phone and password', async () => {
                const result = await loginUseCase.execute({
                    phone: '+34612345678',
                    passwordRaw: 'password123'
                })

                expect(result.token).toBe('fake-jwt-token-for-456')
                expect(result.employee.phone).toBe('+34612345678')
                expect(result.employee.email).toBe('phone@resttek.com')
            })

            it('should normalize spaces in the provided phone', async () => {
                const result = await loginUseCase.execute({
                    phone: '+34 612 345 678',
                    passwordRaw: 'password123'
                })

                expect(result.employee.id).toBe('456')
            })

            it('should still allow login by email for an account with phone', async () => {
                const result = await loginUseCase.execute({
                    email: 'phone@resttek.com',
                    passwordRaw: 'password123'
                })

                expect(result.employee.id).toBe('456')
            })

            it('should return null phone for an account without phone', async () => {
                await employeeRepo.save(Employee.create({
                    id: '789',
                    firstName: 'No',
                    lastName: 'Phone',
                    email: 'nophone@resttek.com',
                    passwordHash: 'hashed_password123',
                    role: 'camarero',
                    restaurantId: 'r1'
                }))

                const result = await loginUseCase.execute({
                    email: 'nophone@resttek.com',
                    passwordRaw: 'password123'
                })

                expect(result.employee.phone).toBeNull()
            })

            it('should throw InvalidCredentialsError for unknown phone', async () => {
                await expect(loginUseCase.execute({
                    phone: '699999999',
                    passwordRaw: 'password123'
                })).rejects.toThrow('Invalid credentials')
            })

            it('should throw InvalidCredentialsError for wrong password', async () => {
                await expect(loginUseCase.execute({
                    phone: '+34612345678',
                    passwordRaw: 'wrongpassword'
                })).rejects.toThrow('Invalid credentials')
            })

            it('should throw InvalidCredentialsError for a malformed phone', async () => {
                await expect(loginUseCase.execute({
                    phone: 'not-a-phone',
                    passwordRaw: 'password123'
                })).rejects.toThrow('Invalid credentials')
            })

            it('should throw InvalidCredentialsError when neither email nor phone is given', async () => {
                await expect(loginUseCase.execute({
                    passwordRaw: 'password123'
                })).rejects.toThrow('Invalid credentials')
            })
        })
    })
})
