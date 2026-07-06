import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

export interface ScannedDocument {
  type: 'invoice' | 'receipt' | 'purchase_order' | 'unknown';
  confidence: number;
  fields: Record<string, { value: string; confidence: number }>;
  rawText?: string;
}

@Injectable()
export class DocumentScannerService {
  private readonly logger = new Logger(DocumentScannerService.name);

  constructor(private readonly config: ConfigService) {}

  /**
   * Process a scanned document image and extract structured data.
   * In production, this would call an OCR API (Google Vision, AWS Textract, Azure Form Recognizer)
   * and then use AI/LLM to extract structured fields.
   */
  async scanDocument(imageBase64: string, hint?: string): Promise<ScannedDocument> {
    const aiUrl = this.config.get('AI_OCR_URL') || 'http://localhost:8002';

    try {
      // Call external OCR/AI service
      const response = await fetch(`${aiUrl}/scan`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ image: imageBase64, hint }),
      });

      if (response.ok) {
        return await response.json() as ScannedDocument;
      }

      this.logger.warn(`AI OCR service returned ${response.status}`);
    } catch (error: any) {
      this.logger.warn(`AI OCR service unavailable: ${error.message}`);
    }

    // In production, never return mock data; surface the failure explicitly.
    if (this.config.get('NODE_ENV') === 'production') {
      throw new Error('OCR service unavailable');
    }

    // Fallback: return mock data for development only.
    return this.getMockScanResult(hint);
  }

  /**
   * Extract invoice fields from scanned image
   */
  async scanInvoice(imageBase64: string): Promise<ScannedDocument> {
    return this.scanDocument(imageBase64, 'invoice');
  }

  /**
   * Extract receipt fields from scanned image
   */
  async scanReceipt(imageBase64: string): Promise<ScannedDocument> {
    return this.scanDocument(imageBase64, 'receipt');
  }

  /**
   * Extract purchase order fields
   */
  async scanPurchaseOrder(imageBase64: string): Promise<ScannedDocument> {
    return this.scanDocument(imageBase64, 'purchase_order');
  }

  private getMockScanResult(hint?: string): ScannedDocument {
    const mocks: Record<string, ScannedDocument> = {
      invoice: {
        type: 'invoice',
        confidence: 0.92,
        fields: {
          invoiceNumber: { value: 'INV-2024-001', confidence: 0.95 },
          date: { value: '2024-05-14', confidence: 0.98 },
          vendorName: { value: 'ABC Company', confidence: 0.88 },
          totalAmount: { value: '15,500,000', confidence: 0.94 },
          taxAmount: { value: '1,550,000', confidence: 0.90 },
          currency: { value: 'VND', confidence: 0.99 },
        },
      },
      receipt: {
        type: 'receipt',
        confidence: 0.88,
        fields: {
          merchantName: { value: 'XYZ Store', confidence: 0.92 },
          date: { value: '2024-05-14', confidence: 0.95 },
          totalAmount: { value: '350,000', confidence: 0.96 },
          items: { value: 'Product A x2, Product B x1', confidence: 0.85 },
        },
      },
      purchase_order: {
        type: 'purchase_order',
        confidence: 0.90,
        fields: {
          poNumber: { value: 'PO-2024-042', confidence: 0.94 },
          date: { value: '2024-05-14', confidence: 0.97 },
          supplierName: { value: 'DEF Supplier', confidence: 0.91 },
          totalAmount: { value: '25,000,000', confidence: 0.93 },
          deliveryDate: { value: '2024-05-21', confidence: 0.89 },
        },
      },
    };

    return mocks[hint || 'invoice'] || {
      type: 'unknown',
      confidence: 0.5,
      fields: { rawText: { value: 'Unable to recognize document', confidence: 0.5 } },
    };
  }
}