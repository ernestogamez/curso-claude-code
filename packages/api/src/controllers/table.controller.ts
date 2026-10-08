import type { Request, Response, NextFunction } from 'express'
import type { TableService, TableListFilters } from '@services/table.service.js'
import type { Table } from '@models/table.model.js'

export class TableController {
    constructor(private readonly tableService: TableService) {}

    create = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
        try {
            const table = await this.tableService.create({
                number: req.body.number,
                description: req.body.description,
                capacity: req.body.capacity,
                status: req.body.status,
                restaurantId: req.params.restaurantId as string
            })
            res.status(201).json(this.toJSON(table))
        } catch (error) {
            next(error)
        }
    }

    getAll = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
        try {
            const filters: TableListFilters = {}
            if (req.query.status !== undefined) filters.status = req.query.status as string
            if (req.query.minCapacity !== undefined) filters.minCapacity = req.query.minCapacity as string
            const tables = await this.tableService.list(req.params.restaurantId as string, filters)
            res.status(200).json(tables.map(t => this.toJSON(t)))
        } catch (error) {
            next(error)
        }
    }

    getById = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
        try {
            const table = await this.tableService.getById(req.params.id as string)
            res.status(200).json(this.toJSON(table))
        } catch (error) {
            next(error)
        }
    }

    update = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
        try {
            const table = await this.tableService.update(req.params.id as string, {
                number: req.body.number,
                description: req.body.description,
                capacity: req.body.capacity,
                status: req.body.status
            })
            res.status(200).json(this.toJSON(table))
        } catch (error) {
            next(error)
        }
    }

    delete = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
        try {
            await this.tableService.delete(req.params.id as string)
            res.status(204).send()
        } catch (error) {
            next(error)
        }
    }

    changeStatus = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
        try {
            const table = await this.tableService.changeStatus(req.params.id as string, req.body.status)
            res.status(200).json(this.toJSON(table))
        } catch (error) {
            next(error)
        }
    }

    occupy = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
        try {
            const table = await this.tableService.occupy(req.params.id as string, req.body.partySize)
            res.status(200).json(this.toJSON(table))
        } catch (error) {
            next(error)
        }
    }

    private toJSON(table: Table) {
        return {
            id: table.id,
            number: table.number,
            description: table.description,
            capacity: table.capacity,
            status: table.status,
            restaurantId: table.restaurantId,
            createdAt: table.createdAt,
            updatedAt: table.updatedAt
        }
    }
}
