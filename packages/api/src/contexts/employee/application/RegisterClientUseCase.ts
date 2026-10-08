import { randomUUID } from 'crypto'
import { Employee } from '@employee/domain/Employee.js'
import type { IEmployeeRepository } from '@employee/domain/IEmployeeRepository.js'
import type { IAuthService } from '@employee/domain/IAuthService.js'
import { Phone } from '@shared/domain/value-objects/Phone.js'
import { DuplicatedEmailError, DuplicatedPhoneError } from '@errors/DomainErrors.js'

export interface RegisterClientDTO {
    firstName: string
    lastName: string
    email: string
    phone?: string | null
    password: string
}

export interface RegisterClientResponse {
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

export class RegisterClientUseCase {
    constructor(
        private readonly employeeRepo: IEmployeeRepository,
        private readonly authService: IAuthService
    ) {}

    async execute(dto: RegisterClientDTO): Promise<RegisterClientResponse> {
        const existingEmployee = await this.employeeRepo.findByEmail(dto.email)
        if (existingEmployee) {
            throw new DuplicatedEmailError()
        }

        let phone: string | null = null
        if (dto.phone) {
            phone = new Phone(dto.phone).getValue()
            if (await this.employeeRepo.findByPhone(phone)) {
                throw new DuplicatedPhoneError()
            }
        }

        const passwordHash = await this.authService.hashPassword(dto.password)

        const employee = Employee.create({
            id: randomUUID(),
            firstName: dto.firstName,
            lastName: dto.lastName,
            email: dto.email,
            phone,
            passwordHash,
            role: 'cliente',
            restaurantId: null
        })

        await this.employeeRepo.save(employee)

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
}
