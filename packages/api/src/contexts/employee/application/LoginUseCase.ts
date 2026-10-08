import type { IEmployeeRepository } from '@employee/domain/IEmployeeRepository.js'
import type { IAuthService } from '@employee/domain/IAuthService.js'
import type { Employee } from '@employee/domain/Employee.js'
import { Phone } from '@shared/domain/value-objects/Phone.js'
import { InvalidCredentialsError, InvalidPhoneError } from '@errors/DomainErrors.js'

export interface LoginDTO {
    email?: string
    phone?: string
    passwordRaw: string
}

export interface LoginResponse {
    token: string
    employee: {
        id: string
        firstName: string
        lastName: string
        email: string
        phone: string | null
        role: string
        restaurantId: string | null
    }
}

export class LoginUseCase {
    constructor(
        private employeeRepository: IEmployeeRepository,
        private authService: IAuthService
    ) {}

    async execute(dto: LoginDTO): Promise<LoginResponse> {
        const employee = await this.findEmployee(dto)

        if (!employee) {
            throw new InvalidCredentialsError()
        }

        const isValid = await this.authService.comparePasswords(dto.passwordRaw, employee.passwordHash)
        if (!isValid) {
            throw new InvalidCredentialsError()
        }

        const token = this.authService.generateToken({
            id: employee.id,
            role: employee.role,
            restaurantId: employee.restaurantId
        })

        return {
            token,
            employee: {
                id: employee.id,
                firstName: employee.firstName,
                lastName: employee.lastName,
                email: employee.email,
                phone: employee.phone,
                role: employee.role,
                restaurantId: employee.restaurantId
            }
        }
    }

    private async findEmployee(dto: LoginDTO): Promise<Employee | null> {
        if (dto.phone) {
            try {
                return await this.employeeRepository.findByPhone(new Phone(dto.phone).getValue())
            } catch (error) {
                if (error instanceof InvalidPhoneError) return null
                throw error
            }
        }
        if (dto.email) {
            return this.employeeRepository.findByEmail(dto.email)
        }
        return null
    }
}
