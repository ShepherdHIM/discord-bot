const fs = require('fs');
const path = require('path');

// Server-specific settings file path
const getSettingsPath = (guildId) => path.join(__dirname, 'data', `settings_${guildId}.json`);

// Load server settings
const loadServerSettings = (guildId) => {
    const settingsPath = getSettingsPath(guildId);
    
    if (fs.existsSync(settingsPath)) {
        try {
            return JSON.parse(fs.readFileSync(settingsPath, 'utf8'));
        } catch (error) {
            console.error(`Settings dosyası okunamadı ${guildId}:`, error);
            return {};
        }
    }
    
    return {};
};

// Check if command is restricted to a specific channel
const checkChannelRestriction = (interaction, commandType) => {
    const settings = loadServerSettings(interaction.guild.id);
    const channelKey = `${commandType}Channel`;
    const restrictedChannelId = settings[channelKey];
    
    if (restrictedChannelId && interaction.channel.id !== restrictedChannelId) {
        return {
            isRestricted: true,
            message: `⛔ Bu komut sadece <#${restrictedChannelId}> kanalında kullanılabilir.`
        };
    }
    
    return { isRestricted: false };
};

module.exports = {
    loadServerSettings,
    checkChannelRestriction
};

