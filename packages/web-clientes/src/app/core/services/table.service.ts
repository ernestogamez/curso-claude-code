import { Injectable, inject } from '@angular/core'
import { HttpClient, HttpParams } from '@angular/common/http'
import { Observable } from 'rxjs'
import { API_URL } from '@resttek/web-shared'
import { Table, TableStatus } from '../models/table.model'

export interface TableFilters {
  status?: TableStatus
  minCapacity?: number
}

@Injectable({ providedIn: 'root' })
export class TableService {
  private readonly http = inject(HttpClient)
  private readonly apiUrl = inject(API_URL)

  list(restaurantId: string, filters: TableFilters = {}): Observable<Table[]> {
    let params = new HttpParams()
    if (filters.status) params = params.set('status', filters.status)
    if (filters.minCapacity !== undefined) params = params.set('minCapacity', filters.minCapacity)
    return this.http.get<Table[]>(`${this.apiUrl}/restaurants/${restaurantId}/tables`, { params })
  }

  occupy(restaurantId: string, tableId: string, partySize: number): Observable<Table> {
    return this.http.post<Table>(
      `${this.apiUrl}/restaurants/${restaurantId}/tables/${tableId}/occupy`,
      { partySize }
    )
  }
}
