
Goal:
- Make document previews always show `.00` in the requested numeric fields.

What I found:
- `src/components/DocumentPreview.tsx` has two local helpers:
  - `formatPlain()` removes `.00` from integer values.
  - `formatNumber()` also removes `.00` from integer totals.
- Those helpers are currently driving the values you highlighted, so integers like `25` and `20000` render without `.00`.

Implementation plan:
1. Update the preview formatting logic in `src/components/DocumentPreview.tsx` to use explicit formatters:
   - Quantity formatter: always 2 decimals, no comma separators
   - Amount formatter: always 2 decimals, with `en-IN` commas
2. Apply the new formatters to:
   - `QTY`
   - row `TOTAL`
   - blue `Total Amount` bar
3. Apply the same quantity rule to challan values:
   - `DELIVERY QTY`
   - `BALANCE QTY`
   - challan total quantity row
4. While touching the same row, align `UNIT PRICE` to fixed 2 decimals too, because it is still using the old integer-stripping formatter.
5. Keep the new footer layout exactly as-is; only numeric display rules will change.

Expected output:
- `25` → `25.00`
- `800` → `800.00`
- `20000` → `20,000.00`
- `BDT 20000` → `BDT 20,000.00`
- Challan total → `25.00 Pcs`

Technical details:
- Main file: `src/components/DocumentPreview.tsx`
- No backend or database change is needed.
- This is a display-only fix for invoice, quotation, purchase order, and challan previews.
- After implementation, the VPS deploy step will still be: pull latest code and run a production build.
