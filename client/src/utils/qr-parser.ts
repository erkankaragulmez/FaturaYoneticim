export interface ParsedQrData {
  customerName?: string;
  companyName?: string;
  amount?: string;
  currency?: string;
  invoiceNumber?: string;
  description?: string;
  issueDate?: string;
  dueDate?: string;
  iban?: string;
  reference?: string;
}

export interface QrParseResult {
  success: boolean;
  data?: ParsedQrData;
  format?: string;
  error?: string;
}

/**
 * Parse European EPC QR Code format
 * Format: BCD\n002\n1\nSCT\n[BIC]\n[Name]\n[IBAN]\nEUR[Amount]\n[Purpose]\n[Reference]\n[Info]
 */
function parseEpcQrCode(qrData: string): QrParseResult {
  const lines = qrData.split('\n');
  
  if (lines.length < 6 || lines[0] !== 'BCD') {
    return { success: false, error: 'Invalid EPC QR format' };
  }

  try {
    const data: ParsedQrData = {};
    
    // Parse beneficiary name (index 5)
    if (lines[5]) {
      data.customerName = lines[5].trim();
    }
    
    // Parse IBAN (index 6)
    if (lines[6]) {
      data.iban = lines[6].trim();
    }
    
    // Parse amount (index 7) - format: EUR123.45
    if (lines[7]) {
      const amountStr = lines[7].trim();
      const match = amountStr.match(/^([A-Z]{3})(.+)$/);
      if (match) {
        data.currency = match[1];
        data.amount = match[2];
      }
    }
    
    // Parse structured reference/invoice number (index 9)
    if (lines[9]) {
      data.invoiceNumber = lines[9].trim();
    }
    
    // Parse unstructured info/description (index 10)
    if (lines[10]) {
      data.description = lines[10].trim();
    }

    return { 
      success: true, 
      data, 
      format: 'EPC QR Code' 
    };
  } catch (error) {
    return { 
      success: false, 
      error: 'Failed to parse EPC QR code data' 
    };
  }
}

/**
 * Parse JSON format QR Code
 * Example: {"customer":"ABC Şirketi","amount":"1250.00","currency":"TRY","invoice":"FT-2025-001"}
 */
function parseJsonQrCode(qrData: string): QrParseResult {
  try {
    const parsed = JSON.parse(qrData);
    const data: ParsedQrData = {};

    // Map common JSON field names to our interface
    const fieldMappings = {
      customer: 'customerName',
      customerName: 'customerName', 
      name: 'customerName',
      company: 'companyName',
      companyName: 'companyName',
      amount: 'amount',
      total: 'amount',
      value: 'amount',
      currency: 'currency',
      curr: 'currency',
      invoice: 'invoiceNumber',
      invoiceNumber: 'invoiceNumber',
      invoiceNo: 'invoiceNumber',
      number: 'invoiceNumber',
      description: 'description',
      desc: 'description',
      note: 'description',
      issueDate: 'issueDate',
      date: 'issueDate',
      dueDate: 'dueDate',
      due: 'dueDate',
      reference: 'reference',
      ref: 'reference',
      iban: 'iban'
    };

    Object.entries(fieldMappings).forEach(([jsonKey, ourKey]) => {
      if (parsed[jsonKey]) {
        (data as any)[ourKey] = String(parsed[jsonKey]);
      }
    });

    return { 
      success: true, 
      data, 
      format: 'JSON QR Code' 
    };
  } catch (error) {
    return { 
      success: false, 
      error: 'Invalid JSON format' 
    };
  }
}

/**
 * Parse plain text QR Code with common patterns
 * Examples:
 * - "ABC Şirketi - 1,250.00 TL - Software Development"
 * - "Invoice: FT-2025-001, Amount: 2500 TRY, Customer: XYZ Ltd"
 */
function parseTextQrCode(qrData: string): QrParseResult {
  try {
    const data: ParsedQrData = {};

    // Pattern 1: "Customer - Amount - Description"
    const pattern1 = /^(.+?)\s*-\s*([0-9,]+\.?\d*)\s*(TL|TRY|₺|EUR|USD)?\s*-\s*(.+)$/i;
    const match1 = qrData.match(pattern1);
    
    if (match1) {
      data.customerName = match1[1].trim();
      data.amount = match1[2].replace(/,/g, '');
      data.currency = match1[3] || 'TRY';
      data.description = match1[4].trim();
      
      return { 
        success: true, 
        data, 
        format: 'Text Pattern (Customer-Amount-Description)' 
      };
    }

    // Pattern 2: Key-value pairs
    const kvPairs = qrData.split(/[,;]/).map(pair => {
      const [key, value] = pair.split(':').map(s => s.trim());
      return { key: key?.toLowerCase(), value };
    });

    kvPairs.forEach(({ key, value }) => {
      if (!key || !value) return;
      
      if (key.includes('customer') || key.includes('müşteri')) {
        data.customerName = value;
      } else if (key.includes('company') || key.includes('şirket')) {
        data.companyName = value;
      } else if (key.includes('amount') || key.includes('tutar') || key.includes('miktar')) {
        data.amount = value.replace(/[^\d.,]/g, '').replace(/,/g, '');
      } else if (key.includes('invoice') || key.includes('fatura')) {
        data.invoiceNumber = value;
      } else if (key.includes('desc') || key.includes('açıklama')) {
        data.description = value;
      }
    });

    if (Object.keys(data).length > 0) {
      return { 
        success: true, 
        data, 
        format: 'Text Pattern (Key-Value)' 
      };
    }

    // Pattern 3: Simple extraction
    const amountMatch = qrData.match(/([0-9,]+\.?\d*)\s*(TL|TRY|₺|EUR|USD)/i);
    if (amountMatch) {
      data.amount = amountMatch[1].replace(/,/g, '');
      data.currency = amountMatch[2];
    }

    const invoiceMatch = qrData.match(/(FT|INV|FAT)[.-]?\s*(\d{4}[.-]\d+)/i);
    if (invoiceMatch) {
      data.invoiceNumber = invoiceMatch[0];
    }

    if (Object.keys(data).length > 0) {
      return { 
        success: true, 
        data, 
        format: 'Text Pattern (Auto-detected)' 
      };
    }

    return { 
      success: false, 
      error: 'No recognizable pattern found in text' 
    };
  } catch (error) {
    return { 
      success: false, 
      error: 'Failed to parse text QR code' 
    };
  }
}

/**
 * Main QR code parser function
 * Attempts to parse various QR code formats
 */
export function parseQrCode(qrData: string): QrParseResult {
  if (!qrData || !qrData.trim()) {
    return { 
      success: false, 
      error: 'QR code data is empty' 
    };
  }

  const trimmedData = qrData.trim();

  // Try EPC format first
  if (trimmedData.startsWith('BCD\n')) {
    const result = parseEpcQrCode(trimmedData);
    if (result.success) return result;
  }

  // Try JSON format
  if (trimmedData.startsWith('{') && trimmedData.endsWith('}')) {
    const result = parseJsonQrCode(trimmedData);
    if (result.success) return result;
  }

  // Try array JSON format
  if (trimmedData.startsWith('[') && trimmedData.endsWith(']')) {
    try {
      const array = JSON.parse(trimmedData);
      if (array.length > 0 && typeof array[0] === 'object') {
        const result = parseJsonQrCode(JSON.stringify(array[0]));
        if (result.success) return result;
      }
    } catch (e) {
      // Continue to text parsing
    }
  }

  // Try text patterns
  const textResult = parseTextQrCode(trimmedData);
  if (textResult.success) return textResult;

  // If all else fails, return the raw data
  return {
    success: true,
    data: { description: trimmedData },
    format: 'Raw Text'
  };
}

/**
 * Convert parsed amount to proper decimal format
 * Handles Turkish format (1.250,50) and international format (1,250.50)
 */
export function formatAmount(amount: string | undefined): string {
  if (!amount) return '';
  
  // Remove any non-numeric characters except dots and commas
  const cleaned = amount.replace(/[^\d.,]/g, '');
  
  if (!cleaned) return '';
  
  // Find the last occurrence of comma or dot (this is the decimal separator)
  const lastCommaIndex = cleaned.lastIndexOf(',');
  const lastDotIndex = cleaned.lastIndexOf('.');
  
  let normalized: string;
  
  if (lastCommaIndex === -1 && lastDotIndex === -1) {
    // No decimal separator found
    normalized = cleaned;
  } else if (lastCommaIndex > lastDotIndex) {
    // Last separator is comma (Turkish format: 1.250,50)
    const integerPart = cleaned.substring(0, lastCommaIndex).replace(/[.,]/g, '');
    const decimalPart = cleaned.substring(lastCommaIndex + 1);
    normalized = integerPart + '.' + decimalPart;
  } else {
    // Last separator is dot (International format: 1,250.50 or simple 123.45)
    const beforeLastDot = cleaned.substring(0, lastDotIndex);
    const afterLastDot = cleaned.substring(lastDotIndex + 1);
    
    // If there are multiple separators before the last dot, treat it as thousands separator
    if (beforeLastDot.includes(',') || beforeLastDot.includes('.')) {
      const integerPart = beforeLastDot.replace(/[.,]/g, '');
      normalized = integerPart + '.' + afterLastDot;
    } else {
      // Simple decimal format
      normalized = beforeLastDot + '.' + afterLastDot;
    }
  }
  
  // Parse and format to 2 decimal places
  const num = parseFloat(normalized);
  return isNaN(num) ? '' : num.toFixed(2);
}

/**
 * Convert currency code to display format
 */
export function formatCurrency(currency: string | undefined): string {
  if (!currency) return 'TRY';
  
  const currencyMap: Record<string, string> = {
    'TL': 'TRY',
    '₺': 'TRY',
    'EUR': 'EUR',
    'USD': 'USD'
  };
  
  return currencyMap[currency.toUpperCase()] || currency.toUpperCase();
}

/**
 * Normalize date to YYYY-MM-DD format for HTML date inputs
 */
export function formatDate(dateString: string | undefined): string {
  if (!dateString) return '';
  
  try {
    // Try to parse the date string
    const date = new Date(dateString);
    
    // Check if date is valid
    if (isNaN(date.getTime())) {
      return '';
    }
    
    // Format as YYYY-MM-DD
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    
    return `${year}-${month}-${day}`;
  } catch (error) {
    console.warn('Failed to parse date:', dateString);
    return '';
  }
}