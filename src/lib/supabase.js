import { createClient } from '@supabase/supabase-js'

export const supabase = createClient(
    'https://sisaovjtgjgrfcubweoc.supabase.co',
    'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InNpc2Fvdmp0Z2pncmZjdWJ3ZW9jIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njg4Nzk3ODAsImV4cCI6MjA4NDQ1NTc4MH0.oMLkYBokgxPe3bo7tD5r0orSblS4F-ivv1NPQ2KmDsY'
)