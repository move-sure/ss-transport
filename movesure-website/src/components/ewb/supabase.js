// supabase.js - EWB specific Supabase client
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://qyrmfspbzarfjfvtcfce.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InF5cm1mc3BiemFyZmpmdnRjZmNlIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDk3MTQ3MjUsImV4cCI6MjA2NTI5MDcyNX0.djmtp0bkZEL2QZWq70q1oqYPpvkx4Lloix5ntW59vsQ';

// Create a Supabase client for EWB operations
const supabase = createClient(supabaseUrl, supabaseKey);

export default supabase;