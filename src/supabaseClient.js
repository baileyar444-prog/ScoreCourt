import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://bvuqrjazvgdibxzmupcb.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJ2dXFyamF6dmdkaWJ4em11cGNiIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzI2MTU3MjcsImV4cCI6MjA4ODE5MTcyN30.rsqfbFyuBMYzI4aMyi8OnXDozEUToIAj_Y0JoHhJeTY';

export const supabase = createClient(supabaseUrl, supabaseAnonKey);