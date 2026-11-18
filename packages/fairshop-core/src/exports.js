// Catalogue of export files from real store, marketplace, payment, shipping, point-of-sale,
// freight and accounting systems that the Fairshop agents recognise.
//
// Each entry says how to recognise the file (column names that must be there).
// An agent turns an entry into a profile by adding its own column map:
//
//   exportProfile('slack_members', { user: 'fullname', email: 'email' })
//
// basis:
//   'documented'  the column names were checked against the vendor's own
//                 documentation (source and date given);
//   'recalled'    the layout was written from knowledge of the export and was
//                 not checked against documentation or a live account.
// Neither kind was tested against a live account. When a header differs, the
// file still maps by each column's "also called" list, `inspect` shows what was
// matched, and fairshop-sources.json names the columns by hand.

const e = (id, system, label, signature, extra = {}) => Object.freeze({ id, system, label, signature, basis: 'recalled', ...extra });

export const EXPORTS = Object.freeze(Object.fromEntries([
  // Carrier invoices and freight audit
  e('tms_freight_bill_lines', 'TMS (generic)', 'Freight bill export, one row per charge line', ['Freight Bill Number', 'Charge Type', 'Line Amount']),
  e('sap_tm_freight_settlement', 'SAP Transportation Management', 'Freight settlement documents, list export with English labels', ['Freight Settlement Document', 'Freight Order', ['Net Amount', 'Net Value']]),
  e('sap_tm_freight_settlement_de', 'SAP Transportation Management', 'Frachtabrechnungsbelege, Listenexport mit deutschen Bezeichnungen', ['Frachtabrechnungsbeleg', 'Frachtauftrag'], { dateOrder: 'dmy', decimal: ',' }),
  // Parcel invoice data
  e('fedex_fbo_csv', 'FedEx Billing Online', 'Invoice download (CSV)', ['Express or Ground Tracking ID', 'Net Charge Amount']),
  e('ups_billing_data', 'UPS Billing Center', 'Billing data file with its header row (CSV)', ['Lead Shipment Number', 'Tracking Number', 'Net Amount', 'Charge Description']),
  e('shipstation_shipments', 'ShipStation', 'Shipments > Export (CSV)', ['Order Number', 'Tracking Number', ['Shipping Cost', 'Shipment Cost', 'Label Cost']]),
  // Ocean and customs
  e('container_milestones', 'Container visibility platform (generic)', 'Container milestones export, one row per container', ['Container Number', ['Discharge Date', 'Vessel Discharge'], ['Last Free Day', 'LFD']]),
  e('ace_es003_lines', 'U.S. CBP ACE Reports', 'Entry Summary Line Details (ES-003) export', ['Entry Summary Number', 'Entry Summary Line Number']),
  // Accounts payable and sales (for duplicates, accruals and margins)
  e('netsuite_transactions', 'NetSuite', 'Transaction saved search (default column labels)', ['Document Number', 'Date', 'Name', 'Amount']),
  e('qbo_transaction_list_by_vendor', 'QuickBooks Online', 'Transaction List by Vendor report (CSV or Excel)', ['Transaction Type', 'Num', 'Amount'], { dropTotals: true }),
  e('xero_bills', 'Xero', 'Bills > Export (CSV)', ['ContactName', 'InvoiceNumber', 'Total']),
  e('sap_fbl1n_items', 'SAP S/4HANA or ECC', 'Vendor line items (FBL1N) list export, English labels', [['Vendor', 'Supplier', 'Account'], 'Document Number', ['Amount in Doc. Curr.', 'Amount in Local Currency'], 'Reference']),
  e('shopify_orders', 'Shopify', 'Orders > Export (CSV)', ['Name', 'Financial Status', 'Lineitem name']),
  // ---- E-commerce and retail (Fairshop) ----
  // Stores
  e('shopify_products', 'Shopify', 'Products > Export (CSV)', ['Handle', 'Title', 'Variant SKU', 'Variant Price']),
  e('shopify_inventory', 'Shopify', 'Inventory > Export (CSV), one row per variant and location', ['Handle', 'SKU', 'Location', ['Available', 'On hand']]),
  e('shopify_payout_transactions', 'Shopify Payments', 'Payouts > Export transactions (CSV)', ['Payout Date', 'Order', 'Fee', 'Net']),
  e('shopify_discounts_orders', 'Shopify', 'Orders > Export (CSV), discount columns', ['Name', 'Discount Code', 'Discount Amount', 'Email']),
  e('woocommerce_orders', 'WooCommerce', 'Orders export (CSV)', ['Order Number', 'Order Status', 'Order Total Amount']),
  e('bigcommerce_orders', 'BigCommerce', 'Orders > Export (default template)', ['Order ID', 'Order Status', 'Order Total (inc tax)']),
  // Marketplaces
  e('amazon_settlement_v2', 'Amazon Seller Central', 'Settlement report, flat file V2', ['settlement-id', 'amount-type', 'amount-description', 'amount']),
  e('amazon_transaction_view', 'Amazon Seller Central', 'Payments > Date range report (transaction view)', ['settlement id', 'order id', 'product sales', 'selling fees', 'fba fees', 'total']),
  e('amazon_inventory_ledger', 'Amazon Seller Central', 'Inventory Ledger, detailed view', ['Date', 'FNSKU', 'MSIN', 'Event Type', 'Reason', 'Quantity']),
  e('amazon_inventory_adjustments', 'Amazon Seller Central', 'FBA Inventory Adjustments report', ['adjusted-date', 'transaction-item-id', 'fnsku', 'reason', 'quantity']),
  e('amazon_reimbursements', 'Amazon Seller Central', 'FBA Reimbursements report', ['approval-date', 'reimbursement-id', 'reason', 'amount-total']),
  e('amazon_customer_returns', 'Amazon Seller Central', 'FBA Customer Returns report', ['return-date', 'order-id', 'fnsku', 'detailed-disposition']),
  e('amazon_storage_fees', 'Amazon Seller Central', 'Monthly Storage Fees report', ['asin', 'fnsku', 'month_of_charge', 'estimated_monthly_storage_fee']),
  e('amazon_inventory_age', 'Amazon Seller Central', 'FBA Inventory report (inventory age columns)', ['snapshot-date', 'sku', 'inv-age-0-to-90-days', 'inv-age-181-to-270-days']),
  e('amazon_all_listings', 'Amazon Seller Central', 'All Listings report', ['seller-sku', 'asin1', 'item-name', 'price', 'quantity']),
  e('amazon_ads_sp_campaigns', 'Amazon Ads', 'Sponsored Products campaign report', ['Campaign Name', 'Impressions', 'Clicks', 'Spend', ['7 Day Total Sales', '14 Day Total Sales']]),
  e('amazon_az_claims', 'Amazon Seller Central', 'A-to-z Guarantee claims (Performance > A-to-z Guarantee claims, exported)', ['Claim ID', 'Order ID', 'Claim Reason', 'Claim Amount']),
  e('ebay_transaction_report', 'eBay Seller Hub', 'Payments > Reports > Transaction report (CSV)', ['Transaction creation date', 'Type', 'Order number', 'Net amount']),
  e('ebay_listings', 'eBay Seller Hub', 'Listings > Active > Download report (CSV)', ['Item number', 'Title', 'Custom label (SKU)', ['Current price', 'Start price']]),
  e('etsy_payments_csv', 'Etsy', 'Payment account > Download CSV', ['Date', 'Type', 'Title', 'Info', 'Fees & Taxes', 'Net']),
  e('etsy_orders_csv', 'Etsy', 'Shop Manager > Settings > Options > Download Data: Orders (CSV)', ['Sale Date', 'Order ID', 'Order Value', 'Order Net']),
  e('walmart_recon', 'Walmart Seller Center', 'Payments > Reconciliation report', ['Period Start Date', 'Transaction Type', 'Customer Order #', 'Amount Type', 'Amount']),
  // Payments
  e('stripe_balance_transactions', 'Stripe', 'Balance > Balance transactions export (CSV)', [['Available On (UTC)', 'Available On'], 'Source', 'Fee', 'Net']),
  e('stripe_subscriptions', 'Stripe Billing', 'Subscriptions export (CSV)', ['id', 'Customer Email', 'Status', ['Current Period End (UTC)', 'Current Period End']]),
  e('paypal_activity', 'PayPal', 'Activity > Download (CSV)', ['Gross', 'Fee', 'Net', 'Transaction ID']),
  e('recharge_subscriptions', 'Recharge', 'Subscriptions export (CSV)', ['subscription_id', 'customer_email', 'status', 'next_charge_scheduled_at']),
  // Shipping and fulfilment
  e('shippo_labels', 'Shippo', 'Transactions export (CSV)', ['Object ID', 'Tracking Number', 'Rate Amount', 'Order Number']),
  e('ups_adjustments', 'UPS Billing Center', 'Billing data, adjustment lines (CSV with header row)', ['Tracking Number', 'Charge Description', 'Net Amount', ['Adjustment Reason', 'Charge Category Detail Code']]),
  e('usps_apv', 'USPS (via your shipping platform)', 'Automated Package Verification adjustments export', ['Tracking Number', ['APV Amount', 'Adjustment Amount'], ['Entered Weight', 'Declared Weight']]),
  e('three_pl_invoice', '3PL (generic)', 'Invoice detail export, one row per charge', ['Invoice Number', ['Charge Type', 'Fee Type', 'Activity'], ['Quantity', 'Units'], ['Amount', 'Extended Amount']]),
  // Point of sale
  e('square_cash_drawers', 'Square', 'Cash drawer report (CSV)', ['Drawer', ['Starting Cash', 'Starting Cash Amount'], ['Expected Cash', 'Expected In Drawer'], ['Actual Cash', 'Actual In Drawer']]),
  e('shopify_pos_cash', 'Shopify POS', 'Cash tracking sessions export (CSV)', ['Session', 'Location', 'Expected cash', 'Counted cash']),
  e('square_inventory_history', 'Square', 'Inventory > History export (CSV)', ['Date', 'Item', 'SKU', 'Location', ['Adjustment', 'Quantity'], 'Reason']),
  // Ads and affiliates
  e('google_ads_campaigns', 'Google Ads', 'Campaigns report (CSV)', ['Campaign', ['Impr.', 'Impressions'], 'Clicks', 'Cost', ['Conv. value', 'All conv. value']]),
  e('meta_ads_campaigns', 'Meta Ads Manager', 'Campaigns export (CSV)', ['Campaign name', ['Amount spent (USD)', 'Amount spent'], ['Purchases conversion value', 'Website purchases conversion value']]),
  e('affiliate_actions', 'Affiliate network (generic)', 'Actions or transactions report (CSV)', [['Action Id', 'Transaction ID', 'Trans ID'], ['Partner', 'Publisher', 'Media Partner'], ['Payout', 'Commission'], ['Sale Amount', 'Order Amount']]),

].map((x) => [x.id, x])));

/** A profile for an agent: a catalogue entry plus the agent's column map. */
export function exportProfile(key, map, extra = {}) {
  const base = EXPORTS[key];
  if (!base) throw new Error(`unknown export "${key}"`);
  return { ...base, map, ...extra };
}

export const EXPORTS_BASIS_NOTE = 'Where a layout says "checked", its column names were compared with the vendor\'s documentation on that date. The other layouts were written from knowledge of the export and were not checked. None was tested against a live account.';

/**
 * Row hook for grouped reports (QuickBooks style): a row with only its first
 * cell filled names the group for the rows under it; "Total for ..." rows end it.
 * The group name is written to `field` on each detail row.
 */
export function carryGroup(field, { groupColumn = '', isDetail } = {}) {
  return (rows) => {
    const out = []; let group = '';
    for (const r of rows) {
      const label = String(r[groupColumn] ?? '').trim();
      const detail = isDetail ? isDetail(r) : Object.entries(r).some(([k, v]) => k !== groupColumn && k !== field && String(v ?? '').trim() !== '');
      if (label && /^(grand\s+)?total\b/i.test(label)) continue;
      if (label && !detail) { group = label; continue; }
      if (!detail) continue;
      const { [groupColumn]: _drop, ...rest } = r;
      out.push({ ...rest, [field]: String(r[field] ?? '').trim() || label || group });
    }
    return out;
  };
}

/** Row hook: keep the first row for each value of `field` (Shopify repeats an order once per line item). */
export function firstRowPer(field) {
  return (rows) => { const seen = new Set(); return rows.filter((r) => { const k = String(r[field] ?? ''); if (!k || seen.has(k)) return false; seen.add(k); return true; }); };
}

/** "First Last" from two columns, for exports that split the name. */
export const fullName = (first, last) => ({ from: [first, last], compute: (_r, get) => [get(first), get(last)].map((v) => String(v ?? '').trim()).filter(Boolean).join(' ') });
