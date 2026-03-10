import { createClient } from "@supabase/supabase-js";

const supabaseUrl = "https://jkwqcncwkyskihlgojlt.supabase.co";
const supabaseKey = "sb_publishable_qtgCbkWZTOUwAWVFAtmUmg_xifp6hya";

export const supabase = createClient(supabaseUrl, supabaseKey);
