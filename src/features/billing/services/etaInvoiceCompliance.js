/**
 * Egyptian Tax Authority (ETA / الفاتورة الإلكترونية) & Regional E-Invoicing Compliance Module
 * Implements standard TLV (Tag-Length-Value) Base64 QR code encoding and Tax Registration validation.
 */

/**
 * Validates Egyptian Tax Registration Number (الرقم الضريبي الموحد)
 * Typically 9 digits: XXX-XXX-XXX or XXXXXXXXX
 * @param {string} vatNumber
 * @returns {boolean}
 */
export function validateEgyptianVatNumber(vatNumber) {
  if (!vatNumber) return false;
  const digits = String(vatNumber).replace(/\D/g, '');
  return digits.length === 9;
}

/**
 * Formats 9-digit VAT number into standard formatted string XXX-XXX-XXX
 * @param {string} vatNumber
 * @returns {string}
 */
export function formatEgyptianVatNumber(vatNumber) {
  const digits = String(vatNumber || '').replace(/\D/g, '');
  if (digits.length !== 9) return vatNumber || '';
  return `${digits.slice(0, 3)}-${digits.slice(3, 6)}-${digits.slice(6, 9)}`;
}

/**
 * Encodes a string field into a TLV (Tag-Length-Value) Buffer / Uint8Array
 * @param {number} tag - Tag index (1 to 5)
 * @param {string} value - UTF-8 string value
 * @returns {Uint8Array}
 */
function encodeTlvField(tag, value) {
  const textEncoder = new TextEncoder();
  const valueBytes = textEncoder.encode(String(value || ''));
  const tagByte = tag;
  const lengthByte = valueBytes.length;

  const tlv = new Uint8Array(2 + valueBytes.length);
  tlv[0] = tagByte;
  tlv[1] = lengthByte;
  tlv.set(valueBytes, 2);
  return tlv;
}

/**
 * Generates an ETA/ZATCA-compliant Base64-encoded TLV string for printing on invoices/receipts.
 * 
 * Fields:
 * 1. Seller / Clinic Name
 * 2. Tax Registration Number (الرقم الضريبي)
 * 3. Timestamp (ISO 8601)
 * 4. Invoice Total (including tax)
 * 5. Tax Amount
 * 
 * @param {Object} params
 * @param {string} params.sellerName - Name of clinic or doctor
 * @param {string} params.vatNumber - Egyptian Tax Registration Number
 * @param {string} params.timestamp - ISO timestamp of invoice
 * @param {number|string} params.total - Grand total in EGP
 * @param {number|string} [params.taxAmount] - Value added tax in EGP
 * @returns {string} Base64 encoded TLV string
 */
export function generateEtaTlvQrCode({ sellerName, vatNumber, timestamp, total, taxAmount = 0 }) {
  const tlvParts = [
    encodeTlvField(1, sellerName || 'عيادة تخصصية'),
    encodeTlvField(2, String(vatNumber || '000000000').replace(/\D/g, '')),
    encodeTlvField(3, timestamp || new Date().toISOString()),
    encodeTlvField(4, Number(total || 0).toFixed(2)),
    encodeTlvField(5, Number(taxAmount || 0).toFixed(2))
  ];

  const totalLength = tlvParts.reduce((acc, part) => acc + part.length, 0);
  const combined = new Uint8Array(totalLength);
  let offset = 0;
  for (const part of tlvParts) {
    combined.set(part, offset);
    offset += part.length;
  }

  let binary = '';
  for (let i = 0; i < combined.length; i++) {
    binary += String.fromCharCode(combined[i]);
  }

  if (typeof btoa === 'function') {
    return btoa(binary);
  } else if (typeof Buffer !== 'undefined') {
    return Buffer.from(combined).toString('base64');
  }
  return '';
}

/**
 * Builds compliant Egyptian invoice metadata
 * @param {Object} invoice - Invoice record
 * @param {Object} clinic - Clinic entity
 * @returns {Object} Compliant invoice presentation object
 */
export function buildCompliantInvoiceData(invoice = {}, clinic = {}) {
  const total = Number(invoice.total || invoice.totalAmount || 0);
  const vatRate = Number(clinic.vatRate || 0.14);
  const hasTax = Boolean(clinic.taxRegistered && clinic.vatNumber);
  const taxAmount = hasTax ? Math.round(total * (vatRate / (1 + vatRate)) * 100) / 100 : 0;
  const netBeforeTax = total - taxAmount;

  const qrPayload = generateEtaTlvQrCode({
    sellerName: clinic.name || invoice.clinicName || 'عيادة تخصصية',
    vatNumber: clinic.vatNumber || '000000000',
    timestamp: invoice.createdAt || new Date().toISOString(),
    total,
    taxAmount
  });

  return {
    invoiceNumber: invoice.invoiceNumber || `INV-${Date.now()}`,
    sellerName: clinic.name || 'عيادة تخصصية',
    vatNumber: formatEgyptianVatNumber(clinic.vatNumber),
    isTaxRegistered: hasTax,
    netBeforeTax,
    taxAmount,
    total,
    paidAmount: Number(invoice.paidAmount || invoice.paid || 0),
    remainingBalance: Math.max(0, total - Number(invoice.paidAmount || invoice.paid || 0)),
    qrPayload,
    issuedAt: invoice.createdAt || new Date().toISOString()
  };
}
