const { REST, Routes } = require('discord.js');
const fs = require('fs');
const path = require('path');
require('dotenv').config();

// Validate environment variables
function validateEnvironment() {
    const required = ['DISCORD_TOKEN', 'CLIENT_ID'];
    const missing = required.filter(key => !process.env[key]);
    
    if (missing.length > 0) {
        console.error('❌ Missing required environment variables:');
        missing.forEach(key => console.error(`   - ${key}`));
        console.error('\n💡 Please check your .env file and ensure all required variables are set.');
        process.exit(1);
    }
    
    console.log('✅ Environment variables validated');
}

// Load all command files
function loadCommands() {
    const commands = [];
    const commandsPath = path.join(__dirname, 'commands');
    
    // Get all command files
    const commandFiles = fs.readdirSync(commandsPath).filter(file => 
        file.endsWith('.js') && !file.startsWith('.')
    );
    
    // Also check admin subdirectory
    const adminPath = path.join(commandsPath, 'admin');
    let adminFiles = [];
    if (fs.existsSync(adminPath)) {
        adminFiles = fs.readdirSync(adminPath).filter(file => 
            file.endsWith('.js') && !file.startsWith('.')
        );
    }
    
    const allFiles = [...commandFiles, ...adminFiles.map(file => `admin/${file}`)];
    
    console.log(`📁 Found ${allFiles.length} command files:`);
    
    for (const file of allFiles) {
        const filePath = path.join(commandsPath, file);
        try {
            const command = require(filePath);
            
            if (command.data && typeof command.data.toJSON === 'function') {
                commands.push(command.data.toJSON());
                console.log(`   ✅ ${file}`);
            } else {
                console.warn(`   ⚠️  ${file} - Invalid command structure (missing data or toJSON method)`);
            }
        } catch (error) {
            console.error(`   ❌ ${file} - Error loading:`, error.message);
        }
    }
    
    console.log(`\n📊 Total commands loaded: ${commands.length}`);
    return commands;
}

// Deploy commands
async function deployCommands() {
    try {
        console.log('🚀 Starting command deployment...\n');
        
        // Validate environment
        validateEnvironment();
        
        // Load commands
        const commands = loadCommands();
        
        if (commands.length === 0) {
            console.error('❌ No valid commands found to deploy!');
            process.exit(1);
        }
        
        // Create REST instance
        const rest = new REST({ version: '10' }).setToken(process.env.DISCORD_TOKEN);
        
        console.log(`\n🔄 Deploying ${commands.length} commands...`);
        
        // Determine deployment target
        const guildId = process.env.GUILD_ID;
        
        if (guildId) {
            console.log(`📡 Deploying to guild: ${guildId} (instant)`);
            
            // Deploy to specific guild
            const data = await rest.put(
                Routes.applicationGuildCommands(process.env.CLIENT_ID, guildId),
                { body: commands }
            );
            
            console.log(`✅ Successfully deployed ${data.length} guild commands!`);
            console.log('⏱️  Commands are available immediately in the specified guild.');
            
        } else {
            console.log('📡 Deploying globally (may take up to 1 hour to sync)');
            
            // Deploy globally
            const data = await rest.put(
                Routes.applicationCommands(process.env.CLIENT_ID),
                { body: commands }
            );
            
            console.log(`✅ Successfully deployed ${data.length} global commands!`);
            console.log('⏱️  Global commands may take up to 1 hour to sync across all servers.');
        }
        
        console.log('\n🎉 Command deployment completed successfully!');
        
        // Show deployment summary
        console.log('\n📋 Deployment Summary:');
        console.log(`   • Commands deployed: ${commands.length}`);
        console.log(`   • Target: ${guildId ? `Guild (${guildId})` : 'Global'}`);
        console.log(`   • Bot ID: ${process.env.CLIENT_ID}`);
        
        if (guildId) {
            console.log('\n💡 Commands should be available immediately in your Discord server.');
        } else {
            console.log('\n💡 Global commands may take up to 1 hour to appear in all servers.');
            console.log('   For testing, consider using GUILD_ID in your .env file for instant deployment.');
        }
        
    } catch (error) {
        console.error('\n❌ Command deployment failed:');
        
        if (error.code === 50001) {
            console.error('   • Missing Access: Bot is not in the specified guild');
            console.error('   • Solution: Invite the bot to your server first');
        } else if (error.code === 50013) {
            console.error('   • Missing Permissions: Bot lacks required permissions');
            console.error('   • Solution: Ensure bot has "applications.commands" scope');
        } else if (error.code === 40001) {
            console.error('   • Unauthorized: Invalid bot token');
            console.error('   • Solution: Check DISCORD_TOKEN in .env file');
        } else if (error.code === 10003) {
            console.error('   • Unknown Guild: Invalid GUILD_ID');
            console.error('   • Solution: Check GUILD_ID in .env file');
        } else if (error.code === 10013) {
            console.error('   • Unknown Application: Invalid CLIENT_ID');
            console.error('   • Solution: Check CLIENT_ID in .env file');
        } else {
            console.error(`   • Error Code: ${error.code}`);
            console.error(`   • Message: ${error.message}`);
        }
        
        console.error('\n🔧 Troubleshooting:');
        console.error('   1. Verify your .env file contains valid values');
        console.error('   2. Ensure bot is invited with "applications.commands" scope');
        console.error('   3. Check bot permissions in your Discord server');
        console.error('   4. Try deploying to a guild first (set GUILD_ID)');
        
        process.exit(1);
    }
}

// Run deployment
if (require.main === module) {
    deployCommands();
}

module.exports = { deployCommands, loadCommands, validateEnvironment };