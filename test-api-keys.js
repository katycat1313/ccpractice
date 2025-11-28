// Test API Keys
console.log('\n=== API Key Test ===\n');

// Load .env.local file
const fs = require('fs');
const envFile = fs.readFileSync('.env.local', 'utf8');
const envVars = {};
envFile.split('\n').forEach(line => {
  const [key, ...valueParts] = line.split('=');
  if (key && valueParts.length > 0) {
    envVars[key.trim()] = valueParts.join('=').trim();
  }
});

console.log('1. Checking Gemini API Key...');
const geminiKey = envVars.VITE_GEMINI_API_KEY;
if (!geminiKey) {
  console.log('   ❌ VITE_GEMINI_API_KEY not found');
} else {
  console.log(`   ✅ VITE_GEMINI_API_KEY exists (${geminiKey.substring(0, 10)}...)`);
}

console.log('\n2. Checking Deepgram API Key...');
const deepgramKey = envVars.VITE_DEEPGRAM_API_KEY;
if (!deepgramKey || deepgramKey === 'your_deepgram_api_key_here') {
  console.log('   ❌ VITE_DEEPGRAM_API_KEY not configured (still has placeholder)');
  console.log('   👉 Please replace "your_deepgram_api_key_here" with your actual Deepgram API key');
} else {
  console.log(`   ✅ VITE_DEEPGRAM_API_KEY exists (${deepgramKey.substring(0, 10)}...)`);
}

console.log('\n3. Checking Supabase Config...');
const supabaseUrl = envVars.VITE_SUPABASE_URL;
const supabaseKey = envVars.VITE_SUPABASE_ANON_KEY;
if (!supabaseUrl || !supabaseKey) {
  console.log('   ❌ Supabase config missing');
} else {
  console.log(`   ✅ VITE_SUPABASE_URL: ${supabaseUrl}`);
  console.log(`   ✅ VITE_SUPABASE_ANON_KEY exists`);
}

console.log('\n=== Test Complete ===\n');

if (deepgramKey === 'your_deepgram_api_key_here') {
  console.log('⚠️  ACTION REQUIRED:');
  console.log('   Edit .env.local and replace "your_deepgram_api_key_here" with your actual key');
  console.log('   Get your key from: https://console.deepgram.com/\n');
  process.exit(1);
}
