import { SqliteTableRepository } from './table.repository.js'
import { Database } from '@config/database.js'
import type { Table } from '@models/table.model.js'
import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest'

function buildTable(overrides: Partial<Table> = {}): Table {
    const now = new Date().toISOString()
    return {
        id: 't1',
        number: 1,
        description: 'Window table',
        capacity: 4,
        status: 'libre',
        restaurantId: 'r1',
        createdAt: now,
        updatedAt: now,
        ...overrides
    }
}

describe('SqliteTableRepository (Integration)', () => {
    let db: Database
    let repo: SqliteTableRepository

    beforeAll(async () => {
        process.env.NODE_ENV = 'test'
        db = new Database()
        await db.initialize()
        repo = new SqliteTableRepository(db)

        const now = new Date().toISOString()
        for (const id of ['r1', 'r2']) {
            await db.run(
                'INSERT INTO restaurants (id, name, address, email, phone, owner_first_name, owner_last_name, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)',
                [id, `Restaurant ${id}`, 'Calle Mayor 10', `${id}@resttek.com`, '+34 612345678', 'Carlos', 'García', now, now]
            )
        }
    })

    beforeEach(async () => {
        await db.run('DELETE FROM tables')
    })

    afterAll(async () => {
        await db.close()
    })

    it('should save and find a table by id', async () => {
        await repo.save(buildTable())

        const found = await repo.findById('t1')
        expect(found).toEqual(buildTable({ createdAt: found!.createdAt, updatedAt: found!.updatedAt }))
    })

    it('should return null when the table does not exist', async () => {
        expect(await repo.findById('missing')).toBeNull()
    })

    it('should update an existing table on save', async () => {
        await repo.save(buildTable())
        await repo.save(buildTable({ number: 7, description: 'Terrace', capacity: 6, status: 'reservada' }))

        const found = await repo.findById('t1')
        expect(found).toMatchObject({ number: 7, description: 'Terrace', capacity: 6, status: 'reservada' })
    })

    it('should reject duplicate numbers in the same restaurant but allow them across restaurants', async () => {
        await repo.save(buildTable({ id: 't1', number: 1 }))

        await expect(repo.save(buildTable({ id: 't2', number: 1 }))).rejects.toThrow()
        await expect(repo.save(buildTable({ id: 't3', number: 1, restaurantId: 'r2' }))).resolves.toBeUndefined()
    })

    it('should list tables of a restaurant ordered by number', async () => {
        await repo.save(buildTable({ id: 't1', number: 3 }))
        await repo.save(buildTable({ id: 't2', number: 1 }))
        await repo.save(buildTable({ id: 't3', number: 2, restaurantId: 'r2' }))

        const tables = await repo.findByRestaurant('r1')
        expect(tables.map(t => t.number)).toEqual([1, 3])
    })

    it('should filter by status and minCapacity', async () => {
        await repo.save(buildTable({ id: 't1', number: 1, capacity: 2, status: 'libre' }))
        await repo.save(buildTable({ id: 't2', number: 2, capacity: 6, status: 'libre' }))
        await repo.save(buildTable({ id: 't3', number: 3, capacity: 6, status: 'ocupada' }))

        expect((await repo.findByRestaurant('r1', { status: 'libre' })).map(t => t.id)).toEqual(['t1', 't2'])
        expect((await repo.findByRestaurant('r1', { minCapacity: 4 })).map(t => t.id)).toEqual(['t2', 't3'])
        expect((await repo.findByRestaurant('r1', { status: 'libre', minCapacity: 4 })).map(t => t.id)).toEqual(['t2'])
    })

    it('should delete a table', async () => {
        await repo.save(buildTable())
        await repo.delete('t1')

        expect(await repo.findById('t1')).toBeNull()
    })

    describe('occupyIfFree', () => {
        it('should occupy a free table and return true', async () => {
            await repo.save(buildTable())

            expect(await repo.occupyIfFree('t1')).toBe(true)
            expect((await repo.findById('t1'))?.status).toBe('ocupada')
        })

        it('should return false on the second call', async () => {
            await repo.save(buildTable())

            await repo.occupyIfFree('t1')
            expect(await repo.occupyIfFree('t1')).toBe(false)
        })

        it.each(['ocupada', 'reservada'] as const)('should return false for a %s table', async (status) => {
            await repo.save(buildTable({ status }))

            expect(await repo.occupyIfFree('t1')).toBe(false)
            expect((await repo.findById('t1'))?.status).toBe(status)
        })

        it('should let only one of several concurrent calls win', async () => {
            await repo.save(buildTable())

            const results = await Promise.all([repo.occupyIfFree('t1'), repo.occupyIfFree('t1'), repo.occupyIfFree('t1')])
            expect(results.filter(Boolean)).toHaveLength(1)
        })

        it('should return false when the table does not exist', async () => {
            expect(await repo.occupyIfFree('missing')).toBe(false)
        })
    })
})
