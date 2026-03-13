import { createClient } from '@supabase/supabase-js';
import type { Property } from './types';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

// Server-side client mit Service Role Key (nur in API Routes verwenden)
export function createServiceClient() {
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
  return createClient(supabaseUrl, serviceKey);
}

// Hilfsfunktionen

export async function getProperties(filters?: {
  status?: string;
  stadtteil?: string;
}) {
  let query = supabase
    .from('properties')
    .select('*')
    .order('created_at', { ascending: false });

  if (filters?.status && filters.status !== 'all') {
    query = query.eq('status', filters.status);
  }

  if (filters?.stadtteil) {
    query = query.eq('stadtteil', filters.stadtteil);
  }

  const { data, error } = await query;
  if (error) throw error;
  return data as Property[];
}

export async function getPropertyById(id: string) {
  const { data, error } = await supabase
    .from('properties')
    .select('*')
    .eq('id', id)
    .single();

  if (error) throw error;
  return data as Property;
}

export async function updateProperty(id: string, updates: Partial<Property>) {
  const { data, error } = await supabase
    .from('properties')
    .update(updates)
    .eq('id', id)
    .select()
    .single();

  if (error) throw error;
  return data as Property;
}
