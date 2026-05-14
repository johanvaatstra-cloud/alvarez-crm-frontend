/**
 * idb.js — Gedeelde IndexedDB verbinding voor alvarez_crm
 *
 * Versie 1 → crm_offline_orders
 * Versie 2 → crm_clients, crm_products (offline cache)
 *
 * Alle andere services importeren openDb() en promisify() hieruit zodat de
 * onupgradeneeded-handler altijd op één plek staat en versies nooit conflicteren.
 */

const DB_NAME    = 'alvarez_crm'
const DB_VERSION = 2

let _db = null

export function openDb() {
  if (_db) return Promise.resolve(_db)

  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, DB_VERSION)

    req.onupgradeneeded = (e) => {
      const db      = e.target.result
      const oldVer  = e.oldVersion   // 0 = nieuw, 1 = bestaand v1-schema

      // ── v1: bestellingen ────────────────────────────────────────────────────
      if (!db.objectStoreNames.contains('crm_offline_orders')) {
        const s = db.createObjectStore('crm_offline_orders', { keyPath: 'id' })
        s.createIndex('status',    'status',    { unique: false })
        s.createIndex('clientId',  'clientId',  { unique: false })
        s.createIndex('createdAt', 'createdAt', { unique: false })
      }

      // ── v2: klanten & productencatalogus cache ───────────────────────────────
      if (oldVer < 2) {
        if (!db.objectStoreNames.contains('crm_clients')) {
          db.createObjectStore('crm_clients', { keyPath: 'id' })
        }
        if (!db.objectStoreNames.contains('crm_products')) {
          db.createObjectStore('crm_products', { keyPath: 'id' })
        }
      }
    }

    req.onsuccess  = (e) => { _db = e.target.result; resolve(_db) }
    req.onerror    = (e) => reject(e.target.error)
    req.onblocked  = ()  => console.warn('[IDB] Upgrade geblokkeerd — sluit andere tabbladen')
  })
}

/** Wrap een IDBRequest in een Promise. */
export function promisify(req) {
  return new Promise((resolve, reject) => {
    req.onsuccess = (e) => resolve(e.target.result)
    req.onerror   = (e) => reject(e.target.error)
  })
}
