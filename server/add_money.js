const db = require('./db.js');

async function addMoney() {
  const { data, error } = await db.from('users')
    .select('*')
    .eq('id', 'u1779897320693');
  
  if (error) {
    console.error('Error fetching user:', error.message);
    process.exit(1);
  }

  if (data && data.length > 0) {
    const user = data[0];
    const newBalance = Number(user.walletBalance || 0) + 5000;
    
    const { error: updateError } = await db.from('users')
      .update({ walletBalance: newBalance })
      .eq('id', user.id);
      
    if (updateError) {
      console.error('Update failed:', updateError.message);
    } else {
      console.log(`✅ Added 5000 rs to ${user.name} (${user.id}). New balance: ${newBalance}`);
    }
  } else {
    console.log('❌ User not found.');
  }
  process.exit(0);
}

addMoney();
