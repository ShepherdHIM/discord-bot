const { SlashCommandBuilder, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('help')
        .setDescription('View all commands and features')
        .addStringOption(option =>
            option.setName('category')
                .setDescription('Select a specific category')
                .setRequired(false)
                .addChoices(
                    { name: 'Games', value: 'games' },
                    { name: 'Profile & Statistics', value: 'profile' },
                    { name: 'Voice Activity', value: 'voice' },
                    { name: 'Server Management', value: 'management' },
                    { name: 'General', value: 'general' }
                )),
    
    async execute(interaction) {
        console.log('Help command executed');
        
        try {
            // Respond immediately to avoid timeout
            if (!interaction.replied && !interaction.deferred) {
                const category = interaction.options?.getString('category');
                
                if (category) {
                    await this.showCategoryHelp(interaction, category);
                } else {
                    await this.showMainHelp(interaction);
                }
            }
        } catch (error) {
            console.error('Error in help command:', error);
        }
    },
    
    async showMainHelp(interaction) {
        console.log('Showing main help');
        
        const embed = new EmbedBuilder()
            .setColor('#0099ff')
            .setTitle('🤖 Bot Help - All Commands')
            .setDescription('This bot works with Turkish commands! Below are all features and commands.')
            .setThumbnail(interaction.client.user.displayAvatarURL())
            .addFields(
                {
                    name: '🎮 Game Commands', 
                    value: '`/oyunlar` - Fun games to earn XP and coins\n**7 different games**',
                    inline: true
                },
                {
                    name: '👤 Profile & Statistics',
                    value: '`/profil` - View your profile\n`/liderlik-tablosu` - Server rankings',
                    inline: true
                },
                {
                    name: '🎭 Roles & Levels',
                    value: '`/rol-yonetimi` - Manage level roles\nAutomatic role assignment',
                    inline: true
                },
                {
                    name: '🎤 Voice Activity',
                    value: '`/ses-durumu` - Active voice users\n`/ses-ayarlari` - Admin settings',
                    inline: true
                },
                {
                    name: '⚙️ Server Management',
                    value: '`/kanal-ayarla` - Announcement channels\n`/admin` - XP/Coin rate management\n`/sunucu-bilgi` - Server information',
                    inline: true
                },
                {
                    name: '🛠️ General Commands',
                    value: '`/ping` - Bot latency test\n`/bilgi-yarismasi` - Trivia game\n`/destek` - Send support message to developer\n`/help` - This help menu',
                    inline: true
                }
            )
            .addFields({
                name: '💰 XP & Coin System',
                value: '• Earn **XP** and **coins** every minute in voice channels\n• Play games to earn extra coins\n• Every 100 XP = 1 level',
                inline: false
            })
            .setFooter({ 
                text: `${interaction.guild?.name || 'Server'} • Use category buttons for details`,
                iconURL: interaction.guild?.iconURL()
            })
            .setTimestamp();
        
        // Create category buttons
        const row1 = new ActionRowBuilder()
            .addComponents(
                new ButtonBuilder()
                    .setCustomId('help_games')
                    .setLabel('Games')
                    .setEmoji('🎮')
                    .setStyle(ButtonStyle.Primary),
                new ButtonBuilder()
                    .setCustomId('help_profile')
                    .setLabel('Profile')
                    .setEmoji('👤')
                    .setStyle(ButtonStyle.Primary),
                new ButtonBuilder()
                    .setCustomId('help_voice')
                    .setLabel('Voice')
                    .setEmoji('🎤')
                    .setStyle(ButtonStyle.Primary),
                new ButtonBuilder()
                    .setCustomId('help_management')
                    .setLabel('Management')
                    .setEmoji('⚙️')
                    .setStyle(ButtonStyle.Primary),
                new ButtonBuilder()
                    .setCustomId('help_general')
                    .setLabel('General')
                    .setEmoji('🛠️')
                    .setStyle(ButtonStyle.Secondary)
            );
        
        const row2 = new ActionRowBuilder()
            .addComponents(
                new ButtonBuilder()
                    .setCustomId('help_features')
                    .setLabel('Features')
                    .setEmoji('✨')
                    .setStyle(ButtonStyle.Success),
                new ButtonBuilder()
                    .setCustomId('help_setup')
                    .setLabel('Setup')
                    .setEmoji('🚀')
                    .setStyle(ButtonStyle.Success)
            );
        
        // Respond immediately
        if (!interaction.replied && !interaction.deferred) {
            await interaction.reply({ embeds: [embed], components: [row1, row2], flags: 64 });
        }
    },
    
    async showCategoryHelp(interaction, category) {
        console.log(`Showing category help: ${category}`);
        let embed;
        
        switch (category) {
            case 'games':
                embed = this.createGamesHelp();
                break;
            case 'profile':
                embed = this.createProfileHelp();
                break;
            case 'voice':
                embed = this.createVoiceHelp();
                break;
            case 'management':
                embed = this.createManagementHelp();
                break;
            case 'general':
                embed = this.createGeneralHelp();
                break;
            case 'features':
                embed = this.createFeaturesHelp();
                break;
            case 'setup':
                embed = this.createSetupHelp();
                break;
            case 'back':
                return this.showMainHelp(interaction);
            default:
                return this.showMainHelp(interaction);
        }
        
        const backButton = new ActionRowBuilder()
            .addComponents(
                new ButtonBuilder()
                    .setCustomId('help_back')
                    .setLabel('Back to Main Menu')
                    .setEmoji('◀️')
                    .setStyle(ButtonStyle.Secondary)
            );
        
        // Respond immediately
        if (!interaction.replied && !interaction.deferred) {
            await interaction.reply({ embeds: [embed], components: [backButton], flags: 64 });
        }
    },
    
    createGamesHelp() {
        return new EmbedBuilder()
            .setColor('#FF1493')
            .setTitle('🎮 Game Commands')
            .setDescription('Play fun games to earn XP and coins!')
            .addFields(
                {
                    name: '🎯 Luck Games',
                    value: '`/oyunlar yazi-tura` - Classic heads/tails\n`/oyunlar slot` - Slot machine\n`/oyunlar zar` - Dice rolling game\n`/oyunlar rulet` - Roulette game',
                    inline: false
                },
                {
                    name: '🧠 Strategy Games',
                    value: '`/oyunlar tas-kagit-makas` - Classic game\n`/oyunlar tahmin` - Number guessing game\n`/bilgi-yarismasi` - Trivia quiz',
                    inline: false
                },
                {
                    name: '💰 Rewards & Bonuses',
                    value: '`/oyunlar gunluk` - Claim daily bonus\n`/oyunlar istatistikler` - Your game statistics',
                    inline: false
                },
                {
                    name: '🏆 Tips',
                    value: '• Don\'t forget daily bonus!\n• Higher level = more bonus\n• Choose bet amounts wisely',
                    inline: false
                }
            );
    },
    
    createProfileHelp() {
        return new EmbedBuilder()
            .setColor('#FFD700')
            .setTitle('👤 Profile & Statistics')
            .setDescription('Track your progress and see rankings!')
            .addFields(
                {
                    name: '📊 Profile Commands',
                    value: '`/profil` - View your own profile\n`/profil [@user]` - View someone else\'s profile',
                    inline: false
                },
                {
                    name: '🏆 Leaderboards',
                    value: '`/liderlik-tablosu xp` - XP rankings\n`/liderlik-tablosu coins` - Coin rankings\n`/liderlik-tablosu voice_time` - Voice time rankings',
                    inline: false
                },
                {
                    name: '📈 Level System',
                    value: '**100 XP = 1 Level**\n• Newcomers (0-4)\n• Rising (5-9)\n• Active Participants (10-19)\n• Experienced Member (20-29)\n• Legendary Master (100+)',
                    inline: false
                }
            );
    },
    
    createVoiceHelp() {
        return new EmbedBuilder()
            .setColor('#00FF00')
            .setTitle('🎤 Voice Activity')
            .setDescription('Spend time in voice channels to earn XP and coins!')
            .addFields(
                {
                    name: '📊 Status Commands',
                    value: '`/ses-durumu` - Who\'s in voice and earning rewards\n`/ses-ayarlari goster` - Current settings',
                    inline: false
                },
                {
                    name: '⚙️ Admin Settings',
                    value: '`/ses-ayarlari xp-orani` - XP per minute\n`/ses-ayarlari coin-orani` - Coins per minute\n`/ses-ayarlari minimum-uyeler` - Minimum member count',
                    inline: false
                },
                {
                    name: '💰 How to Earn Rewards',
                    value: '• Be in a voice channel\n• Not be muted\n• Not be deafened\n• Minimum member count must be met',
                    inline: false
                }
            );
    },
    
    createManagementHelp() {
        return new EmbedBuilder()
            .setColor('#8B00FF')
            .setTitle('⚙️ Server Management')
            .setDescription('Configure server settings (Admin permissions required)')
            .addFields(
                {
                    name: '👑 Admin Commands',
                    value: '`/admin xp-ver` - Give XP to user\n`/admin coin-ver` - Give coins to user\n`/admin xp-al` - Take XP from user\n`/admin coin-al` - Take coins from user\n`/admin sifirla` - Reset all statistics',
                    inline: false
                },
                {
                    name: '⚙️ **XP & Coin Rate Management**',
                    value: '`/admin xp-orani [rate]` - **Set XP per minute rate**\n`/admin coin-orani [rate]` - **Set coins per minute rate**\n`/admin oranlar-goster` - Show current rates',
                    inline: false
                },
                {
                    name: '🎭 **Level Role Management**',
                    value: '`/rol-yonetimi ekle [level] [role]` - Set role for level\n`/rol-yonetimi kaldir [level]` - Remove level role\n`/rol-yonetimi liste` - Show all level roles',
                    inline: false
                },
                {
                    name: '📊 Rate Management',
                    value: '`/oran-yonetimi goster` - Detailed rate analysis\n`/oran-yonetimi hizli-ayar` - Predefined profiles\n`/oran-yonetimi ozel-ayar` - Custom rate settings\n`/oran-yonetimi hesaplama` - Earnings calculation\n`/oran-yonetimi karsilastir` - Profile comparison',
                    inline: false
                },
                {
                    name: '📢 Channel Settings',
                    value: '`/kanal-ayarla goster` - Current settings\n`/kanal-ayarla seviye-atlamasi` - Level announcement channel\n`/kanal-ayarla hosgeldin` - Welcome channel\n`/kanal-ayarla duyurular` - Bot announcement channel',
                    inline: false
                },
                {
                    name: '🎤 Voice Activity',
                    value: '`/ses-ayarlari goster` - Current settings\n`/ses-ayarlari minimum-uyeler` - Minimum member count\n`/ses-durumu` - Active voice status',
                    inline: false
                },
                {
                    name: '📋 Info Commands',
                    value: '`/sunucu-bilgi` - Server details\n`/kullanici-bilgi [@user]` - User information',
                    inline: false
                },
                {
                    name: '🛠️ Helper Commands',
                    value: '`/soyle [message]` - Send message with bot\n`/ping` - Bot performance test',
                    inline: false
                }
            );
    },
    
    createGeneralHelp() {
        return new EmbedBuilder()
            .setColor('#00BFFF')
            .setTitle('🛠️ General Commands')
            .setDescription('Basic bot functions')
            .addFields(
                {
                    name: '🏓 Test Commands',
                    value: '`/ping` - Bot response time and latency\n`/help` - This help menu',
                    inline: false
                },
                {
                    name: '🧠 Education & Fun',
                    value: '`/bilgi-yarismasi` - Trivia questions\n`/soyle [message]` - Send message with bot',
                    inline: false
                },
                {
                    name: '📞 Support & Communication',
                    value: '`/destek [message]` - Send support message to developer\n• Your message is sent privately to the developer\n• Share your problems and suggestions',
                    inline: false
                },
                {
                    name: '📊 Info Commands',
                    value: '`/kullanici-bilgi` - User profile\n`/sunucu-bilgi` - Server statistics',
                    inline: false
                }
            );
    },
    
    createFeaturesHelp() {
        return new EmbedBuilder()
            .setColor('#32CD32')
            .setTitle('✨ Bot Features')
            .setDescription('All the amazing features this bot offers!')
            .addFields(
                {
                    name: '🎤 Voice Activity Tracking',
                    value: '• Earn XP and coins per minute\n• Automatic voice status updates\n• Minimum user count control',
                    inline: false
                },
                {
                    name: '🎮 Comprehensive Gaming System',
                    value: '• 7 different game types\n• Luck and strategy games\n• Daily bonus system\n• Detailed game statistics',
                    inline: false
                },
                {
                    name: '📈 Advanced Profile System',
                    value: '• Level-based titles\n• Interactive profile buttons\n• Detailed statistics\n• Leaderboards',
                    inline: false
                },
                {
                    name: '⚙️ Admin Tools',
                    value: '• XP/Coin rate management\n• Channel configuration\n• User statistics management\n• Server analytics',
                    inline: false
                }
            );
    },
    
    createSetupHelp() {
        return new EmbedBuilder()
            .setColor('#FF4500')
            .setTitle('🚀 Initial Setup Guide')
            .setDescription('Steps to optimize the bot on your server')
            .addFields(
                {
                    name: '1️⃣ Bot Permissions',
                    value: '• `Manage Messages` - Message management\n• `Connect` & `Speak` - Voice channel access\n• `Embed Links` - Rich content sending\n• `Use Slash Commands` - Slash command usage',
                    inline: false
                },
                {
                    name: '2️⃣ Channel Configuration',
                    value: 'Use `/kanal-ayarla` command to:\n• Set level announcement channel\n• Choose welcome message channel\n• Set bot announcement channel',
                    inline: false
                },
                {
                    name: '3️⃣ Voice Settings',
                    value: 'With `/ses-ayarlari`:\n• Set minimum user count\n• Optimize XP and coin rates\n• Define voice activity requirements',
                    inline: false
                },
                {
                    name: '4️⃣ Admin Tools',
                    value: 'With `/admin` and `/oran-yonetimi` commands:\n• Set optimal rates for your server\n• Give welcome bonus to first users\n• Monitor system performance',
                    inline: false
                },
                {
                    name: '✅ Initial Test',
                    value: '• Test bot performance with `/ping`\n• Try user system with `/profil`\n• Test reward system by joining a voice channel\n• Try gaming system with `/oyunlar`',
                    inline: false
                }
            )
            .setFooter({ text: 'Use the support channel for questions!' });
    }
};
