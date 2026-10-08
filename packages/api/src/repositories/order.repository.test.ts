import { describe, it, expect, beforeAll, afterAll } from 'vitest'
import { SqliteOrderRepository } from './order.repository.js'
import { Database } from '@config/database.js'
import type { Order } from '@models/order.model.js'

describe('SqliteOrderRepository table number (Integration)', () => {
    let db: Database
    let repo: SqliteOrderRepository

    const buildOrder = (id: string, tableId: string | null): Order => ({
        id,
        restaurantId: 'r1',
        tableId,
        clientId: 'c1',
        createdAt: new Date(),
        items: [{ id: `${id}-i1`, dishId: 'd1', quantity: 1, notes: null, status: 'pendiente' }]
    })

    beforeAll(async () => {
        process.env.NODE_ENV = 'test'
        db = new Database()
        await db.initialize()
        repo = new SqliteOrderRepository(db)

        const now = new Date().toISOString()
        await db.run(
            'INSERT INTO restaurants (id, name, address, email, phone, owner_first_name, owner_last_name, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)',
            ['r1', 'La Trattoria', 'Calle Mayor 10', 'info@trattoria.com', '+34 612345678', 'Carlos', 'García', now, now]
        )
        await db.run(
            'INSERT INTO dishes (id, name, description, price, category, available, restaurant_id, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)',
            ['d1', 'Pasta', '', 10, 'principal', 1, 'r1', now, now]
        )
        await db.run(
            'INSERT INTO tables (id, number, description, capacity, status, restaurant_id, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
            ['t1', 7, '', 4, 'ocupada', 'r1', now, now]
        )

        await repo.create(buildOrder('o-table', 't1'))
        await repo.create(buildOrder('o-no-table', null))
        await repo.create(buildOrder('o-deleted-table', 't-deleted'))
    })

    afterAll(async () => {
        await db.close()
    })

    it('should return tableNumber in findById', async () => {
        expect((await repo.findById('o-table'))?.tableNumber).toBe(7)
    })

    it('should return null tableNumber when the order has no table', async () => {
        expect((await repo.findById('o-no-table'))?.tableNumber).toBeNull()
    })

    it('should return null tableNumber when the table no longer exists', async () => {
        expect((await repo.findById('o-deleted-table'))?.tableNumber).toBeNull()
    })

    it('should return tableNumber in findActiveByRestaurant', async () => {
        const orders = await repo.findActiveByRestaurant('r1')
        const byId = Object.fromEntries(orders.map(o => [o.id, o.tableNumber]))
        expect(byId).toEqual({ 'o-table': 7, 'o-no-table': null, 'o-deleted-table': null })
    })

    it('should return tableNumber in findByClientId', async () => {
        const orders = await repo.findByClientId('c1')
        const byId = Object.fromEntries(orders.map(o => [o.id, o.tableNumber]))
        expect(byId).toEqual({ 'o-table': 7, 'o-no-table': null, 'o-deleted-table': null })
    })
})
