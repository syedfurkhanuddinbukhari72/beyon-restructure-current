// KOT Button Functionality Test Script
// Run this in the browser console when on the admin-unified page with KOT tab active

console.log('🎯 Starting KOT Button Functionality Test');

// Test 1: Find buttons
const clearBtn = Array.from(document.querySelectorAll('button')).find(btn =>
  btn.textContent.includes('Clear All Data')
);
const reloadBtn = Array.from(document.querySelectorAll('button')).find(btn =>
  btn.textContent.includes('Reload Data')
);

console.log('🎯 Results:');
console.log('  Clear All Data button:', !!clearBtn);
console.log('  Reload Data button:', !!reloadBtn);

// Test 2: Check if buttons are clickable
if (clearBtn) {
  console.log('✅ Clear All Data button found');
  console.log('  - Text:', clearBtn.textContent);
  console.log('  - Disabled:', clearBtn.disabled);
  console.log('  - Visible:', clearBtn.offsetParent !== null);
} else {
  console.log('❌ Clear All Data button NOT found');
}

if (reloadBtn) {
  console.log('✅ Reload Data button found');
  console.log('  - Text:', reloadBtn.textContent);
  console.log('  - Disabled:', reloadBtn.disabled);
  console.log('  - Visible:', reloadBtn.offsetParent !== null);
} else {
  console.log('❌ Reload Data button NOT found');
}

// Test 3: Simulate button clicks (with safety checks)
if (clearBtn && !clearBtn.disabled) {
  console.log('🔘 Testing Clear All Data button click...');

  // Add event listeners to capture the function calls
  let originalOnClearKOT;
  const kotDashboard = document.querySelector('[data-testid="kot-dashboard"]') ||
                      document.querySelector('.p-6.bg-gray-50');

  if (kotDashboard) {
    // Try to find the React component instance (this is a bit hacky but works for testing)
    console.log('🔍 Found KOT dashboard element, attempting to trigger click...');

    // Simulate click
    clearBtn.click();
    console.log('✅ Clear All Data button clicked successfully');
  } else {
    console.log('⚠️ Could not find KOT dashboard element');
  }
} else {
  console.log('⚠️ Skipping Clear All Data test - button not found or disabled');
}

if (reloadBtn && !reloadBtn.disabled) {
  console.log('🔄 Testing Reload Data button click...');

  // Wait a bit before testing reload to avoid conflicts
  setTimeout(() => {
    reloadBtn.click();
    console.log('✅ Reload Data button clicked successfully');
  }, 2000);
} else {
  console.log('⚠️ Skipping Reload Data test - button not found or disabled');
}

// Test 4: Check for console logs after clicks
console.log('📋 Check the console above for any logs from the button clicks');
console.log('🔍 Look for logs like:');
console.log('  - "🔘 Clear All Data button clicked"');
console.log('  - "🧹 Clear KOT Data function called"');
console.log('  - "🔄 Reload Data button clicked"');
console.log('  - "🔄 Reload KOT Data function called"');

console.log('🎯 Test completed. Check the results above.');
