const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const db = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

async function setupBucket() {
  console.log('Creating chat-media bucket...');
  const { data, error } = await db.storage.createBucket('chat-media', { public: true });
  if (error) {
    console.error('Error (might already exist):', error.message);
  } else {
    console.log('Bucket created successfully.');
  }
}

setupBucket();
