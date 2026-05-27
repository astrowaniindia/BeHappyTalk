const db = require('./db.js');

async function listUsers() {
  const { data, error } = await db.from('users').select('id, name, phone, walletBalance');
  if (error) {
    console.error('Error fetching users:', error.message);
  } else {
    console.log('All Users:', data);
  }
  process.exit(0);
}

listUsers();
