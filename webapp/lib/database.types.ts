// Tipi generati dallo schema Supabase
// Puoi rigenerare con: npx supabase gen types typescript --project-id YOUR_PROJECT_ID > lib/database.types.ts

export type Database = {
  public: {
    Tables: {
      properties: {
        Row: {
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
          manual_notes: string | null;
          agency_commission_pct: number | null;
          asking_price_negotiated: number | null;
          ai_score: number | null;
          ai_summary: string | null;
          ai_pros: string[] | null;
          ai_cons: string[] | null;
          ai_price_assessment: string | null;
          ai_price_assessment_detail: string | null;
          ai_recommendation: string | null;
          ai_evaluated_at: string | null;
          status: string;
          created_at: string;
          updated_at: string;
        };
        Insert: Omit<Database['public']['Tables']['properties']['Row'], 'id' | 'created_at' | 'updated_at'> & {
          id?: string;
          created_at?: string;
          updated_at?: string;
        };
        Update: Partial<Database['public']['Tables']['properties']['Insert']>;
      };
      property_documents: {
        Row: {
          id: string;
          property_id: string;
          user_id: string;
          name: string;
          type: string;
          file_path: string;
          file_size: number | null;
          mime_type: string | null;
          ai_verified: boolean | null;
          ai_issues: string[] | null;
          ai_verified_at: string | null;
          created_at: string;
        };
        Insert: Omit<Database['public']['Tables']['property_documents']['Row'], 'id' | 'created_at'> & {
          id?: string;
          created_at?: string;
        };
        Update: Partial<Database['public']['Tables']['property_documents']['Insert']>;
      };
      external_data: {
        Row: {
          id: string;
          property_id: string;
          type: string;
          data: Record<string, unknown>;
          fetched_at: string;
        };
        Insert: Omit<Database['public']['Tables']['external_data']['Row'], 'id' | 'fetched_at'> & {
          id?: string;
          fetched_at?: string;
        };
        Update: Partial<Database['public']['Tables']['external_data']['Insert']>;
      };
    };
  };
};
