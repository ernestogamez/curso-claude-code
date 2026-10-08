import { Database } from '@config/database.js'
import type { IEmployeeRepository } from '@employee/domain/IEmployeeRepository.js'
import { Employee } from '@employee/domain/Employee.js'

const SELECT_COLUMNS = 'id, first_name as firstName, last_name as lastName, email, phone, password_hash as passwordHash, role, restaurant_id as restaurantId'

export class SqliteEmployeeRepository implements IEmployeeRepository {
    constructor(private db: Database) {}

    async findById(id: string): Promise<Employee | null> {
        const row = await this.db.get<any>(
            `SELECT ${SELECT_COLUMNS} FROM employees WHERE id = ?`,
            [id]
        )
        if (!row) return null
        return this.mapToDomain(row)
    }

    async findByEmail(email: string): Promise<Employee | null> {
        const row = await this.db.get<any>(
            `SELECT ${SELECT_COLUMNS} FROM employees WHERE email = ?`,
            [email]
        )
        if (!row) return null
        return this.mapToDomain(row)
    }

    async findByPhone(phone: string): Promise<Employee | null> {
        const row = await this.db.get<any>(
            `SELECT ${SELECT_COLUMNS} FROM employees WHERE phone = ?`,
            [phone]
        )
        if (!row) return null
        return this.mapToDomain(row)
    }

    async findAll(limit: number = 10, offset: number = 0, role?: string): Promise<Employee[]> {
        let query = `SELECT ${SELECT_COLUMNS} FROM employees`
        const params: any[] = []

        if (role) {
            query += ' WHERE role = ?'
            params.push(role)
        }

        query += ' LIMIT ? OFFSET ?'
        params.push(limit, offset)

        const rows = await this.db.all<any>(query, params)
        return rows.map(row => this.mapToDomain(row))
    }

    async save(employee: Employee): Promise<void> {
        const existing = await this.findById(employee.id)
        if (existing) {
            await this.db.run(
                'UPDATE employees SET first_name = ?, last_name = ?, email = ?, phone = ?, password_hash = ?, role = ?, restaurant_id = ? WHERE id = ?',
                [employee.firstName, employee.lastName, employee.email, employee.phone, employee.passwordHash, employee.role, employee.restaurantId, employee.id]
            )
        } else {
            await this.db.run(
                'INSERT INTO employees (id, first_name, last_name, email, phone, password_hash, role, restaurant_id) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
                [employee.id, employee.firstName, employee.lastName, employee.email, employee.phone, employee.passwordHash, employee.role, employee.restaurantId]
            )
        }
    }

    async findByRestaurant(restaurantId: string): Promise<Employee[]> {
        const rows = await this.db.all<any>(
            `SELECT ${SELECT_COLUMNS} FROM employees WHERE restaurant_id = ?`,
            [restaurantId]
        )
        return rows.map(row => this.mapToDomain(row))
    }

    async delete(id: string): Promise<void> {
        await this.db.run('DELETE FROM employees WHERE id = ?', [id])
    }

    private mapToDomain(row: any): Employee {
        return Employee.create({
            id: row.id,
            firstName: row.firstName,
            lastName: row.lastName,
            email: row.email,
            phone: row.phone ?? null,
            passwordHash: row.passwordHash,
            role: row.role,
            restaurantId: row.restaurantId ?? null
        })
    }
}
