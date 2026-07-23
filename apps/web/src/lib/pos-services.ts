// Quick services for a bookshop (photocopy / printouts / binding etc.) that
// have no barcode and would be slow to enter manually. These are now managed
// in the "Copy / Print" tab and stored in the database via the API; this type
// is the lightweight shape the POS uses to render the quick-service buttons.

export interface QuickService {
  id: string;
  name: string;
  unitPrice: number; // price per page / per unit
  unitLabel: string; // e.g. "page"
}
