import { Database } from '@config/database.js'
import type { Table, TableStatusType } from '@models/table.model.js'
import { normalizeTableStatus } from '@models/table.model.js'

interface TableRow {
    id: string
    number: number
    description: string
    capacity: number
    status: string
    restaurantId: string
    createdAt: string
    updatedAt: string
}

export interface TableFilters {
    status?: TableStatusType
    minCapacity?: number
}

export interface TableRepository {
    findById(id: string): Promise<Table | null>
    findByRestaurant(restaurantId: string, filters?: TableFilters): Promise<Table[]>
    save(table: Table): Promise<void>
    delete(id: string): Promise<void>
    occupyIfFree(id: string): Promise<boolean>
}

const SELECT_COLUMNS = 'id, number, description, capacity, status, restaurant_id as restaurantId, created_at as createdAt, updated_at as updatedAt'

export class SqliteTableRepository implements TableRepository {
    constructor(private db: Database) {}

    async findById(id: string): Promise<Table | null> {
        const row = await this.db.get<TableRow>(
            `SELECT ${SELECT_COLUMNS} FROM tables WHERE id = ?`,
            [id]
        )
        if (!row) return null
        return this.mapToTable(row)
    }

    async findByRestaurant(restaurantId: string, filters: TableFilters = {}): Promise<Table[]> {
        const conditions = ['restaurant_id = ?']
        const params: (string | number)[] = [restaurantId]

        if (filters.status !== undefined) {
            conditions.push('status = ?')
            params.push(filters.status)
        }
        if (filters.minCapacity !== undefined) {
            conditions.push('capacity >= ?')
            params.push(filters.minCapacity)
        }

        const rows = await this.db.all<TableRow>(
            `SELECT ${SELECT_COLUMNS} FROM tables WHERE ${conditions.join(' AND ')} ORDER BY number ASC`,
            params
        )
        return rows.map(row => this.mapToTable(row))
    }

    async save(table: Table): Promise<void> {
        const existing = await this.findById(table.id)
        if (existing) {
            await this.db.run(
                'UPDATE tables SET number = ?, description = ?, capacity = ?, status = ?, updated_at = ? WHERE id = ?',
                [table.number, table.description, table.capacity, table.status, table.updatedAt, table.id]
            )
        } else {
            await this.db.run(
                'INSERT INTO tables (id, number, description, capacity, status, restaurant_id, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
                [table.id, table.number, table.description, table.capacity, table.status, table.restaurantId, table.createdAt, table.updatedAt]
            )
        }
    }

    async delete(id: string): Promise<void> {
        await this.db.run('DELETE FROM tables WHERE id = ?', [id])
    }

    async occupyIfFree(id: string): Promise<boolean> {
        const result = await this.db.run(
            "UPDATE tables SET status = 'ocupada', updated_at = ? WHERE id = ? AND status = 'libre'",
            [new Date().toISOString(), id]
        )
        return result.changes > 0
    }

    private mapToTable(row: TableRow): Table {
        return {
            id: row.id,
            number: row.number,
            description: row.description,
            capacity: row.capacity,
            status: normalizeTableStatus(row.status),
            restaurantId: row.restaurantId,
            createdAt: row.createdAt,
            updatedAt: row.updatedAt
        }
    }
}
