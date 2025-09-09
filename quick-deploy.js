const { REST, Routes } = require('discord.js');
const fs = require('fs');
const path = require('path');
require('dotenv').config();

async function quickDeploy() {
    try {
        console.log('🚀 Quick Command Deployment Starting...');
        
        // Load all commands
        const commands = [];
        const commandsPath = path.join(__dirname, 'commands');
        const commandFiles = fs.readdirSync(commandsPath).filter(file => file.endsWith('.js'));

        for (const file of commandFiles) {
            const filePath = path.join(commandsPath, file);
            const command = require(filePath);
            if ('data' in command && 'execute' in command) {
                commands.push(command.data.toJSON());
                console.log(`✅ Loaded: ${command.data.name}`);
            }
        }

        // Initialize REST
        const rest = new REST({ 
            version: '10',
            timeout: 10000
        }).setToken(process.env.DISCORD_TOKEN);

        console.log(`🔄 Deploying ${commands.length} commands...`);

        // Deploy to guild first (instant)
        if (process.env.GUILD_ID) {
            console.log('📡 Deploying to guild (instant)...');
            const guildData = await rest.put(
                Routes.applicationGuildCommands(process.env.CLIENT_ID, process.env.GUILD_ID),
                { body: commands }
            );
            console.log(`✅ Guild deployment: ${guildData.length} commands`);
        }

        // Deploy globally (1 hour delay)
        console.log('🌍 Deploying globally (1 hour delay)...');
        const globalData = await rest.put(
            Routes.applicationCommands(process.env.CLIENT_ID),
            { body: commands }
        );
        console.log(`✅ Global deployment: ${globalData.length} commands`);

        console.log('🎉 Deployment completed successfully!');
        console.log('ℹ️ Guild commands: Available immediately');
        console.log('ℹ️ Global commands: Available in 1 hour');

    } catch (error) {
        console.error('❌ Deployment failed:', error.message);
        process.exit(1);
    }
}

quickDeploy();
