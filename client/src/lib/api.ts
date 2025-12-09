// API client for MongoDB backend
const API_URL = 'http://localhost:3001'; // Changed from 3000 to 3001 to match server.js

export interface DocumentField {
  id: string;
  document_id: string;
  field_type: 'signature' | 'text' | 'image' | 'date' | 'radio';
  page_number: number;
  x_percent: number;
  y_percent: number;
  width_percent: number;
  height_percent: number;
  label: string;
  required: boolean;
  created_at?: string;
}

export interface SignDocumentRequest {
  pdfId: string;
  fields: Array<{
    type: string;
    x: number;
    y: number;
    width: number;
    height: number;
    page: number;
    value: string | boolean;
  }>;
  pdfDimensions: {
    width: number;
    height: number;
  };
  pdfUrl?: string; // Optional PDF URL for fetching the original
}

// Get all fields for a document
export async function getDocumentFields(documentId: string): Promise<DocumentField[]> {
  const response = await fetch(`${API_URL}/fields/${documentId}`);
  if (!response.ok) throw new Error('Failed to fetch fields');
  return response.json();
}

// Get fields for a specific page
export async function getPageFields(documentId: string, pageNumber: number): Promise<DocumentField[]> {
  const response = await fetch(`${API_URL}/fields/${documentId}?page=${pageNumber}`);
  if (!response.ok) throw new Error('Failed to fetch fields');
  return response.json();
}

// Save fields for a document
export async function saveDocumentFields(
  documentId: string,
  pageNumber: number,
  fields: Omit<DocumentField, 'id' | 'created_at'>[]
): Promise<void> {
  const response = await fetch(`${API_URL}/fields/${documentId}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ pageNumber, fields }),
  });
  if (!response.ok) throw new Error('Failed to save fields');
}

// Delete a specific field
export async function deleteField(fieldId: string): Promise<void> {
  const response = await fetch(`${API_URL}/fields/delete/${fieldId}`, {
    method: 'DELETE',
  });
  if (!response.ok) throw new Error('Failed to delete field');
}

// Sign a PDF document
export async function signPDF(request: SignDocumentRequest) {
  const response = await fetch(`${API_URL}/sign-pdf`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(request),
  });
  if (!response.ok) throw new Error('Failed to sign PDF');
  return response.json();
}

// Get audit trail
export async function getAuditTrail(pdfId: string) {
  const response = await fetch(`${API_URL}/audit/${pdfId}`);
  if (!response.ok) throw new Error('Failed to fetch audit trail');
  return response.json();
}

// Health check
export async function healthCheck() {
  const response = await fetch(`${API_URL}/health`);
  if (!response.ok) throw new Error('Health check failed');
  return response.json();
}

// Proxy external PDF through backend to avoid CORS
export function getProxiedPdfUrl(externalUrl: string): string {
  return `${API_URL}/proxy-pdf?url=${encodeURIComponent(externalUrl)}`;
}

// Get base64 encoded PDF
export async function getSamplePdfBase64() {
  const response = await fetch(`${API_URL}/sample-pdf-base64`);
  if (!response.ok) throw new Error('Failed to fetch sample PDF');
  return response.json();
}