const { Client, GatewayIntentBits } = require('discord.js');
require('dotenv').config();

const client = new Client({
    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMessages
    ],
    // Add connection options that might help with networking issues
    ws: {
        version: 10,
        encoding: 'json'
    },
    // Set timeout options
    timeout: 30000
});

console.log('🔄 Starting simplified bot...');

client.once('ready', () => {
    console.log('✅ Bot connected successfully!');
    console.log(`🤖 Logged in as ${client.user.tag}`);
    console.log(`📊 Connected to ${client.guilds.cache.size} servers`);
    
    // Keep the bot running
    console.log('🟢 Bot is now online and ready!');
});

client.on('error', error => {
    console.error('❌ Bot error:', error);
});

// Graceful shutdown
process.on('SIGINT', () => {
    console.log('🔄 Shutting down...');
    client.destroy();
    process.exit(0);
});

// Login with better error handling
client.login(process.env.DISCORD_TOKEN).then(() => {
    console.log('🔗 Login request sent to Discord...');
}).catch(error => {
    console.error('❌ Login failed:', error.message);
    console.log('📋 Troubleshooting steps:');
    console.log('1. Run PowerShell as Administrator');
    console.log('2. Check Windows Firewall settings');
    console.log('3. Temporarily disable antivirus');
    console.log('4. Check network proxy settings');
});