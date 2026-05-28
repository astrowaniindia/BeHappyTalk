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
        { id: 'p3', name: 'Dhvani', phone: '3333333333', password: defaultPassword, verified: true, demographic: 'F · 22 yrs', rating: '4.88', reviews: '300+', tagline: 'I suffered from depression after my breakup.', exp: '50+', langs: 'Hindi', status: 'online', priceChat: 8, priceCall: 15, priceVideo: 25 },
        { id: 'p4', name: 'Ananya', phone: '4444444444', password: defaultPassword, verified: true, demographic: 'F · 28 yrs', rating: '4.85', reviews: '500+', tagline: 'I help you find inner peace through mindfulness.', exp: '200+', langs: 'Hindi · English', status: 'online', priceChat: 12, priceCall: 22, priceVideo: 32, imagePath: 'avatars/provider4_avatar.png' },
        { id: 'p5', name: 'Aisha', phone: '5555555555', password: defaultPassword, verified: true, demographic: 'F · 27 yrs', rating: '4.80', reviews: '450+', tagline: 'Your mental health matters; I’m here to listen.', exp: '180+', langs: 'Hindi · English', status: 'online', priceChat: 11, priceCall: 21, priceVideo: 31, imagePath: 'avatars/provider5_avatar.png' },
        { id: 'p6', name: 'Mira', phone: '6666666666', password: defaultPassword, verified: true, demographic: 'F · 30 yrs', rating: '4.87', reviews: '620+', tagline: 'Guiding you through life’s challenges with empathy.', exp: '350+', langs: 'Hindi · Marathi', status: 'online', priceChat: 13, priceCall: 23, priceVideo: 33, imagePath: 'avatars/provider6_avatar.png' },
        { id: 'p7', name: 'Sanya', phone: '7777777777', password: defaultPassword, verified: true, demographic: 'F · 26 yrs', rating: '4.82', reviews: '480+', tagline: 'Empowering you to build confidence and self‑esteem.', exp: '210+', langs: 'Hindi · Punjabi', status: 'online', priceChat: 12, priceCall: 22, priceVideo: 34, imagePath: 'avatars/provider7_avatar.png' },
        { id: 'p8', name: 'Riya', phone: '8888888888', password: defaultPassword, verified: true, demographic: 'F · 29 yrs', rating: '4.90', reviews: '700+', tagline: 'A compassionate ear for relationship advice.', exp: '400+', langs: 'Hindi · English', status: 'online', priceChat: 14, priceCall: 24, priceVideo: 36, imagePath: 'avatars/provider8_avatar.png' },
        { id: 'p9', name: 'Kavya', phone: '9999999999', password: defaultPassword, verified: true, demographic: 'F · 25 yrs', rating: '4.78', reviews: '350+', tagline: 'Helping you navigate career decisions.', exp: '150+', langs: 'Hindi · English', status: 'online', priceChat: 11, priceCall: 20, priceVideo: 30, imagePath: 'avatars/provider9_avatar.png' },
        { id: 'p10', name: 'Leena', phone: '1010101010', password: defaultPassword, verified: true, demographic: 'F · 31 yrs', rating: '4.88', reviews: '620+', tagline: 'Specialist in stress management and relaxation techniques.', exp: '300+', langs: 'Hindi · English', status: 'online', priceChat: 13, priceCall: 25, priceVideo: 38, imagePath: 'avatars/provider10_avatar.png' },
        { id: 'p11', name: 'Nisha', phone: '1112223333', password: defaultPassword, verified: true, demographic: 'F · 24 yrs', rating: '4.81', reviews: '410+', tagline: 'Your partner in overcoming anxiety.', exp: '180+', langs: 'Hindi · English', status: 'online', priceChat: 12, priceCall: 22, priceVideo: 35, imagePath: 'avatars/provider11_avatar.png' },
        { id: 'p12', name: 'Prachi', phone: '2223334444', password: defaultPassword, verified: true, demographic: 'F · 28 yrs', rating: '4.84', reviews: '470+', tagline: 'Focused on holistic well‑being and life balance.', exp: '260+', langs: 'Hindi · English', status: 'online', priceChat: 13, priceCall: 23, priceVideo: 34, imagePath: 'avatars/provider12_avatar.png' },
        { id: 'p13', name: 'Tara', phone: '3334445555', password: defaultPassword, verified: true, demographic: 'F · 27 yrs', rating: '4.86', reviews: '540+', tagline: 'Empathy-driven coaching for personal growth.', exp: '320+', langs: 'Hindi · English', status: 'online', priceChat: 14, priceCall: 26, priceVideo: 39, imagePath: 'avatars/provider13_avatar.png' }
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
