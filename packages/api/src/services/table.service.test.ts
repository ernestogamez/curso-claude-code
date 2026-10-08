import { describe, it, expect, beforeEach } from 'vitest'
import { TableService } from './table.service.js'
import { MockTableRepository } from '@repositories/mocks/MockTableRepository.js'
import {
    TableNotFoundError,
    TableNumberRequiredError,
    DuplicateTableNumberError,
    InvalidTableCapacityError,
    InvalidTableStatusError,
    TableNotAvailableError,
    RestaurantIdRequiredError
} from '@errors/DomainErrors.js'

describe('TableService', () => {
    let repo: MockTableRepository
    let service: TableService

    const validDto = { number: 1, description: 'Window', capacity: 4, restaurantId: 'r1' }

    beforeEach(() => {
        repo = new MockTableRepository()
        service = new TableService(repo)
    })

    describe('create', () => {
        it('should create a free table by default', async () => {
            const table = await service.create(validDto)

            expect(table).toMatchObject({ number: 1, description: 'Window', capacity: 4, status: 'libre', restaurantId: 'r1' })
            expect(table.id).toBeTruthy()
            expect(await repo.findById(table.id)).toEqual(table)
        })

        it('should accept an explicit status', async () => {
            const table = await service.create({ ...validDto, status: 'reservada' })
            expect(table.status).toBe('reservada')
        })

        it('should default description to an empty string', async () => {
            const table = await service.create({ ...validDto, description: undefined as unknown as string })
            expect(table.description).toBe('')
        })

        it.each([0, -1, 1.5, '2', null, undefined])('should reject invalid number %s', async (number) => {
            await expect(service.create({ ...validDto, number: number as number })).rejects.toThrow(TableNumberRequiredError)
        })

        it.each([0, -3, 2.5, '4', null, undefined])('should reject invalid capacity %s', async (capacity) => {
            await expect(service.create({ ...validDto, capacity: capacity as number })).rejects.toThrow(InvalidTableCapacityError)
        })

        it('should reject an invalid status', async () => {
            await expect(service.create({ ...validDto, status: 'rota' })).rejects.toThrow(InvalidTableStatusError)
        })

        it('should reject a missing restaurant id', async () => {
            await expect(service.create({ ...validDto, restaurantId: ' ' })).rejects.toThrow(RestaurantIdRequiredError)
        })

        it('should reject a duplicate number in the same restaurant', async () => {
            await service.create(validDto)
            await expect(service.create(validDto)).rejects.toThrow(DuplicateTableNumberError)
        })

        it('should allow the same number in another restaurant', async () => {
            await service.create(validDto)
            await expect(service.create({ ...validDto, restaurantId: 'r2' })).resolves.toBeTruthy()
        })
    })

    describe('update', () => {
        it('should update all editable fields and keep restaurant and createdAt', async () => {
            const created = await service.create(validDto)

            const updated = await service.update(created.id, { number: 5, description: 'Terrace', capacity: 6, status: 'ocupada' })

            expect(updated).toMatchObject({ id: created.id, number: 5, description: 'Terrace', capacity: 6, status: 'ocupada', restaurantId: 'r1', createdAt: created.createdAt })
            expect(await repo.findById(created.id)).toEqual(updated)
        })

        it('should allow keeping its own number', async () => {
            const created = await service.create(validDto)
            await expect(service.update(created.id, { number: 1, description: 'x', capacity: 2, status: 'libre' })).resolves.toBeTruthy()
        })

        it('should reject a number used by another table', async () => {
            await service.create(validDto)
            const other = await service.create({ ...validDto, number: 2 })

            await expect(service.update(other.id, { number: 1, description: 'x', capacity: 2, status: 'libre' }))
                .rejects.toThrow(DuplicateTableNumberError)
        })

        it('should throw TableNotFoundError when the table does not exist', async () => {
            await expect(service.update('missing', { number: 1, description: 'x', capacity: 2, status: 'libre' }))
                .rejects.toThrow(TableNotFoundError)
        })

        it('should validate capacity and status', async () => {
            const created = await service.create(validDto)
            await expect(service.update(created.id, { number: 1, description: 'x', capacity: 0, status: 'libre' })).rejects.toThrow(InvalidTableCapacityError)
            await expect(service.update(created.id, { number: 1, description: 'x', capacity: 2, status: 'zzz' })).rejects.toThrow(InvalidTableStatusError)
        })
    })

    describe('delete', () => {
        it('should delete an existing table', async () => {
            const created = await service.create(validDto)
            await service.delete(created.id)
            expect(await repo.findById(created.id)).toBeNull()
        })

        it('should throw TableNotFoundError when the table does not exist', async () => {
            await expect(service.delete('missing')).rejects.toThrow(TableNotFoundError)
        })
    })

    describe('getById', () => {
        it('should return the table', async () => {
            const created = await service.create(validDto)
            expect(await service.getById(created.id)).toEqual(created)
        })

        it('should throw TableNotFoundError when the table does not exist', async () => {
            await expect(service.getById('missing')).rejects.toThrow(TableNotFoundError)
        })
    })

    describe('list', () => {
        beforeEach(async () => {
            await service.create({ ...validDto, number: 2, capacity: 6 })
            await service.create({ ...validDto, number: 1, capacity: 2 })
            await service.create({ ...validDto, number: 3, capacity: 6, status: 'ocupada' })
            await service.create({ ...validDto, number: 1, restaurantId: 'r2' })
        })

        it('should list the restaurant tables ordered by number', async () => {
            const tables = await service.list('r1')
            expect(tables.map(t => t.number)).toEqual([1, 2, 3])
        })

        it('should filter by status', async () => {
            const tables = await service.list('r1', { status: 'ocupada' })
            expect(tables.map(t => t.number)).toEqual([3])
        })

        it('should filter by minCapacity', async () => {
            const tables = await service.list('r1', { minCapacity: '4' })
            expect(tables.map(t => t.number)).toEqual([2, 3])
        })

        it('should combine filters', async () => {
            const tables = await service.list('r1', { status: 'libre', minCapacity: '4' })
            expect(tables.map(t => t.number)).toEqual([2])
        })

        it('should throw InvalidTableStatusError for an unknown status filter', async () => {
            await expect(service.list('r1', { status: 'rota' })).rejects.toThrow(InvalidTableStatusError)
        })

        it.each(['abc', '0', '-2', '1.5'])('should throw InvalidTableCapacityError for minCapacity %s', async (minCapacity) => {
            await expect(service.list('r1', { minCapacity })).rejects.toThrow(InvalidTableCapacityError)
        })
    })

    describe('changeStatus', () => {
        it('should change only the status and refresh updatedAt', async () => {
            const created = await service.create(validDto)

            const updated = await service.changeStatus(created.id, 'Reservada')

            expect(updated).toMatchObject({ ...created, status: 'reservada' })
            expect((await repo.findById(created.id))?.status).toBe('reservada')
        })

        it('should reject an invalid status', async () => {
            const created = await service.create(validDto)
            await expect(service.changeStatus(created.id, 'rota')).rejects.toThrow(InvalidTableStatusError)
        })

        it('should throw TableNotFoundError when the table does not exist', async () => {
            await expect(service.changeStatus('missing', 'libre')).rejects.toThrow(TableNotFoundError)
        })
    })

    describe('occupy', () => {
        it('should occupy a free table that fits the party', async () => {
            const created = await service.create(validDto)

            const occupied = await service.occupy(created.id, 4)

            expect(occupied.status).toBe('ocupada')
            expect((await repo.findById(created.id))?.status).toBe('ocupada')
        })

        it('should throw TableNotFoundError when the table does not exist', async () => {
            await expect(service.occupy('missing', 2)).rejects.toThrow(TableNotFoundError)
        })

        it('should throw InvalidTableCapacityError when the party does not fit', async () => {
            const created = await service.create(validDto)
            await expect(service.occupy(created.id, 5)).rejects.toThrow(InvalidTableCapacityError)
            expect((await repo.findById(created.id))?.status).toBe('libre')
        })

        it.each([0, -1, 1.5, '2', null, undefined])('should reject invalid partySize %s', async (partySize) => {
            const created = await service.create(validDto)
            await expect(service.occupy(created.id, partySize as number)).rejects.toThrow(InvalidTableCapacityError)
        })

        it.each(['ocupada', 'reservada'])('should throw TableNotAvailableError for a %s table', async (status) => {
            const created = await service.create({ ...validDto, status })
            await expect(service.occupy(created.id, 2)).rejects.toThrow(TableNotAvailableError)
        })

        it('should throw TableNotAvailableError for a second occupation', async () => {
            const created = await service.create(validDto)
            await service.occupy(created.id, 2)
            await expect(service.occupy(created.id, 2)).rejects.toThrow(TableNotAvailableError)
        })

        it('should let only one concurrent request win', async () => {
            const created = await service.create(validDto)

            const results = await Promise.allSettled([service.occupy(created.id, 2), service.occupy(created.id, 2)])

            expect(results.filter(r => r.status === 'fulfilled')).toHaveLength(1)
            const rejected = results.find(r => r.status === 'rejected') as PromiseRejectedResult
            expect(rejected.reason).toBeInstanceOf(TableNotAvailableError)
        })
    })
})
