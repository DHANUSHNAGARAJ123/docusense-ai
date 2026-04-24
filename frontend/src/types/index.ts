export interface Document {
  id: string;
  filename: string;
  file_type: string;
  file_size: number;
  document_type: 'insurance' | 'banking' | 'invoice';
  status: 'pending' | 'processing' | 'completed' | 'needs_review' | 'failed';
  confidence: number;
  uploaded_at: string;
  processed_at?: string;
  processing_time?: number;
  total_pages?: number;
  uploaded_by?: string;
}

export interface ConfidenceScore {
  field_name: string;
  field_value: string;
  confidence_score: number;
  ocr_confidence: number;
  llm_confidence: number;
  validation_score: number;
  needs_review: boolean;
  bounding_box?: { page: number; x: number; y: number; width: number; height: number; };
}

export interface Extraction {
  id: string;
  document_id: string;
  extracted_data: Record<string, any>;
  raw_ocr_text: string;
  tables: any[];
  processing_time: number;
  model_used: string;
  confidence_scores: ConfidenceScore[];
  created_at: string;
}

export interface AuditLog {
  id: string;
  document_id: string;
  action: string;
  user: string;
  details: Record<string, any>;
  timestamp: string;
}

export interface Stats {
  total_documents: number;
  completed: number;
  needs_review: number;
  failed: number;
  avg_confidence: number;
  avg_processing_time: number;
  documents_by_type: Record<string, number>;
  accuracy_trend: Array<{ date: string; accuracy: number; count: number }>;
}