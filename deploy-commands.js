const { REST, Routes } = require('discord.js');
const fs = require('fs');
const path = require('path');
require('dotenv').config();

// Load environment variables
const CLIENT_ID = process.env.CLIENT_ID;
const GUILD_ID = process.env.GUILD_ID;
const TOKEN = process.env.DISCORD_TOKEN;

// Validate environment variables
if (!CLIENT_ID) {
    console.error('❌ CLIENT_ID is missing!');
    console.error('💡 Create a .env file with: CLIENT_ID=your_bot_client_id');
    console.error('💡 Or set it as system environment variable');
    process.exit(1);
}

if (!GUILD_ID) {
    console.error('❌ GUILD_ID is missing!');
    console.error('💡 Create a .env file with: GUILD_ID=your_server_id');
    console.error('💡 Or set it as system environment variable');
    process.exit(1);
}

if (!TOKEN) {
    console.error('❌ DISCORD_TOKEN is missing!');
    console.error('💡 Create a .env file with: DISCORD_TOKEN=your_bot_token');
    console.error('💡 Or set it as system environment variable');
    process.exit(1);
}

console.log('🔍 Environment variables loaded:');
console.log(`   CLIENT_ID: ${CLIENT_ID}`);
console.log(`   GUILD_ID: ${GUILD_ID}`);
console.log(`   TOKEN: ${TOKEN.substring(0, 10)}...`);

// Create REST instance
const rest = new REST({ version: '10' }).setToken(TOKEN);



// Load command files
const commands = [];
const commandsPath = path.join(__dirname, 'commands');
const commandFiles = fs.readdirSync(commandsPath).filter(file => file.endsWith('.js'));

console.log(`\n📁 Loading ${commandFiles.length} command files...`);

for (const file of commandFiles) {
    const filePath = path.join(commandsPath, file);
    const command = require(filePath);
    
    if ('data' in command && 'execute' in command) {
        commands.push(command.data.toJSON());
        console.log(`   ✅ Loaded: ${command.data.name}`);
    } else {
        console.log(`   ⚠️  Skipped: ${file} (missing "data" or "execute" property)`);
    }
}

console.log(`\n🚀 Deploying ${commands.length} commands...`);

// Deploy commands
(async () => {
    try {
        console.log('\n🌍 Starting global command deployment...');
        
        // Deploy global commands
        const globalData = await rest.put(
            Routes.applicationCommands(CLIENT_ID),
            { body: commands }
        );
        
        console.log(`✅ Successfully deployed ${globalData.length} global commands!`);
        console.log('ℹ️  Global commands will be available in all servers within 1 hour');
        
        console.log('\n🏠 Starting guild command deployment...');
        
        // Deploy guild commands
        const guildData = await rest.put(
            Routes.applicationGuildCommands(CLIENT_ID, GUILD_ID),
            { body: commands }
        );
        
        console.log(`✅ Successfully deployed ${guildData.length} guild commands!`);
        console.log('⚡ Guild commands are available instantly in your server!');
        
        console.log('\n📊 Deployment Summary:');
        console.log(`   🌍 Global commands: ${globalData.length}`);
        console.log(`   🏠 Guild commands: ${guildData.length}`);
        console.log(`   📁 Total files processed: ${commandFiles.length}`);
        
        console.log('\n🎉 Deployment completed successfully!');
        console.log('\n💡 Tips:');
        console.log('   • Use guild commands for testing (instant updates)');
        console.log('   • Use global commands for production (1-hour delay)');
        console.log('   • Run this script whenever you add/modify commands');
        
    } catch (error) {
        console.error('\n❌ Deployment failed:', error);
        
        if (error.code === 50001) {
            console.log('\n💡 Solution: Make sure your bot has the "applications.commands" scope');
            console.log('   • Go to Discord Developer Portal → Your Bot → OAuth2 → URL Generator');
            console.log('   • Select "applications.commands" scope');
            console.log('   • Generate new invite URL and re-invite the bot');
        } else if (error.code === 50013) {
            console.log('\n💡 Solution: Check your bot permissions in the server');
            console.log('   • Make sure bot has "Use Slash Commands" permission');
            console.log('   • Check if bot is banned or restricted in the server');
        } else if (error.code === 40001) {
            console.log('\n💡 Solution: Verify your bot token is correct');
            console.log('   • Check your .env file or environment variables');
            console.log('   • Make sure token is not expired or invalid');
        } else if (error.code === 10003) {
            console.log('\n💡 Solution: Invalid Guild ID');
            console.log('   • Make sure GUILD_ID in .env matches your server ID');
            console.log('   • Right-click server name → Copy Server ID');
        } else if (error.code === 10013) {
            console.log('\n💡 Solution: Invalid Application ID');
            console.log('   • Make sure CLIENT_ID in .env matches your bot\'s Application ID');
            console.log('   • Check Discord Developer Portal → Your Bot → General Information');
        }
        
        console.log('\n🔍 Debug Information:');
        console.log(`   CLIENT_ID: ${CLIENT_ID}`);
        console.log(`   GUILD_ID: ${GUILD_ID}`);
        console.log(`   TOKEN: ${TOKEN ? TOKEN.substring(0, 10) + '...' : 'NOT SET'}`);
        
        process.exit(1);
    }
})();