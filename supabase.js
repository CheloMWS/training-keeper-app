import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error('Faltan las claves de Supabase en el archivo .env.local');
}

// Este objeto "supabase" es el que usaremos mañana para guardar tus entrenamientos de hockey
export const supabase = createClient(supabaseUrl, supabaseAnonKey);
