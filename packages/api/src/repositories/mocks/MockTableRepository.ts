import type { TableRepository, TableFilters } from '@repositories/table.repository.js'
import type { Table } from '@models/table.model.js'

export class MockTableRepository implements TableRepository {
    private tables: Map<string, Table> = new Map()

    async findById(id: string): Promise<Table | null> {
        return this.tables.get(id) || null
    }

    async findByRestaurant(restaurantId: string, filters: TableFilters = {}): Promise<Table[]> {
        return Array.from(this.tables.values())
            .filter(t => t.restaurantId === restaurantId)
            .filter(t => filters.status === undefined || t.status === filters.status)
            .filter(t => filters.minCapacity === undefined || t.capacity >= filters.minCapacity)
            .sort((a, b) => a.number - b.number)
    }

    async save(table: Table): Promise<void> {
        this.tables.set(table.id, { ...table })
    }

    async delete(id: string): Promise<void> {
        this.tables.delete(id)
    }

    async occupyIfFree(id: string): Promise<boolean> {
        const table = this.tables.get(id)
        if (!table || table.status !== 'libre') return false
        this.tables.set(id, { ...table, status: 'ocupada' })
        return true
    }
}
