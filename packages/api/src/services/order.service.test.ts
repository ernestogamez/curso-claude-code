import { describe, it, expect, beforeEach } from 'vitest'
import { OrderService } from './order.service.js'
import { MockOrderRepository } from '@repositories/mocks/MockOrderRepository.js'
import { MockTableRepository } from '@repositories/mocks/MockTableRepository.js'
import type { Order } from '@models/order.model.js'
import { OrderNotFoundError, InvalidOrderStatusError, TableNotFoundError, TableNotAvailableError } from '@errors/DomainErrors.js'

describe('OrderService.updateItemStatus', () => {
    let repo: MockOrderRepository
    let service: OrderService
    let testOrder: Order

    beforeEach(async () => {
        repo = new MockOrderRepository()
        service = new OrderService(repo, new MockTableRepository())

        testOrder = {
            id: 'order-1',
            restaurantId: 'rest-1',
            tableId: null,
            clientId: null,
            createdAt: new Date(),
            items: [
                { id: 'item-1', dishId: 'dish-1', quantity: 1, notes: null, status: 'pendiente' }
            ]
        }
        await repo.create(testOrder)
    })

    it('should update the status of an item successfully', async () => {
        await service.updateItemStatus('order-1', 'item-1', 'preparando')
        const updatedItem = testOrder.items[0]!
        expect(updatedItem.status).toBe('preparando')
    })

    it('should throw an error if the order does not exist', async () => {
        await expect(service.updateItemStatus('order-bad', 'item-1', 'preparando'))
            .rejects.toThrow(OrderNotFoundError)
    })

    it('should throw an error if the item does not exist inside the order', async () => {
        await expect(service.updateItemStatus('order-1', 'item-bad', 'preparando'))
            .rejects.toThrow(OrderNotFoundError)
    })

    it('should throw DomainError if status is invalid', async () => {
        await expect(service.updateItemStatus('order-1', 'item-1', 'invalid-status'))
            .rejects.toThrow(InvalidOrderStatusError)
    })
})

describe('OrderService.create (table validation)', () => {
    let orderRepo: MockOrderRepository
    let tableRepo: MockTableRepository
    let service: OrderService

    const items = [{ dishId: 'dish-1', quantity: 2, notes: null }]
    const now = new Date().toISOString()
    const buildTable = (id: string, status: 'libre' | 'ocupada' | 'reservada', restaurantId = 'rest-1') =>
        ({ id, number: 1, description: '', capacity: 4, status, restaurantId, createdAt: now, updatedAt: now })

    beforeEach(async () => {
        orderRepo = new MockOrderRepository()
        tableRepo = new MockTableRepository()
        service = new OrderService(orderRepo, tableRepo)
        await tableRepo.save(buildTable('t-occupied', 'ocupada'))
        await tableRepo.save(buildTable('t-free', 'libre'))
        await tableRepo.save(buildTable('t-reserved', 'reservada'))
        await tableRepo.save(buildTable('t-other', 'ocupada', 'rest-2'))
    })

    it('should create an order for an occupied table of the restaurant', async () => {
        const order = await service.create({ restaurantId: 'rest-1', tableId: 't-occupied', clientId: 'c1', items })

        expect(order.tableId).toBe('t-occupied')
        expect(order.tableNumber).toBe(1)
        expect(orderRepo.orders).toHaveLength(1)
    })

    it('should still allow orders without a table', async () => {
        const order = await service.create({ restaurantId: 'rest-1', tableId: null, clientId: 'c1', items })

        expect(order.tableId).toBeNull()
        expect(order.tableNumber).toBeNull()
    })

    it('should throw TableNotFoundError when the table does not exist', async () => {
        await expect(service.create({ restaurantId: 'rest-1', tableId: 'nope', clientId: 'c1', items }))
            .rejects.toThrow(TableNotFoundError)
        expect(orderRepo.orders).toHaveLength(0)
    })

    it('should throw TableNotFoundError when the table belongs to another restaurant', async () => {
        await expect(service.create({ restaurantId: 'rest-1', tableId: 't-other', clientId: 'c1', items }))
            .rejects.toThrow(TableNotFoundError)
    })

    it.each(['t-free', 't-reserved'])('should throw TableNotAvailableError when table %s is not occupied', async (tableId) => {
        await expect(service.create({ restaurantId: 'rest-1', tableId, clientId: 'c1', items }))
            .rejects.toThrow(TableNotAvailableError)
        expect(orderRepo.orders).toHaveLength(0)
    })
})
