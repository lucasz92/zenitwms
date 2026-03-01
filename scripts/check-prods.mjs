import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

const supabase = createClient(supabaseUrl, supabaseKey);

async function checkProds() {
    const { data: prods, error } = await supabase.from('products').select('code, name').limit(10);
    console.log("Supabase Error:", error);
    console.log("Supabase Top 10 Products:", prods);
    const { count } = await supabase.from('products').select('*', { count: 'exact', head: true });
    console.log("Total Products in Supabase:", count);
}

checkProds();
