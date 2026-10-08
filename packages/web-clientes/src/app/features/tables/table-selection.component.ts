import { Component, inject, OnInit, signal } from '@angular/core'
import { ActivatedRoute, Router, RouterLink } from '@angular/router'
import { FormsModule } from '@angular/forms'
import { CartStore } from '../../core/store/cart.store'
import { TableService } from '../../core/services/table.service'
import { Table } from '../../core/models/table.model'

@Component({
  selector: 'app-table-selection',
  standalone: true,
  imports: [RouterLink, FormsModule],
  template: `
    <div class="container">
      <div class="page-header">
        <a routerLink="/restaurants" class="back-link">← Volver a restaurantes</a>
        <h1>Elige tu mesa</h1>
        <p>Indica cuántas personas sois y selecciona una mesa libre</p>
      </div>

      <div class="card party-form">
        <label for="partySize">Número de personas</label>
        <input id="partySize" type="number" min="1" step="1" [ngModel]="partySize()"
               (ngModelChange)="onPartySizeChange($event)" />
        @if (partySizeError()) {
          <p class="error-msg">{{ partySizeError() }}</p>
        }
      </div>

      @if (partySizeError()) {
        <!-- waiting for a valid party size -->
      } @else if (loading()) {
        <div class="spinner"></div>
      } @else if (error()) {
        <div class="alert-error">{{ error() }}</div>
      } @else if (tables().length === 0) {
        <div class="empty-state card">
          <p>No hay mesas libres con capacidad para {{ partySize() }} personas</p>
        </div>
      } @else {
        <div class="table-grid">
          @for (table of tables(); track table.id) {
            <button type="button" class="table-card card" [class.selected]="selectedId() === table.id"
                    (click)="selectedId.set(table.id)">
              <h3>Mesa {{ table.number }}</h3>
              <p class="capacity">Capacidad: {{ table.capacity }}</p>
              @if (table.description) {
                <p class="description">{{ table.description }}</p>
              }
            </button>
          }
        </div>
        @if (occupyError()) {
          <div class="alert-error" style="margin-top: 16px;">{{ occupyError() }}</div>
        }
        <button class="btn btn-primary continue-btn" [disabled]="!selectedId() || occupying()"
                (click)="continue()">
          {{ occupying() ? 'Ocupando mesa...' : 'Continuar' }}
        </button>
      }
    </div>
  `,
  styles: [`
    .container {
      max-width: 900px;
      margin: 0 auto;
    }
    .back-link {
      font-size: 13px;
      color: var(--text-muted);
      margin-bottom: 8px;
      display: inline-block;
    }
    .party-form {
      display: flex;
      flex-direction: column;
      gap: 8px;
      max-width: 280px;
      margin-bottom: 24px;
    }
    .error-msg {
      color: var(--red);
      font-size: 13px;
    }
    .table-grid {
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(200px, 1fr));
      gap: 16px;
    }
    .table-card {
      text-align: left;
      padding: 16px 20px;
      cursor: pointer;
      transition: all var(--transition);
    }
    .table-card:hover,
    .table-card.selected {
      border-color: var(--green-medium);
    }
    .table-card.selected {
      background: var(--green-glow);
    }
    .continue-btn {
      margin-top: 24px;
    }
    .table-card h3 {
      font-size: 16px;
      font-weight: 600;
      margin-bottom: 4px;
    }
    .capacity {
      color: var(--text-secondary);
      font-size: 13px;
    }
    .description {
      color: var(--text-muted);
      font-size: 13px;
      margin-top: 4px;
    }
  `]
})
export class TableSelectionComponent implements OnInit {
  private readonly route = inject(ActivatedRoute)
  private readonly router = inject(Router)
  private readonly tableService = inject(TableService)
  private readonly cartStore = inject(CartStore)

  private restaurantId = ''

  readonly partySize = signal<number | null>(2)
  readonly partySizeError = signal<string | null>(null)
  readonly tables = signal<Table[]>([])
  readonly selectedId = signal<string | null>(null)
  readonly loading = signal(false)
  readonly error = signal<string | null>(null)
  readonly occupying = signal(false)
  readonly occupyError = signal<string | null>(null)

  ngOnInit(): void {
    this.restaurantId = this.route.snapshot.paramMap.get('id')!
    this.loadTables()
  }

  onPartySizeChange(value: number | null): void {
    this.partySize.set(value)
    this.occupyError.set(null)
    this.loadTables()
  }

  continue(): void {
    const tableId = this.selectedId()
    const size = this.partySize()
    if (!tableId || size === null || this.occupying()) return

    this.occupying.set(true)
    this.occupyError.set(null)

    this.tableService.occupy(this.restaurantId, tableId, size).subscribe({
      next: (table) => {
        this.cartStore.setTable(this.restaurantId, table.id, table.number)
        this.occupying.set(false)
        this.router.navigate(['/restaurants', this.restaurantId])
      },
      error: (err) => {
        this.occupying.set(false)
        if (err.status === 409) {
          this.occupyError.set('Esa mesa ya no está disponible. Elige otra.')
          this.selectedId.set(null)
          this.loadTables()
        } else if (err.status === 400) {
          this.occupyError.set('La mesa no tiene capacidad suficiente para tu grupo.')
        } else {
          this.occupyError.set('No se pudo ocupar la mesa. Inténtalo de nuevo.')
        }
      }
    })
  }

  private loadTables(): void {
    const size = this.partySize()
    if (size === null || !Number.isInteger(size) || size < 1) {
      this.partySizeError.set('Indica un número de personas entero mayor o igual que 1')
      this.tables.set([])
      this.selectedId.set(null)
      return
    }
    this.partySizeError.set(null)
    this.loading.set(true)
    this.error.set(null)

    this.tableService.list(this.restaurantId, { status: 'libre', minCapacity: size }).subscribe({
      next: (tables) => {
        this.tables.set(tables)
        if (!tables.some(t => t.id === this.selectedId())) this.selectedId.set(null)
        this.loading.set(false)
      },
      error: () => {
        this.error.set('Error al cargar las mesas')
        this.loading.set(false)
      }
    })
  }
}
