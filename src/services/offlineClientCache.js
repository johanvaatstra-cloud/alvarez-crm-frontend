/**
 * offlineClientCache.js
 * Cache klantgegevens en productcatalogus in IndexedDB voor offline gebruik.
 *
 * Stores (aangemaakt door idb.js versie 2):
 *   crm_clients   — klantobjecten uit de API
 *   crm_products  — productobjecten uit de catalogus
 *
 * Strategie: upsert (put) per record → opbouw is incrementeel.
 * De verkoper hoeft niet alle klanten in één keer op te halen; elke
 * succesvolle API-aanroep vult de cache verder aan.
 */

import { openDb, promisify } from './idb.js'

const CLIENT_STORE  = 'crm_clients'
const PRODUCT_STORE = 'crm_products'

async function getStore(name, mode = 'readonly') {
  const db = await openDb()
  return db.transaction(name, mode).objectStore(name)
}

// ── Klanten ───────────────────────────────────────────────────────────────────

/**
 * Sla een array klanten op in de cache (upsert per record).
 * Fire-and-forget: gooit nooit een foutmelding naar de aanroeper.
 * @param {Object[]} clients
 */
export async function cacheClients(clients) {
  if (!clients?.length) return
  try {
    const s = await getStore(CLIENT_STORE, 'readwrite')
    for (const c of clients) {
      s.put(c)   // synchrone put — allemaal op dezelfde transactie
    }
  } catch (err) {
    console.warn('[ClientCache] cacheClients mislukt:', err)
  }
}

/**
 * Haal alle gecachede klanten op.
 * @returns {Promise<Object[]>}
 */
export async function getCachedClients() {
  try {
    const s = await getStore(CLIENT_STORE)
    return await promisify(s.getAll())
  } catch {
    return []
  }
}

/**
 * Haal één gecachede klant op via id.
 * @param {string} id
 * @returns {Promise<Object|null>}
 */
export async function getCachedClient(id) {
  try {
    const s = await getStore(CLIENT_STORE)
    return (await promisify(s.get(id))) ?? null
  } catch {
    return null
  }
}

// ── Producten ─────────────────────────────────────────────────────────────────

/**
 * Sla een array producten op in de cache (upsert per record).
 * @param {Object[]} products
 */
export async function cacheProducts(products) {
  if (!products?.length) return
  try {
    const s = await getStore(PRODUCT_STORE, 'readwrite')
    for (const p of products) {
      s.put(p)
    }
  } catch (err) {
    console.warn('[ClientCache] cacheProducts mislukt:', err)
  }
}

/**
 * Haal alle gecachede producten op.
 * @returns {Promise<Object[]>}
 */
export async function getCachedProducts() {
  try {
    const s = await getStore(PRODUCT_STORE)
    return await promisify(s.getAll())
  } catch {
    return []
  }
}
