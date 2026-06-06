export interface Property {
  id: string;
  user_id: string;
  url: string;
  source: string;
  title: string | null;
  address: string | null;
  price: number | null;
  sqm: number | null;
  rooms: number | null;
  floor: string | null;
  description: string | null;
  images: string[];
  agency_name: string | null;
  scraped_at: string | null;
  created_at: string;
  updated_at: string;
  // Dati manuali aggiuntivi
  manual_notes: string | null;
  agency_commission_pct: number | null;
  asking_price_negotiated: number | null;
  // Valutazione
  ai_score: number | null;
  ai_summary: string | null;
  ai_pros: string[] | null;
  ai_cons: string[] | null;
  ai_price_assessment: string | null;
  ai_price_assessment_detail: string | null;
  ai_recommendation: string | null;
  ai_evaluated_at: string | null;
  status: 'saved' | 'evaluating' | 'evaluated' | 'archived';
}

export interface PropertyDocument {
  id: string;
  property_id: string;
  user_id: string;
  name: string;
  type: DocumentType;
  file_path: string;
  file_size: number;
  mime_type: string;
  ai_verified: boolean | null;
  ai_issues: string[] | null;
  ai_verified_at: string | null;
  created_at: string;
}

export type DocumentType =
  | 'visura_catastale'
  | 'planimetria'
  | 'ape_certificato'
  | 'rogito'
  | 'contratto_preliminare'
  | 'documento_venditore'
  | 'visura_camerale_agenzia'
  | 'altro';

export const DOCUMENT_TYPE_LABELS: Record<DocumentType, string> = {
  visura_catastale: 'Visura Catastale',
  planimetria: 'Planimetria',
  ape_certificato: 'Certificato APE',
  rogito: 'Rogito Notarile',
  contratto_preliminare: 'Contratto Preliminare',
  documento_venditore: 'Documento Venditore',
  visura_camerale_agenzia: 'Visura Camerale Agenzia',
  altro: 'Altro Documento',
};

export interface ExternalData {
  id: string;
  property_id: string;
  type: 'catasto' | 'mortgage_rates' | 'neighborhood' | 'price_history';
  data: Record<string, unknown>;
  fetched_at: string;
}

export interface MortgageSimulation {
  loan_amount: number;
  duration_years: number;
  rate_pct: number;
  monthly_payment: number;
  total_cost: number;
  total_interest: number;
}

export interface AIEvaluation {
  score: number; // 0-100
  summary: string;
  pros: string[];
  cons: string[];
  price_assessment: 'below_market' | 'fair' | 'above_market' | 'unknown';
  price_assessment_detail: string;
  document_issues: string[];
  recommendation: string;
}

export interface ScrapedPropertyData {
  url: string;
  source: string;
  title?: string;
  address?: string;
  price?: number;
  sqm?: number;
  rooms?: number;
  floor?: string;
  description?: string;
  images?: string[];
  agencyName?: string;
  scrapedAt?: string;
}
