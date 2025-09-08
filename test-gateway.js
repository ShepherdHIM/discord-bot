const https = require('https');

console.log('🔍 Testing direct HTTPS connection to Discord Gateway...');

const options = {
  hostname: 'gateway.discord.gg',
  port: 443,
  path: '/',
  method: 'GET'
};

const req = https.request(options, (res) => {
  console.log('✅ Connection successful!');
  console.log('Status:', res.statusCode);
  console.log('Headers:', res.headers);
});

req.on('error', (e) => {
  console.error('❌ Connection failed:', e.message);
  console.log('💡 This indicates a network/firewall issue');
});

req.setTimeout(10000, () => {
  console.log('⏰ Connection timeout');
  console.log('💡 Possible causes:');
  console.log('- Windows Firewall blocking Node.js');
  console.log('- Antivirus software interference');
  console.log('- Corporate/school network restrictions');
  console.log('- ISP blocking Discord');
});

req.end();