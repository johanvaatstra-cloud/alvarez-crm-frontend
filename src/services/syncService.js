/**
 * syncService.js
 * Listens for 'online' events and syncs confirmed offline orders to the API.
 */

import api from '../api/axios.js'
import { getPendingOrders, markAsSynced } from './offlineOrderStore.js'

let _toast  = null   // PrimeVue useToast instance (injecteerd via init)
let _t      = null   // i18n t() functie
let _active = false  // voorkomt dubbele registratie

/**
 * Initialiseer de sync service met toast + i18n.
 * Aanroepen vanuit App.vue of een top-level component.
 */
export function initSyncService(toast, t) {
  _toast = toast
  _t     = t
  if (_active) return
  _active = true
  window.addEventListener('online', syncPendingOrders)
}

/**
 * Synchroniseer alle confirmed-maar-nog-niet-gesyncte bestellingen.
 * Wordt automatisch aangeroepen bij 'online' event.
 * Kan ook handmatig worden aangeroepen.
 */
export async function syncPendingOrders() {
  const pending = await getPendingOrders()
  if (pending.length === 0) return

  let synced  = 0
  let failed  = 0

  for (const order of pending) {
    try {
      const payload = {
        clientId:       order.clientId,
        plannedVisitId: order.plannedVisitId ?? null,
        notes:          order.notes ?? null,
        lines: order.lines.map(l => ({
          productId:      l.productId ?? null,
          productNameRaw: l.productName,
          quantity:       l.quantity,
          unit:           l.unit,
          unitPrice:      l.unitPrice,
          discount:       l.discount ?? 0,
        }))
      }

      const res = await api.post('/orders', payload)
      const serverId = res.data?.data?.id

      if (serverId) {
        // Bevestig de bestelling op de server
        await api.post(`/orders/${serverId}/confirm`)
        await markAsSynced(order.id, serverId)
        synced++
      }
    } catch (err) {
      console.error('[syncService] Sync mislukt voor order', order.id, err)
      failed++
    }
  }

  if (!_toast || !_t) return

  if (synced > 0) {
    _toast.add({
      severity: 'success',
      summary:  _t('sync.successTitle'),
      detail:   _t('sync.successDetail', { count: synced }),
      life:     4000,
    })
  }

  if (failed > 0) {
    _toast.add({
      severity: 'warn',
      summary:  _t('sync.failTitle'),
      detail:   _t('sync.failDetail', { count: failed }),
      life:     6000,
    })
  }
}
