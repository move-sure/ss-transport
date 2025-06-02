// supabase.js
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://xfzrzlnhdyzslhzurxce.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InhmenJ6bG5oZHl6c2xoenVyeGNlIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDg1NDM0NzksImV4cCI6MjA2NDExOTQ3OX0.J7NrKScuignGuko3G2GVK5LF683YnZmn_P33U7TK3yA';

// Create a single supabase client for interacting with your database
const supabase = createClient(supabaseUrl, supabaseAnonKey);

export default supabase;