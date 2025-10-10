import Dexie, { type Table } from 'dexie';
import type { Invoice, Customer, Service } from './supabase';

// Offline draft invoice types
export interface DraftInvoice {
  id: string; // UUID v4
  customer_id: string;
  customer_name?: string; // Denormalized for offline display
  invoice_date: string;
  due_date: string | null;
  notes: string | null;
  terms: string | null;
  created_at: string;
  updated_at: string;
  synced: boolean; // false until uploaded to Supabase
}

export interface DraftInvoiceItem {
  id: string;
  draft_invoice_id: string;
  line_order: number;
  service_id: string | null;
  description: string;
  quantity: number;
  unit_price: number;
  vat_rate: number;
  created_at: string;
}

// Cached data for offline access
export interface CachedInvoice extends Invoice {
  customer_name?: string;
}

// Dexie database
export class InvoiceDB extends Dexie {
  // Offline drafts (not yet synced to Supabase)
  draftInvoices!: Table<DraftInvoice, string>;
  draftInvoiceItems!: Table<DraftInvoiceItem, string>;

  // Cached data from Supabase (for offline viewing)
  cachedInvoices!: Table<CachedInvoice, string>;
  cachedCustomers!: Table<Customer, string>;
  cachedServices!: Table<Service, string>;

  // Metadata
  lastSync!: Table<{ key: string; timestamp: number }, string>;

  constructor() {
    super('TebelaInvoicingDB');

    this.version(1).stores({
      draftInvoices: 'id, customer_id, created_at, synced',
      draftInvoiceItems: 'id, draft_invoice_id, line_order',
      cachedInvoices: 'id, customer_id, status, created_at',
      cachedCustomers: 'id, name',
      cachedServices: 'id, code, name',
      lastSync: 'key',
    });
  }
}

export const db = new InvoiceDB();

// Helper functions

// Generate UUID v4
export function generateUUID(): string {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === 'x' ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

// Create a new draft invoice
export async function createDraftInvoice(
  customerId: string,
  customerName?: string
): Promise<DraftInvoice> {
  const draft: DraftInvoice = {
    id: generateUUID(),
    customer_id: customerId,
    customer_name: customerName,
    invoice_date: new Date().toISOString().split('T')[0],
    due_date: null,
    notes: null,
    terms: null,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    synced: false,
  };

  await db.draftInvoices.add(draft);
  return draft;
}

// Add line item to draft invoice
export async function addDraftLineItem(
  draftInvoiceId: string,
  item: Omit<DraftInvoiceItem, 'id' | 'draft_invoice_id' | 'created_at'>
): Promise<DraftInvoiceItem> {
  const lineItem: DraftInvoiceItem = {
    id: generateUUID(),
    draft_invoice_id: draftInvoiceId,
    ...item,
    created_at: new Date().toISOString(),
  };

  await db.draftInvoiceItems.add(lineItem);

  // Update draft updated_at
  await db.draftInvoices.update(draftInvoiceId, {
    updated_at: new Date().toISOString(),
  });

  return lineItem;
}

// Get draft invoice with items
export async function getDraftInvoiceWithItems(draftId: string) {
  const draft = await db.draftInvoices.get(draftId);
  if (!draft) return null;

  const items = await db.draftInvoiceItems
    .where('draft_invoice_id')
    .equals(draftId)
    .sortBy('line_order');

  return { ...draft, items };
}

// Get all unsynced drafts
export async function getUnsyncedDrafts(): Promise<DraftInvoice[]> {
  return db.draftInvoices.where('synced').equals(0).toArray();
}

// Mark draft as synced
export async function markDraftAsSynced(draftId: string): Promise<void> {
  await db.draftInvoices.update(draftId, { synced: true });
}

// Delete draft and its items
export async function deleteDraft(draftId: string): Promise<void> {
  await db.draftInvoiceItems.where('draft_invoice_id').equals(draftId).delete();
  await db.draftInvoices.delete(draftId);
}

// Cache invoice from Supabase
export async function cacheInvoice(invoice: Invoice, customerName?: string): Promise<void> {
  const cached: CachedInvoice = {
    ...invoice,
    customer_name: customerName,
  };
  await db.cachedInvoices.put(cached);
}

// Cache multiple invoices
export async function cacheInvoices(invoices: CachedInvoice[]): Promise<void> {
  await db.cachedInvoices.bulkPut(invoices);
}

// Get cached invoices
export async function getCachedInvoices(): Promise<CachedInvoice[]> {
  return db.cachedInvoices.orderBy('created_at').reverse().toArray();
}

// Cache customers
export async function cacheCustomers(customers: Customer[]): Promise<void> {
  await db.cachedCustomers.bulkPut(customers);
}

// Get cached customers
export async function getCachedCustomers(): Promise<Customer[]> {
  return db.cachedCustomers.toArray();
}

// Cache services
export async function cacheServices(services: Service[]): Promise<void> {
  await db.cachedServices.bulkPut(services);
}

// Get cached services
export async function getCachedServices(): Promise<Service[]> {
  return db.cachedServices.toArray();
}

// Update last sync timestamp
export async function updateLastSync(key: string): Promise<void> {
  await db.lastSync.put({ key, timestamp: Date.now() });
}

// Get last sync timestamp
export async function getLastSync(key: string): Promise<number | null> {
  const record = await db.lastSync.get(key);
  return record?.timestamp ?? null;
}

// Check if online
export function isOnline(): boolean {
  return navigator.onLine;
}

// Calculate line totals
export function calculateLineTotals(quantity: number, unitPrice: number, vatRate: number) {
  const lineTotal = quantity * unitPrice;
  const vatAmount = (lineTotal * vatRate) / 100;
  const lineTotalInclVat = lineTotal + vatAmount;

  return {
    line_total: Math.round(lineTotal * 100) / 100,
    vat_amount: Math.round(vatAmount * 100) / 100,
    line_total_incl_vat: Math.round(lineTotalInclVat * 100) / 100,
  };
}
