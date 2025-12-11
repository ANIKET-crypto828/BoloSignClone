export type FieldType = 'signature' | 'text' | 'image' | 'date' | 'radio';

export interface DocumentField {
  id: string;
  document_id: string;
  field_type: FieldType;
  page_number: number;
  x_percent: number;
  y_percent: number;
  width_percent: number;
  height_percent: number;
  label: string;
  required: boolean;
  created_at?: string; 
}

export interface Document {
  id: string;
  title: string;
  original_pdf_url: string;
  original_hash: string;
  file_size: number;
  page_count: number;
  created_at: string;
  created_by: string;
}

export interface SignedDocument {
  id: string;
  document_id: string;
  signed_pdf_url: string;
  signed_hash: string;
  signer_email: string;
  signer_ip: string;
  field_data: Record<string, any>;
  signed_at: string;
  created_by?: string;
}

export interface FieldValue {
  field_id: string;
  field_type: FieldType;
  value: string | boolean;
}