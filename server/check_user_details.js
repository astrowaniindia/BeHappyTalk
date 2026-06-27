const db = require('./db.js');

async function checkDetails() {
  const number1 = '9828858885';
  const number2 = '+919828858885';

  console.log('Searching users table...');
  const { data: users, error: userErr } = await db.from('users')
    .select('*')
    .or(`phone.eq.${number1},phone.eq.${number2}`);

  if (userErr) {
    console.error('Error fetching users:', userErr.message);
  } else {
    console.log('Users found:', users);
  }

  console.log('\nSearching providers table...');
  const { data: providers, error: provErr } = await db.from('providers')
    .select('*')
    .or(`phone.eq.${number1},phone.eq.${number2}`);

  if (provErr) {
    console.error('Error fetching providers:', provErr.message);
  } else {
    console.log('Providers found:', providers);
  }

  process.exit(0);
}

checkDetails();
