const db = require('./db.js');
const bcrypt = require('bcryptjs');

async function createReviewer() {
  const phone = '+919999999999';
  const plainPassword = 'password';
  const hashedPassword = await bcrypt.hash(plainPassword, 10);
  
  const { data: existing } = await db.from('users').select('id').eq('phone', phone).maybeSingle();
  
  if (existing) {
    console.log('Account already exists. Updating password and wallet balance...');
    const { error } = await db.from('users').update({
      password: hashedPassword,
      walletBalance: 5000,
      name: 'Google Reviewer'
    }).eq('phone', phone);
    if (error) console.error('Error updating account:', error.message);
    else console.log('Successfully updated account!');
  } else {
    console.log('Account does not exist. Creating new account...');
    const newId = 'u' + Date.now();
    const { error } = await db.from('users').insert({
      id: newId,
      name: 'Google Reviewer',
      phone,
      password: hashedPassword,
      walletBalance: 5000
    });
    if (error) console.error('Error creating account:', error.message);
    else console.log('Successfully created account!');
  }
  process.exit(0);
}

createReviewer();
