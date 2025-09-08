const { REST, Routes } = require('discord.js');
const fs = require('fs');
const path = require('path');
require('dotenv').config();

// Set your guild ID directly here for quick testing
const GUILD_ID = '1413475508913438773';

console.log('🔧 Bot Invite URL:');
console.log(`https://discord.com/api/oauth2/authorize?client_id=${process.env.CLIENT_ID}&permissions=414464724032&scope=bot%20applications.commands`);
console.log('📝 Make sure your bot has been invited with this URL and has the "applications.commands" scope!\n');

const commands = [];

// Load commands
const commandsPath = path.join(__dirname, 'commands');
const commandFiles = fs.readdirSync(commandsPath).filter(file => file.endsWith('.js'));

for (const file of commandFiles) {
    const command = require(`./commands/${file}`);
    if ('data' in command && 'execute' in command) {
        commands.push(command.data.toJSON());
        console.log(`✅ Loaded command: ${command.data.name}`);
    } else {
        console.log(`⚠️ Warning: The command at ${file} is missing a required "data" or "execute" property.`);
    }
}

const rest = new REST({ version: '10' }).setToken(process.env.DISCORD_TOKEN);

// Try guild deployment first, fallback to global if it fails
(async () => {
    try {
        console.log(`\n🔄 Attempting guild deployment for ${commands.length} commands...`);
        
        const data = await rest.put(
            Routes.applicationGuildCommands(process.env.CLIENT_ID, GUILD_ID),
            { body: commands },
        );

        console.log(`✅ Successfully deployed ${data.length} commands to your guild!`);
        console.log('🚀 Commands should be updated immediately in your server!');
    } catch (error) {
        console.error('❌ Guild deployment failed:', error.message);
        
        if (error.code === 50001) {
            console.log('\n💡 Missing Access Error Solutions:');
            console.log('1. Re-invite your bot using the URL shown above');
            console.log('2. Make sure the bot has "applications.commands" scope');
            console.log('3. Ensure the bot has proper server permissions');
            console.log('4. Check that the bot is actually in your server');
        }
        
        console.log('\n🔄 Falling back to global deployment...');
        try {
            const globalData = await rest.put(
                Routes.applicationCommands(process.env.CLIENT_ID),
                { body: commands },
            );
            console.log(`✅ Successfully deployed ${globalData.length} commands globally!`);
            console.log('⏰ Global commands can take up to 1 hour to appear.');
        } catch (globalError) {
            console.error('❌ Global deployment also failed:', globalError.message);
        }
    }
})();