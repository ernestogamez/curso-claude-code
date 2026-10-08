import { randomUUID } from 'crypto'
import type { Table } from '@models/table.model.js'
import { normalizeTableStatus } from '@models/table.model.js'
import type { TableRepository, TableFilters } from '@repositories/table.repository.js'
import {
    TableNotFoundError,
    TableNumberRequiredError,
    DuplicateTableNumberError,
    InvalidTableCapacityError,
    TableNotAvailableError,
    RestaurantIdRequiredError
} from '@errors/DomainErrors.js'

export interface CreateTableDTO {
    number: number
    description: string
    capacity: number
    status?: string
    restaurantId: string
}

export interface UpdateTableDTO {
    number: number
    description: string
    capacity: number
    status: string
}

export interface TableListFilters {
    status?: string
    minCapacity?: string | number
}

export class TableService {
    constructor(private readonly tableRepository: TableRepository) {}

    async create(dto: CreateTableDTO): Promise<Table> {
        const now = new Date().toISOString()
        const table = this.buildTable({
            id: randomUUID(),
            number: dto.number,
            description: dto.description,
            capacity: dto.capacity,
            status: dto.status ?? 'libre',
            restaurantId: dto.restaurantId,
            createdAt: now,
            updatedAt: now
        })

        await this.assertNumberAvailable(table.restaurantId, table.number)
        await this.tableRepository.save(table)
        return table
    }

    async update(id: string, dto: UpdateTableDTO): Promise<Table> {
        const existing = await this.getById(id)

        const updated = this.buildTable({
            id: existing.id,
            number: dto.number,
            description: dto.description,
            capacity: dto.capacity,
            status: dto.status,
            restaurantId: existing.restaurantId,
            createdAt: existing.createdAt,
            updatedAt: new Date().toISOString()
        })

        await this.assertNumberAvailable(updated.restaurantId, updated.number, updated.id)
        await this.tableRepository.save(updated)
        return updated
    }

    async list(restaurantId: string, filters: TableListFilters = {}): Promise<Table[]> {
        const repositoryFilters: TableFilters = {}
        if (filters.status !== undefined) {
            repositoryFilters.status = normalizeTableStatus(filters.status)
        }
        if (filters.minCapacity !== undefined) {
            const minCapacity = Number(filters.minCapacity)
            if (!Number.isInteger(minCapacity) || minCapacity < 1) {
                throw new InvalidTableCapacityError('minCapacity must be an integer greater than or equal to 1')
            }
            repositoryFilters.minCapacity = minCapacity
        }
        return this.tableRepository.findByRestaurant(restaurantId, repositoryFilters)
    }

    async changeStatus(id: string, status: string): Promise<Table> {
        const existing = await this.getById(id)
        const updated: Table = {
            ...existing,
            status: normalizeTableStatus(status),
            updatedAt: new Date().toISOString()
        }
        await this.tableRepository.save(updated)
        return updated
    }

    async occupy(id: string, partySize: number): Promise<Table> {
        const table = await this.getById(id)

        if (!Number.isInteger(partySize) || partySize < 1) {
            throw new InvalidTableCapacityError('Party size must be an integer greater than or equal to 1')
        }
        if (partySize > table.capacity) {
            throw new InvalidTableCapacityError(`Party size ${partySize} exceeds table capacity ${table.capacity}`)
        }

        const occupied = await this.tableRepository.occupyIfFree(id)
        if (!occupied) {
            throw new TableNotAvailableError()
        }
        return this.getById(id)
    }

    async delete(id: string): Promise<void> {
        await this.getById(id)
        await this.tableRepository.delete(id)
    }

    async getById(id: string): Promise<Table> {
        const table = await this.tableRepository.findById(id)
        if (!table) {
            throw new TableNotFoundError()
        }
        return table
    }

    private async assertNumberAvailable(restaurantId: string, number: number, ownId?: string): Promise<void> {
        const tables = await this.tableRepository.findByRestaurant(restaurantId)
        if (tables.some(t => t.number === number && t.id !== ownId)) {
            throw new DuplicateTableNumberError()
        }
    }

    private buildTable(props: Omit<Table, 'status'> & { status: string }): Table {
        if (!props.restaurantId || typeof props.restaurantId !== 'string' || props.restaurantId.trim() === '') {
            throw new RestaurantIdRequiredError()
        }
        if (!Number.isInteger(props.number) || props.number < 1) {
            throw new TableNumberRequiredError()
        }
        if (!Number.isInteger(props.capacity) || props.capacity < 1) {
            throw new InvalidTableCapacityError()
        }

        return {
            ...props,
            description: typeof props.description === 'string' ? props.description.trim() : '',
            status: normalizeTableStatus(props.status)
        }
    }
}
