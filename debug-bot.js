const { Client, GatewayIntentBits } = require('discord.js');
require('dotenv').config();

const client = new Client({
    intents: [GatewayIntentBits.Guilds]
});

// Add all possible event listeners to debug
client.on('ready', () => {
    console.log('🎉 SUCCESS! Bot is online as', client.user.tag);
    process.exit(0);
});

client.on('error', error => {
    console.error('❌ Client error:', error);
});

client.on('warn', warning => {
    console.warn('⚠️ Warning:', warning);
});

client.on('debug', debug => {
    console.log('🐛 Debug:', debug);
});

process.on('unhandledRejection', (reason, promise) => {
    console.error('❌ Unhandled Rejection at:', promise, 'reason:', reason);
});

console.log('🚀 Starting bot with detailed logging...');

// Set a timeout
setTimeout(() => {
    console.log('⏰ Connection timeout after 60 seconds');
    console.log('💡 Possible solutions:');
    console.log('1. Check Windows Firewall settings');
    console.log('2. Check antivirus software');
    console.log('3. Try running as administrator');
    console.log('4. Check corporate/school network restrictions');
    process.exit(1);
}, 60000);

client.login(process.env.DISCORD_TOKEN).catch(error => {
    console.error('❌ Login error:', error);
    console.log('Error code:', error.code);
    console.log('Error message:', error.message);
    if (error.status) console.log('HTTP status:', error.status);
});