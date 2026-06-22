import { createBrowserClient } from '@supabase/ssr'
import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL ?? ''
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? ''

const isConfigured =
  supabaseUrl.startsWith('http://') || supabaseUrl.startsWith('https://')

export const supabase = isConfigured
  ? createBrowserClient(supabaseUrl, supabaseAnonKey)
  : createBrowserClient('https://placeholder.supabase.co', 'placeholder-anon-key')

export function getSupabaseAdmin() {
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY ?? ''
  if (!isConfigured || !serviceKey || serviceKey === 'your_service_role_key_here') {
    return null
  }
  return createClient(supabaseUrl, serviceKey)
}
