import { createClient } from '@supabase/supabase-js'

const supabaseUrl = 'https://augislapwqypxsnnwbot.supabase.co'
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImF1Z2lzbGFwd3F5cHhzbm53Ym90Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjQ1MTY3NzgsImV4cCI6MjA4MDA5Mjc3OH0.IPug7TXM0iScJTGFDekZlSM0wR-qcV74bkEJy2tOEks'

export const supabase = createClient(supabaseUrl, supabaseAnonKey)
