import { describe, it, expect, beforeEach } from 'vitest'
import { TableService } from './table.service.js'
import { MockTableRepository } from '@repositories/mocks/MockTableRepository.js'
import {
    TableNotFoundError,
    TableNumberRequiredError,
    DuplicateTableNumberError,
    InvalidTableCapacityError,
    InvalidTableStatusError,
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
})
