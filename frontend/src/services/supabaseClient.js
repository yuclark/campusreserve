import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://btursnfyqxcvssgltsqz.supabase.co';
const supabaseKey = 'sb_publishable_TwG4ybQ7QGl-ux_2tkmiBA_wn3OZ-PX';

export const supabase = createClient(supabaseUrl, supabaseKey);
