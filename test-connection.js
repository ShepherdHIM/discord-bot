const { Client, GatewayIntentBits } = require('discord.js');
require('dotenv').config();

console.log('🔍 Testing Discord connection...');
console.log('Token length:', process.env.DISCORD_TOKEN ? process.env.DISCORD_TOKEN.length : 'NOT FOUND');

const client = new Client({
    intents: [GatewayIntentBits.Guilds]
});

client.once('ready', () => {
    console.log('✅ Bot connected successfully!');
    console.log(`🤖 Logged in as ${client.user.tag}`);
    console.log(`📊 Connected to ${client.guilds.cache.size} servers`);
    process.exit(0);
});

client.on('error', (error) => {
    console.error('❌ Discord client error:', error);
    process.exit(1);
});

console.log('🔄 Attempting to login...');
client.login(process.env.DISCORD_TOKEN).catch(error => {
    console.error('❌ Login failed:', error);
    console.log('📝 Error details:');
    console.log('- Code:', error.code);
    console.log('- Message:', error.message);
    process.exit(1);
});