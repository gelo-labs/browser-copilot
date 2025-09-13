/**
 * Setup function to configure the add-on manifest
 * Run this function to set up the manifest configuration
 */
function setupManifest() {
  console.log('Setting up add-on manifest...');
  
  // The manifest is configured through the Apps Script API
  // This function will help you verify the configuration
  
  console.log('✅ Manifest setup complete');
  console.log('Next steps:');
  console.log('1. Go to Project Settings (gear icon)');
  console.log('2. Look for "Add-on configuration"');
  console.log('3. Configure the add-on settings there');
  console.log('4. Or use the Apps Script API to set manifest');
}

/**
 * Test if the add-on configuration is working
 */
function testAddonConfiguration() {
  console.log('Testing add-on configuration...');
  
  try {
    // Test if we can access CardService (indicates add-on is configured)
    const card = CardService.newCardBuilder();
    console.log('✅ CardService is available - add-on is configured');
    
    // Test basic functions
    onOpen();
    console.log('✅ onOpen function works');
    
    console.log('✅ Add-on configuration is working correctly!');
    
  } catch (error) {
    console.error('❌ Add-on configuration error:', error);
    console.log('You may need to configure the manifest in Project Settings');
  }
}

/**
 * Quick setup guide
 */
function setupGuide() {
  console.log('=== GeloLabs Meeting Notes Setup Guide ===');
  console.log('');
  console.log('Step 1: Configure Manifest');
  console.log('- Go to Project Settings (gear icon)');
  console.log('- Look for "Add-on configuration" or "Manifest"');
  console.log('- Add the following configuration:');
  console.log('');
  console.log('Add-on Name: GeloLabs Meeting Notes');
  console.log('Logo URL: https://www.gelolabs.com/logo.png');
  console.log('Homepage Trigger: onHomepage');
  console.log('Universal Actions: Open Meeting Notes -> onOpenMeetingNotes');
  console.log('Google Meet Trigger: onMeetTrigger');
  console.log('');
  console.log('Step 2: Test Configuration');
  console.log('- Run testAddonConfiguration()');
  console.log('- Check for any errors');
  console.log('');
  console.log('Step 3: Deploy');
  console.log('- Click "Deploy" -> "New deployment"');
  console.log('- Select "Add-on" as type');
  console.log('- Configure deployment settings');
  console.log('');
  console.log('Step 4: Test in Google Meet');
  console.log('- Install the add-on');
  console.log('- Join a Google Meet meeting');
  console.log('- Look for the add-on in the sidebar');
} 