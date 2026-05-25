require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');
const bcrypt = require('bcryptjs');

const supabaseUrl = process.env.SUPABASE_URL || 'https://bzq96ORmECGu4HUml-j1wA.supabase.co'; // using placeholder based on the key
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseKey) {
  console.error("Missing SUPABASE_SERVICE_ROLE_KEY in .env");
  process.exit(1);
}

// We use the service_role key to bypass RLS and perform admin operations from the server
const db = createClient(supabaseUrl, supabaseKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
});

console.log('✅ Connected to Supabase PostgreSQL database.');

// Seed providers if not already present
async function seedProviders() {
  try {
    const { data: providers, error } = await db.from('providers').select('id').limit(1);
    
    if (error) {
      console.error('Error checking providers:', error.message);
      return;
    }
    
    if (!providers || providers.length === 0) {
      console.log('Seeding providers into Supabase...');
      const defaultPassword = await bcrypt.hash('password', 10);
      
      const { error: insertErr } = await db.from('providers').insert([
        { id: 'p1', name: 'Ridhi', phone: '1111111111', password: defaultPassword, verified: true, demographic: 'F · 31 yrs', rating: '4.97', reviews: '4K+', tagline: 'I was heartbroken after he left me alone.', exp: '1K+', langs: 'Hindi', status: 'online', priceChat: 10, priceCall: 20, priceVideo: 30 },
        { id: 'p2', name: 'Shruti', phone: '2222222222', password: defaultPassword, verified: true, demographic: 'F · 32 yrs', rating: '4.91', reviews: '800+', tagline: 'I felt torn by family conflict over values.', exp: '100+', langs: 'Hindi · Odia · Bengali', status: 'online', priceChat: 15, priceCall: 25, priceVideo: 40 },
        { id: 'p3', name: 'Dhvani', phone: '3333333333', password: defaultPassword, verified: true, demographic: 'F · 22 yrs', rating: '4.88', reviews: '300+', tagline: 'I suffered from depression after my breakup.', exp: '50+', langs: 'Hindi', status: 'online', priceChat: 8, priceCall: 15, priceVideo: 25 }
      ]);
      
      if (insertErr) {
        console.error('Error seeding providers:', insertErr.message);
      } else {
        console.log('✅ Providers seeded successfully.');
      }
    }
  } catch (err) {
    console.error('Seed execution error:', err);
  }
}

seedProviders();

module.exports = db;
