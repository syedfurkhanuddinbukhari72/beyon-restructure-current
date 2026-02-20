/**
 * Browser console test script for 24-hour filtering
 * Copy and paste this into your browser's developer console
 */

// Test the current KOT data filtering
console.log('🧪 Testing KOT 24-hour filter in browser');

// Check if KOTHelpers is available
if (typeof KOTHelpers !== 'undefined') {
  console.log('✅ KOTHelpers found');
  
  // Test with current time
  const now = new Date().toISOString();
  const testKOT = { id: 'TEST', createdAt: now };
  const isRecent = KOTHelpers.isKOTRecent(testKOT, 24);
  console.log('✅ Current time test:', isRecent ? 'PASS' : 'FAIL');
  
  // Test age function
  const age = KOTHelpers.getKOTAge(now);
  console.log('✅ Age function test:', age);
  
} else {
  console.log('❌ KOTHelpers not found - make sure you\'re on the KOT tab');
}

// Check React component state (if available)
if (typeof document !== 'undefined') {
  console.log('📊 Checking for KOT data in React components...');
  
  // Look for KOT-related elements
  const kotElements = document.querySelectorAll('[class*="kot"], [id*="kot"]');
  console.log(`Found ${kotElements.length} KOT-related elements`);
  
  // Check for order cards
  const orderCards = document.querySelectorAll('[class*="order"], [class*="KOT"]');
  console.log(`Found ${orderCards.length} order cards`);
}

console.log('🎉 Browser test completed!');
