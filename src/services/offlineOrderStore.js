/**
 * offlineOrderStore.js
 * IndexedDB wrapper for offline order storage.
 * DB: 'alvarez_crm'  Store: 'crm_offline_orders'
 *
 * DB-verbinding en versioning worden beheerd door idb.js.
 */

import { openDb, promisify } from './idb.js'

const STORE = 'crm_offline_orders'

function tx(mode = 'readonly') {
  return openDb().then(db => {
    const t = db.transaction(STORE, mode)
    return t.objectStore(STORE)
  })
}

// ── Public API ────────────────────────────────────────────────────────────────

/**
 * Sla een bestelling op (nieuw of update).
 * @param {Object} order - Volledige orderstructuur
 */
export async function saveOrder(order) {
  const store = await tx('readwrite')
  return promisify(store.put(order))
}

/**
 * Maak een nieuwe concept-bestelling en sla deze op.
 * @returns {Object} De aangemaakte bestelling
 */
export async function createOrder({ clientId, clientName, plannedVisitId = null, lines = [] }) {
  const order = {
    id:             crypto.randomUUID(),
    clientId,
    clientName,
    plannedVisitId,
    lines,           // [{ productId, productName, quantity, unit, unitPrice, discount }]
    status:          'draft',
    createdAt:       new Date().toISOString(),
    syncedAt:        null,
    serverId:        null,   // ingevuld na succesvolle sync
  }
  await saveOrder(order)
  return order
}

/**
 * Haal alle lokale bestellingen op, gesorteerd op createdAt desc.
 */
export async function getAllOrders() {
  const store = await tx('readonly')
  const all = await promisify(store.getAll())
  return all.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
}

/**
 * Haal één bestelling op via id.
 */
export async function getOrderById(id) {
  const store = await tx('readonly')
  return promisify(store.get(id))
}

/**
 * Verwijder een bestelling.
 */
export async function deleteOrder(id) {
  const store = await tx('readwrite')
  return promisify(store.delete(id))
}

/**
 * Markeer een bestelling als gesynchroniseerd.
 * @param {string} id - Lokaal UUID
 * @param {string} serverId - Het Guid van de server-bestelling
 */
export async function markAsSynced(id, serverId) {
  const existing = await getOrderById(id)
  if (!existing) return
  existing.status   = 'synced'
  existing.syncedAt = new Date().toISOString()
  existing.serverId = serverId
  return saveOrder(existing)
}

/**
 * Geeft alle bestellingen terug die confirmed zijn maar nog niet gesynchroniseerd.
 */
export async function getPendingOrders() {
  const all = await getAllOrders()
  return all.filter(o => o.status === 'confirmed' && !o.syncedAt)
}
