const { REST, Routes } = require('discord.js');
const fs = require('fs');
const path = require('path');
require('dotenv').config();

console.log('🚀 Deploying commands...');

// Load commands
const commands = [];
const commandsPath = path.join(__dirname, 'commands');

// Get all command files
const commandFiles = fs.readdirSync(commandsPath).filter(file => file.endsWith('.js'));

console.log(`📁 Found ${commandFiles.length} command files`);

for (const file of commandFiles) {
    const filePath = path.join(commandsPath, file);
    try {
        const command = require(filePath);
        if (command.data && typeof command.data.toJSON === 'function') {
            commands.push(command.data.toJSON());
            console.log(`✅ ${file}`);
        }
    } catch (error) {
        console.error(`❌ ${file}:`, error.message);
    }
}

// Also check admin subdirectory
const adminPath = path.join(commandsPath, 'admin');
if (fs.existsSync(adminPath)) {
    const adminFiles = fs.readdirSync(adminPath).filter(file => file.endsWith('.js'));
    for (const file of adminFiles) {
        const filePath = path.join(adminPath, file);
        try {
            const command = require(filePath);
            if (command.data && typeof command.data.toJSON === 'function') {
                commands.push(command.data.toJSON());
                console.log(`✅ admin/${file}`);
            }
        } catch (error) {
            console.error(`❌ admin/${file}:`, error.message);
        }
    }
}

console.log(`\n📊 Total commands: ${commands.length}`);

// Deploy commands
const rest = new REST({ version: '10' }).setToken(process.env.DISCORD_TOKEN);

(async () => {
    try {
        console.log(`🔄 Deploying ${commands.length} commands...`);
        
        const guildId = process.env.GUILD_ID;
        
        if (guildId) {
            console.log(`📡 Deploying to guild: ${guildId}`);
            const data = await rest.put(
                Routes.applicationGuildCommands(process.env.CLIENT_ID, guildId),
                { body: commands }
            );
            console.log(`✅ Deployed ${data.length} guild commands!`);
        } else {
            console.log('📡 Deploying globally...');
            const data = await rest.put(
                Routes.applicationCommands(process.env.CLIENT_ID),
                { body: commands }
            );
            console.log(`✅ Deployed ${data.length} global commands!`);
        }
        
        console.log('🎉 Deployment complete!');
        
    } catch (error) {
        console.error('❌ Deployment failed:', error);
    }
})();
