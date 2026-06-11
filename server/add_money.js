const db = require('./db');

async function addMoney() {
  console.log("Checking user...");
  // First get the user to see current columns
  const { data: user, error: getErr } = await db.from('users').select('*').eq('phone', '9828858885').single();
  
  if (getErr || !user) {
    console.error("User not found or error:", getErr);
    process.exit(1);
  }
  
  console.log("User found:", user);
  
  // Update wallet
  const currentWallet = user.walletBalance || user.walletbalance || user.wallet || 0;
  const newWallet = currentWallet + 5000;
  
  // We'll try updating all common variations to be safe
  const updates = {};
  if ('walletBalance' in user) updates.walletBalance = newWallet;
  if ('walletbalance' in user) updates.walletbalance = newWallet;
  if ('wallet' in user) updates.wallet = newWallet;
  
  // If none existed, just try walletBalance
  if (Object.keys(updates).length === 0) updates.walletBalance = newWallet;

  console.log("Updating to:", updates);
  
  const { data, error } = await db.from('users').update(updates).eq('phone', '9828858885').select();
  
  if (error) {
    console.error("Failed to update wallet:", error);
  } else {
    console.log("SUCCESS! Wallet updated:", data);
  }
  
  process.exit();
}

addMoney();
