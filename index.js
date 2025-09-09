const { Client, GatewayIntentBits, Collection, Events, ActionRowBuilder, ButtonBuilder, ButtonStyle, EmbedBuilder, ActivityType, REST, Routes } = require('discord.js');
const fs = require('fs');
const path = require('path');
const VoiceActivityManager = require('./voiceManager');
const MusicPlayerManager = require('./musicPlayer');
require('dotenv').config();

// Debug: Check if environment variables are loaded
console.log('🔍 Checking environment variables...');
console.log('Token length:', process.env.DISCORD_TOKEN ? process.env.DISCORD_TOKEN.length : 'NOT FOUND');
console.log('Client ID:', process.env.CLIENT_ID || 'NOT FOUND');

// Create a new client instance
const client = new Client({
    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.MessageContent,
        GatewayIntentBits.GuildMembers,
        GatewayIntentBits.GuildVoiceStates, // Required for voice activity tracking
        GatewayIntentBits.GuildPresences, // Required for presence tracking
    ],
});

// Create a collection for commands
client.commands = new Collection();

// Initialize voice activity manager
let voiceManager;
let musicPlayer;

// Track browser login users
const browserLoginUsers = new Map(); // userId -> {guildId, lastActivity}

// Load command files
const commandsPath = path.join(__dirname, 'commands');
if (fs.existsSync(commandsPath)) {
    const commandFiles = fs.readdirSync(commandsPath).filter(file => file.endsWith('.js'));

    for (const file of commandFiles) {
        const filePath = path.join(commandsPath, file);
        const command = require(filePath);
        
        if ('data' in command && 'execute' in command) {
            client.commands.set(command.data.name, command);
            console.log(`Loaded command: ${command.data.name}`);
        } else {
            console.log(`Warning: The command at ${filePath} is missing a required "data" or "execute" property.`);
        }
    }
}

// Function to automatically deploy slash commands
async function deployCommands() {
    try {
        console.log('🔄 Auto-deploying slash commands...');
        
        // Prepare commands array
        const commands = [];
        for (const [name, command] of client.commands) {
            if ('data' in command && 'execute' in command) {
                commands.push(command.data.toJSON());
            }
        }
        
        // Initialize REST
        const rest = new REST({ version: '10' }).setToken(process.env.DISCORD_TOKEN);
        
        // Clear existing global commands first
        console.log('🧹 Clearing existing global commands...');
        await rest.put(
            Routes.applicationCommands(process.env.CLIENT_ID),
            { body: [] }
        );
        
        // Deploy new commands globally
        console.log(`🚀 Deploying ${commands.length} commands globally...`);
        const data = await rest.put(
            Routes.applicationCommands(process.env.CLIENT_ID),
            { body: commands }
        );
        
        console.log(`✅ Successfully deployed ${data.length} slash commands globally!`);
        console.log('ℹ️ Commands will be available in all servers within 1 hour');
        
    } catch (error) {
        console.error('❌ Auto-deploy failed:', error);
        console.log('ℹ️ Auto-deploy skipped or failed: Missing Access');
    }
}

// Event: Bot is ready
client.once(Events.ClientReady, async () => {
    console.log(`✅ Bot is online as ${client.user.tag}!`);
    console.log(`📊 Serving ${client.guilds.cache.size} servers`);
    
    // Auto-deploy slash commands
    await deployCommands();
    
    // Set up rotating presence
    const presenceMessages = [
        { type: 0, name: '/yardim | All commands' }, // Playing
        { type: 0, name: 'Cyberpunk 2077' }, // Playing
        { type: 2, name: 'Sagopa Kajmer ve Ceza' }, // Listening
        { type: 3, name: 'Seni izliyor...' } // Watching
    ];
    
    let presenceIndex = 0;
    const updatePresence = () => {
        const presence = presenceMessages[presenceIndex];
        client.user.setPresence({
            activities: [{
                name: presence.name,
                type: presence.type
            }],
            status: 'online'
        });
        console.log(`🔄 Updated presence to: ${presence.name} (${presence.type})`);
        presenceIndex = (presenceIndex + 1) % presenceMessages.length;
    };
    
    // Set initial presence immediately
    updatePresence();
    
    // Also set a test presence after 5 seconds to ensure it works
    setTimeout(() => {
        console.log('🧪 Testing presence update...');
        updatePresence();
    }, 5000);
    
    // Rotate presence every 10 minutes
    setInterval(updatePresence, 10 * 60 * 1000);
    
    // Initialize voice activity manager after bot is ready
    voiceManager = new VoiceActivityManager(client);
    client.voiceManager = voiceManager; // Attach to client for command access
    console.log('🎤 Voice activity tracking initialized!');
    
    // Initialize music player (guard against duplicate init)
    if (!client.musicPlayer) {
        musicPlayer = new MusicPlayerManager(client);
        client.musicPlayer = musicPlayer; // Attach to client for command access
        console.log('🎵 Music player initialized!');
    } else {
        console.log('🎵 Music player already initialized, skipping re-init');
    }
    
    // Set bot status
    client.user.setActivity('music & voice channels! 🎵🎤', { type: 'LISTENING' });
    
    // Auto-deploy slash commands to the guild if none are installed
    (async () => {
        try {
            const guildId = process.env.GUILD_ID;
            if (!guildId) return;
            
            const existing = await client.application.commands.fetch({ guildId }).catch(() => null);
            if (!existing || existing.size === 0) {
                const { REST, Routes } = require('discord.js');
                const rest = new REST({ version: '10' }).setToken(process.env.DISCORD_TOKEN);
                const body = Array.from(client.commands.values()).map(cmd => cmd.data.toJSON());
                await rest.put(Routes.applicationGuildCommands(process.env.CLIENT_ID, guildId), { body });
                console.log(`🧩 Auto-deployed ${body.length} guild commands to ${guildId}`);
            }
        } catch (e) {
            console.log('ℹ️ Auto-deploy skipped or failed:', e?.message || e);
        }
    })();
    
    // Set up periodic XP/coin awarding for browser login users (every minute)
    setInterval(() => {
        awardBrowserLoginRewards();
    }, 60 * 1000);
});

// Event: Handle slash commands
client.on(Events.InteractionCreate, async interaction => {
    if (interaction.isChatInputCommand()) {
        const command = client.commands.get(interaction.commandName);

        if (!command) {
            console.error(`❌ No command matching ${interaction.commandName} was found.`);
            return interaction.reply({ 
                content: '❌ Bu komut bulunamadı!', 
                ephemeral: true 
            }).catch(console.error);
        }

        try {
            console.log(`🔄 Executing command: ${interaction.commandName} by ${interaction.user.tag}`);
            await command.execute(interaction);
            console.log(`✅ Command executed successfully: ${interaction.commandName}`);
            
            // Track browser login activity when user interacts with bot
            trackBrowserLoginActivity(interaction.user.id, interaction.guildId);
        } catch (error) {
            console.error(`❌ Error executing ${interaction.commandName}:`, error);
            
            const errorMessage = '❌ Bu komutu çalıştırırken bir hata oluştu!';
            
            try {
                if (interaction.replied || interaction.deferred) {
                    await interaction.followUp({ content: errorMessage, ephemeral: true });
                } else {
                    await interaction.reply({ content: errorMessage, ephemeral: true });
                }
            } catch (followUpError) {
                console.error('❌ Error sending error message:', followUpError);
            }
        }
    }
    
    // Handle button interactions for profile command and games
    if (interaction.isButton()) {
        const customIdParts = interaction.customId.split('_');
        const action = customIdParts[0];
        
        try {
            // Check if interaction has expired (older than 14 minutes)
            const interactionAge = Date.now() - interaction.createdTimestamp;
            if (interactionAge > 14 * 60 * 1000) {
                console.log('Interaction too old, ignoring');
                return;
            }
            
            if (action === 'pvp') {
                // PvP button functionality has been removed
                try {
                    if (!interaction.replied && !interaction.deferred) {
                        await interaction.reply({
                            content: '❌ PvP oyunlar kaldırıldı. Diğer oyunları deneyin!',
                            flags: 64
                        });
                    }
                } catch (error) {
                    console.log('Could not respond to removed PvP interaction');
                }
                return;
            }
            
            // Handle Rock Paper Scissors game buttons
            if (action === 'rps') {
                const gamesCommand = client.commands.get('oyunlar');
                if (gamesCommand && gamesCommand.handleRPSChoice) {
                    const choice = customIdParts[customIdParts.length - 1]; // Last part is the choice
                    await gamesCommand.handleRPSChoice(interaction, choice);
                }
                return;
            }
            
            // Handle Trivia game buttons
            if (action === 'trivia') {
                const triviaCommand = client.commands.get('bilgi_yarismasi');
                if (triviaCommand && triviaCommand.handleTriviaAnswer) {
                    const isCorrect = customIdParts[customIdParts.length - 1] === 'correct';
                    await triviaCommand.handleTriviaAnswer(interaction, isCorrect);
                }
                return;
            }
            
            const [oldAction, userId] = interaction.customId.split('_');
            const action2 = oldAction;
            console.log(`🔘 Profile button clicked: ${action2} for user ${userId}`);
            
            if (action2 === 'refresh') {
                // Re-execute profile command
                const profileCommand = client.commands.get('profil');
                if (profileCommand) {
                    // Create a mock interaction for the refresh
                    const mockInteraction = {
                        ...interaction,
                        guild: interaction.guild,
                        client: client,
                        options: {
                            getUser: () => userId === interaction.user.id ? null : interaction.guild.members.cache.get(userId)?.user || { id: userId, username: 'Unknown User', displayAvatarURL: () => 'https://cdn.discordapp.com/embed/avatars/0.png' }
                        },
                        reply: (options) => {
                            if (!interaction.replied && !interaction.deferred) {
                                return interaction.update(options);
                            }
                        }
                    };
                    await profileCommand.execute(mockInteraction);
                }
            } else if (action2 === 'leaderboard') {
                // Show leaderboard
                const leaderboardCommand = client.commands.get('liderlik-tablosu');
                if (leaderboardCommand) {
                    // Defer the interaction first
                    if (!interaction.replied && !interaction.deferred) {
                        await interaction.deferReply({ ephemeral: true });
                    }
                    
                    const mockInteraction = {
                        ...interaction,
                        guild: interaction.guild,
                        client: client,
                        options: {
                            getString: () => 'xp',
                            getInteger: () => 10
                        },
                        reply: (options) => {
                            if (!interaction.replied && !interaction.deferred) {
                                return interaction.followUp({ ...options, ephemeral: true });
                            } else {
                                return interaction.editReply(options);
                            }
                        }
                    };
                    await leaderboardCommand.execute(mockInteraction);
                }
            } else if (action2 === 'compare') {
                // Implement comparison feature
                const profileCommand = client.commands.get('profil');
                if (profileCommand) {
                    try {
                        // Get current user stats
                        const currentUserStats = await client.voiceManager.getUserStats(interaction.user.id, interaction.guildId);
                        if (!currentUserStats) {
                            return interaction.reply({
                                content: '❌ Profil bilgileriniz bulunamadı!',
                                ephemeral: true
                            });
                        }
                        
                        // Get target user stats
                        const targetUserStats = await client.voiceManager.getUserStats(userId, interaction.guildId);
                        if (!targetUserStats) {
                            return interaction.reply({
                                content: '❌ Karşılaştırılacak kullanıcının profil bilgileri bulunamadı!',
                                ephemeral: true
                            });
                        }
                        
                        const currentUser = interaction.guild.members.cache.get(interaction.user.id);
                        const targetUser = interaction.guild.members.cache.get(userId);
                        
                        const embed = new EmbedBuilder()
                            .setColor('#00D4AA')
                            .setTitle('📊 İstatistik Karşılaştırması')
                            .setDescription(`**${currentUser?.displayName || interaction.user.username}** vs **${targetUser?.displayName || 'Bilinmeyen Kullanıcı'}**`)
                            .addFields(
                                {
                                    name: '🎯 Seviye',
                                    value: `**${currentUserStats.level}** vs **${targetUserStats.level}**\n${currentUserStats.level > targetUserStats.level ? '🏆 Kazandınız!' : currentUserStats.level < targetUserStats.level ? '❌ Kaybettiniz!' : '🤝 Berabere!'}`,
                                    inline: true
                                },
                                {
                                    name: '📈 XP',
                                    value: `**${currentUserStats.total_xp.toLocaleString()}** vs **${targetUserStats.total_xp.toLocaleString()}**\n${currentUserStats.total_xp > targetUserStats.total_xp ? '🏆 Kazandınız!' : currentUserStats.total_xp < targetUserStats.total_xp ? '❌ Kaybettiniz!' : '🤝 Berabere!'}`,
                                    inline: true
                                },
                                {
                                    name: '💰 Coin',
                                    value: `**${currentUserStats.coins.toLocaleString()}** vs **${targetUserStats.coins.toLocaleString()}**\n${currentUserStats.coins > targetUserStats.coins ? '🏆 Kazandınız!' : currentUserStats.coins < targetUserStats.coins ? '❌ Kaybettiniz!' : '🤝 Berabere!'}`,
                                    inline: true
                                },
                                {
                                    name: '🎤 Ses Süresi',
                                    value: `**${Math.floor(currentUserStats.voice_time_minutes / 60)}s ${currentUserStats.voice_time_minutes % 60}d** vs **${Math.floor(targetUserStats.voice_time_minutes / 60)}s ${targetUserStats.voice_time_minutes % 60}d**\n${currentUserStats.voice_time_minutes > targetUserStats.voice_time_minutes ? '🏆 Kazandınız!' : currentUserStats.voice_time_minutes < targetUserStats.voice_time_minutes ? '❌ Kaybettiniz!' : '🤝 Berabere!'}`,
                                    inline: true
                                },
                                {
                                    name: '🏆 Sıralama',
                                    value: `**#${currentUserStats.xpRank}** vs **#${targetUserStats.xpRank}**\n${currentUserStats.xpRank < targetUserStats.xpRank ? '🏆 Kazandınız!' : currentUserStats.xpRank > targetUserStats.xpRank ? '❌ Kaybettiniz!' : '🤝 Berabere!'}`,
                                    inline: true
                                },
                                {
                                    name: '📊 Genel Sonuç',
                                    value: `${currentUserStats.total_xp > targetUserStats.total_xp ? '🏆 Genel olarak daha iyisiniz!' : currentUserStats.total_xp < targetUserStats.total_xp ? '❌ Daha çok çalışmanız gerekiyor!' : '🤝 Eşit seviyedesiniz!'}`,
                                    inline: true
                                }
                            )
                            .setTimestamp();
                        
                        await interaction.reply({ embeds: [embed], ephemeral: true });
                    } catch (error) {
                        console.error('Error in comparison:', error);
                        await interaction.reply({
                            content: '❌ Karşılaştırma sırasında bir hata oluştu!',
                            ephemeral: true
                        });
                    }
                }
            } else if (action2 === 'rps') {
                // Rock Paper Scissors has been removed
                if (!interaction.replied && !interaction.deferred) {
                    await interaction.reply({
                        content: '❌ Taş Kağıt Makas oyunu kaldırıldı. Diğer oyunları deneyin!',
                        flags: 64
                    });
                }
            } else if (action2 === 'trivia') {
                // Handle Trivia game
                await client.handleTriviaAnswer(interaction);
            } else if (action2 === 'music') {
                // Handle Music controls
                await client.handleMusicControls(interaction, userId);
            } else if (action2 === 'help') {
                // Handle Help category buttons
                // Extract category from help_[category] format
                const customIdParts = interaction.customId.split('_');
                const category = customIdParts.length > 1 ? customIdParts[1] : 'genel';
                console.log(`Help button clicked: ${interaction.customId}, category: ${category}`);
                
                // Check if interaction is too old (older than 14 minutes)
                const interactionAge = Date.now() - interaction.createdTimestamp;
                if (interactionAge > 14 * 60 * 1000) {
                    console.log('Help interaction too old, ignoring');
                    return;
                }
                
                // Handle the help button click directly without calling the command again
                await client.handleHelpButtons(interaction, category);
            }

        } catch (error) {
            console.error('Error handling button interaction:', error);
            
            // Try to respond if we haven't already
            if (!interaction.replied && !interaction.deferred) {
                try {
                    await interaction.reply({
                        content: '❌ İsteğinizi işlerken bir hata oluştu.',
                        flags: 64
                    });
                } catch (responseError) {
                    console.error('Could not send error response:', responseError);
                }
            }
        }
        
        // Track browser login activity when user interacts with buttons
        trackBrowserLoginActivity(interaction.user.id, interaction.guildId);
    }
});

// Event: Handle regular messages (for prefix commands if needed)
client.on(Events.MessageCreate, message => {
    // Ignore messages from bots
    if (message.author.bot) return;
    
    // Track browser login activity when user sends messages
    trackBrowserLoginActivity(message.author.id, message.guildId);
});

// Track browser login activity
function trackBrowserLoginActivity(userId, guildId) {
    if (!userId || !guildId) return;
    
    // Update last activity time for this user
    browserLoginUsers.set(userId, {
        guildId: guildId,
        lastActivity: Date.now()
    });
    
    // Clean up old entries (older than 1 hour)
    const oneHourAgo = Date.now() - (60 * 60 * 1000);
    for (const [id, data] of browserLoginUsers.entries()) {
        if (data.lastActivity < oneHourAgo) {
            browserLoginUsers.delete(id);
        }
    }
}

// Award XP and coins to browser login users
async function awardBrowserLoginRewards() {
    if (!voiceManager) return;
    
    // Award rewards to active browser login users
    for (const [userId, data] of browserLoginUsers.entries()) {
        const { guildId, lastActivity } = data;
        
        try {
            // Get guild settings
            const guildSettings = await voiceManager.db.getGuildSettings(guildId);
            
            // Check if it's time to award XP based on interval
            const timeSinceLastXPReward = Date.now() - (data.lastXPReward || data.lastActivity || 0);
            const xpIntervalMs = (guildSettings.xp_interval_minutes || 1) * 60 * 1000;
            
            // Check if it's time to award coins based on interval
            const timeSinceLastCoinReward = Date.now() - (data.lastCoinReward || data.lastActivity || 0);
            const coinIntervalMs = (guildSettings.coin_interval_minutes || 1) * 60 * 1000;
            
            let shouldAwardXP = timeSinceLastXPReward >= xpIntervalMs;
            let shouldAwardCoins = timeSinceLastCoinReward >= coinIntervalMs;
            
            // If neither is ready, continue to next user
            if (!shouldAwardXP && !shouldAwardCoins) continue;
            
            // Get active reward ranges for this guild
            const rewardRanges = await voiceManager.db.getActiveRewardRanges(guildId);
            const xpRanges = rewardRanges.filter(range => range.reward_type === 'xp');
            const coinRanges = rewardRanges.filter(range => range.reward_type === 'coin');
            
            let earnedXP = 0;
            let earnedCoins = 0;
            
            // Award XP (at 50% rate of voice activity)
            if (shouldAwardXP) {
                if (xpRanges.length > 0) {
                    // Use random value from configured XP ranges
                    const randomRange = xpRanges[Math.floor(Math.random() * xpRanges.length)];
                    earnedXP = Math.floor(Math.random() * (randomRange.max_amount - randomRange.min_amount + 1) + randomRange.min_amount) * 0.5;
                } else {
                    // Fallback to fixed rate if no ranges configured
                    earnedXP = Math.floor(guildSettings.xp_per_minute * (guildSettings.xp_interval_minutes || 1) * 0.5);
                }
                data.lastXPReward = Date.now();
            }
            
            // Award coins (at 50% rate of voice activity)
            if (shouldAwardCoins) {
                if (coinRanges.length > 0) {
                    // Use random value from configured coin ranges
                    const randomRange = coinRanges[Math.floor(Math.random() * coinRanges.length)];
                    earnedCoins = Math.floor(Math.random() * (randomRange.max_amount - randomRange.min_amount + 1) + randomRange.min_amount) * 0.5;
                } else {
                    // Fallback to fixed rate if no ranges configured
                    earnedCoins = Math.floor(guildSettings.coins_per_minute * (guildSettings.coin_interval_minutes || 1) * 0.5);
                }
                data.lastCoinReward = Date.now();
            }
            
            // Get user stats
            const user = await voiceManager.db.getUser(userId, guildId);
            if (user) {
                const oldLevel = Math.floor(user.total_xp / 100);
                const newTotalXP = user.total_xp + earnedXP;
                const newLevel = Math.floor(newTotalXP / 100);
                
                // Update user stats
                await voiceManager.db.updateUserStats(
                    userId,
                    guildId,
                    newTotalXP,
                    user.coins + earnedCoins,
                    user.voice_time_minutes
                );
                
                // Check for level up
                if (newLevel > oldLevel) {
                    const guild = client.guilds.cache.get(guildId);
                    if (guild) {
                        const member = guild.members.cache.get(userId);
                        if (member) {
                            console.log(`🎉 User ${userId} leveled up to level ${newLevel} through browser activity`);
                            await voiceManager.handleLevelUp(member, newLevel);
                        } else {
                            console.log(`⚠️ Could not find member ${userId} in guild ${guildId} for level up`);
                        }
                    } else {
                        console.log(`⚠️ Could not find guild ${guildId} for level up`);
                    }
                }
                
                if (earnedXP > 0 || earnedCoins > 0) {
                    console.log(`💰 Browser login reward: +${earnedXP} XP, +${earnedCoins} coins to user ${userId}`);
                }
            }
        } catch (error) {
            console.error(`Error awarding browser login rewards to user ${userId}:`, error);
        }
    }
}

// Trivia answer handler
client.handleTriviaAnswer = async (interaction) => {
    const triviaCommand = client.commands.get('bilgi-yarismasi');
    if (!triviaCommand) return;
    
    const triviaData = triviaCommand.getTriviaData(interaction.user.id);
    if (!triviaData) {
        return interaction.reply({
            content: '❌ Bilgi yarışması oturumu sona erdi! Lütfen yeni bir soru başlatın.',
            ephemeral: true
        });
    }
    
    const [, answerIndex, correctness] = interaction.customId.split('_');
    const isCorrect = correctness === 'correct';
    const responseTime = Date.now() - triviaData.startTime;
    
    // Calculate rewards
    let xpGain, coinGain;
    if (isCorrect) {
        // Bonus for quick answers (under 10 seconds)
        const speedBonus = responseTime < 10000 ? 1.2 : 1;
        xpGain = Math.floor(triviaData.xpReward * speedBonus);
        coinGain = Math.floor(triviaData.coinReward * speedBonus);
    } else {
        xpGain = 5; // Participation XP
        coinGain = 0;
    }
    
    const newCoins = triviaData.userStats.coins + coinGain;
    const newXP = triviaData.userStats.total_xp + xpGain;
    
    // Update user stats
    await triviaData.voiceManager.db.updateUserStats(
        interaction.user.id,
        interaction.guildId,
        newXP,
        newCoins,
        triviaData.userStats.voice_time_minutes
    );
    
    // Create result embed
    const resultEmbed = {
        color: isCorrect ? 0x00FF00 : 0xFF6B00,
        title: isCorrect ? '✅ Doğru!' : '❌ Yanlış!',
        description: `**Cevap:** ${triviaData.question.correct_answer}`,
        fields: [
            { name: '🏆 Kazandığınız XP', value: `+${xpGain} XP`, inline: true },
            { name: '🪙 Kazandığınız Coin', value: `+${coinGain} coin`, inline: true },
            { name: '⏱️ Yanıt Süresi', value: `${(responseTime / 1000).toFixed(1)}s`, inline: true }
        ],
        footer: { 
            text: `${interaction.user.username} • ${newCoins} coin • Seviye ${Math.floor(newXP / 100)}`,
            icon_url: interaction.user.displayAvatarURL()
        },
        timestamp: new Date().toISOString()
    };
    
    if (responseTime < 10000 && isCorrect) {
        resultEmbed.fields.push({
            name: '⚡ Hız Bonusu',
            value: 'Hızlı cevap için +%20 ödül!',
            inline: false
        });
    }
    
    await interaction.update({ embeds: [resultEmbed], components: [] });
    
    // Clean up trivia data
    triviaCommand.clearTriviaData(interaction.user.id);
    
    // Track browser login activity
    trackBrowserLoginActivity(interaction.user.id, interaction.guildId);
};

// Music control handler
client.handleMusicControls = async (interaction, action) => {
    const musicPlayer = client.musicPlayer;
    if (!musicPlayer) {
        return interaction.reply({
            content: '❌ Music system is not available!',
            ephemeral: true
        });
    }
    
    // Check if user is in voice channel
    if (!interaction.member.voice.channel) {
        return interaction.reply({
            content: '🎵 You need to be in a voice channel to control music!',
            ephemeral: true
        });
    }
    
    const queue = musicPlayer.player.nodes.get(interaction.guild.id);
    
    try {
        switch (action) {
            case 'pause':
                if (!queue || !queue.node.isPlaying()) {
                    return interaction.reply({ content: '❌ No music is playing!', ephemeral: true });
                }
                
                queue.node.setPaused(!queue.node.isPaused());
                const isPaused = queue.node.isPaused();
                
                await interaction.reply({
                    content: `${isPaused ? '⏸️ Music paused' : '▶️ Music resumed'}!`,
                    ephemeral: true
                });
                break;
                
            case 'skip':
                if (!queue || !queue.node.isPlaying()) {
                    return interaction.reply({ content: '❌ No music is playing!', ephemeral: true });
                }
                
                const currentTrack = queue.currentTrack;
                queue.node.skip();
                
                await interaction.reply({
                    content: `⏭️ Skipped: **${currentTrack.title}**`,
                    ephemeral: true
                });
                break;
                
            case 'stop':
                if (!queue) {
                    return interaction.reply({ content: '❌ No music is playing!', ephemeral: true });
                }
                
                queue.delete();
                
                await interaction.reply({
                    content: '⏹️ Music stopped and queue cleared!',
                    ephemeral: true
                });
                break;
                
            case 'queue':
                // Show queue in ephemeral message
                const musicCommand = client.commands.get('music');
                if (musicCommand) {
                    const mockInteraction = {
                        ...interaction,
                        client: client,
                        options: {
                            getSubcommand: () => 'queue'
                        },
                        reply: (options) => interaction.reply({ ...options, ephemeral: true })
                    };
                    await musicCommand.execute(mockInteraction);
                }
                break;
                
            case 'shuffle':
                if (!queue || !queue.tracks.size) {
                    return interaction.reply({ content: '❌ The queue is empty!', ephemeral: true });
                }
                
                queue.tracks.shuffle();
                
                await interaction.reply({
                    content: `🔀 Shuffled ${queue.tracks.size} track${queue.tracks.size !== 1 ? 's' : ''}!`,
                    ephemeral: true
                });
                break;
                
            default:
                await interaction.reply({
                    content: '❌ Bilinmeyen müzik kontrol eylemi!',
                    ephemeral: true
                });
        }
    } catch (error) {
        console.error('Error handling music controls:', error);
        await interaction.reply({
            content: '❌ Müzik kontrolünü işlerken bir hata oluştu!',
            ephemeral: true
        });
    }
    
    // Track browser login activity
    trackBrowserLoginActivity(interaction.user.id, interaction.guildId);
};

// Help button handler
client.handleHelpButtons = async (interaction, category) => {
    
    console.log(`Handling help button for category: ${category}`);
    
    // Check if interaction is too old (older than 14 minutes)
    const interactionAge = Date.now() - interaction.createdTimestamp;
    if (interactionAge > 14 * 60 * 1000) {
        console.log('Help button interaction too old, ignoring');
        return;
    }
    
    try {
        // Check if interaction is already acknowledged
        if (interaction.replied || interaction.deferred) {
            console.log('Help interaction already acknowledged, skipping');
            return;
        }
        
        console.log(`Showing help for category: ${category}`);
        
        // Handle special categories directly
        if (category === 'ozellikler') {
            // Show features information
            const featuresEmbed = {
                color: 0x00FF7F,
                title: '✨ Bot Özellikleri',
                description: 'Bu botun sundugu tum ozellikler:',
                fields: [
                    {
                        name: '🎵 Müzik Sistemi',
                        value: '• YouTube, Spotify destegi\n• Kaliteli ses streaming\n• Playlist yönetimi\n• Interaktif kontroller',
                        inline: true
                    },
                    {
                        name: '💰 Ekonomi Sistemi',
                        value: '• XP & Coin kazanma\n• Seviye sistemi\n• Günlük bonuslar\n• Liderlik tablolari',
                        inline: true
                    },
                    {
                        name: '🎮 Oyun Sistemi',
                        value: '• 7 farkli oyun\n• Bahis sistemi\n• Istatistik takibi\n• Adil RNG sistemi',
                        inline: true
                    },
                    {
                        name: '🎤 Ses Takibi',
                        value: '• Otomatik XP kazanma\n• Aktif kullanici tespit\n• Özelleştirilebilir oranlar\n• Adil ödüllendirme',
                        inline: true
                    },
                    {
                        name: '⚙️ Yönetim Araçlari',
                        value: '• Kanal yapilandirma\n• Oran ayarlama\n• Istatistik görüntüleme\n• Otomatik duyurular',
                        inline: true
                    },
                    {
                        name: '🌐 Türkçe Destek',
                        value: '• Tam Türkçe arayüz\n• Yerel karakter destegi\n• Türkçe yardim sistemi\n• Kullanici dostu',
                        inline: true
                    }
                ],
                footer: { text: 'Sürekli güncellenen özellikler!' }
            };
            
            if (!interaction.replied && !interaction.deferred) {
                await interaction.update({ embeds: [featuresEmbed], components: [], flags: 64 });
            }
            return;
        } else if (category === 'kurulum') {
            // Show setup information
            const setupEmbed = {
                color: 0xFF4500,
                title: '🚀 Ilk Kurulum Rehberi',
                description: 'Botu sunucunuzda kullanmaya baslamak icin:',
                fields: [
                    {
                        name: '1️⃣ Yönetici Ayarlari',
                        value: '`/ses-ayarlari` komutu ile XP ve coin oranlarini ayarlayin',
                        inline: false
                    },
                    {
                        name: '2️⃣ Kanal Ayarlari',
                        value: '`/kanal-ayarla` ile duyuru kanallarini belirleyin',
                        inline: false
                    },
                    {
                        name: '3️⃣ Test Edin',
                        value: 'Ses kanalina girerek XP kazanmayi test edin',
                        inline: false
                    },
                    {
                        name: '4️⃣ Kullanicilari Bilgilendirin',
                        value: '`/yardim` komutunu paylasarak ozellikler hakkinda bilgi verin',
                        inline: false
                    }
                ],
                footer: { text: 'Sorulariniz icin yardim kanalini kullanin!' }
            };
            
            if (!interaction.replied && !interaction.deferred) {
                await interaction.update({ embeds: [setupEmbed], components: [], flags: 64 });
            }
            return;
        } else if (category === 'back') {
            // Show main help menu directly
            const embed = new EmbedBuilder()
                .setColor('#0099ff')
                .setTitle('🤖 Bot Yardim - Tum Komutlar')
                .setDescription('Bu bot Turkce komutlarla calisir! Asagida tum ozellikler ve komutlar bulunmaktadir.')
                .setThumbnail(interaction.client.user.displayAvatarURL())
                .addFields(
                    {
                        name: '🎵 Muzik Komutlari',
                        value: '`/muzik` - Muzik calmak, duraklatmak ve kontrol etmek icin\n**14 alt komut mevcut**',
                        inline: true
                    },
                    {
                        name: '🎮 Oyun Komutlari', 
                        value: '`/oyunlar` - XP ve coin kazanmak icin eglenceli oyunlar\n**7 farkli oyun**',
                        inline: true
                    },
                    {
                        name: '👤 Profil & Istatistikler',
                        value: '`/profil` - Profilinizi goruntuleyin\n`/liderlik-tablosu` - Sunucu siralamalari',
                        inline: true
                    },
                    {
                        name: '🎭 Roller & Seviyeler',
                        value: '`/rol-yonetimi` - Seviye rollerini yonetin\nOtomatik rol atamasi',
                        inline: true
                    },
                    {
                        name: '🎤 Ses Aktivitesi',
                        value: '`/ses-durumu` - Aktif ses kullanicilari\n`/ses-ayarlari` - Yonetici ayarlari',
                        inline: true
                    },
                    {
                        name: '⚙️ Sunucu Yonetimi',
                        value: '`/kanal-ayarla` - Duyuru kanallari\n`/admin` - XP/Coin oran yönetimi\n`/sunucu-bilgi` - Sunucu bilgileri',
                        inline: true
                    },
                    {
                        name: '🛠️ Genel Komutlar',
                        value: '`/ping` - Bot gecikme testi\n`/bilgi-yarismasi` - Bilgi oyunu\n`/yardim` - Bu yardim menusu',
                        inline: true
                    }
                )
                .addFields({
                    name: '💰 XP & Coin Sistemi',
                    value: '• Ses kanallarinda her dakika **XP** ve **coin** kazanin\n• Muzik dinleyerek de odul kazanin\n• Oyunlar oynayarak ekstra coin elde edin\n• Her 100 XP = 1 seviye',
                    inline: false
                })
                .setFooter({ 
                    text: `${interaction.guild?.name || 'Sunucu'} • Detaylar icin kategori butonlarini kullanin`,
                    iconURL: interaction.guild?.iconURL()
                })
                .setTimestamp();
            
            // Create category buttons
            const row1 = new ActionRowBuilder()
                .addComponents(
                    new ButtonBuilder()
                        .setCustomId('help_muzik')
                        .setLabel('Muzik')
                        .setEmoji('🎵')
                        .setStyle(ButtonStyle.Primary),
                    new ButtonBuilder()
                        .setCustomId('help_oyunlar')
                        .setLabel('Oyunlar')
                        .setEmoji('🎮')
                        .setStyle(ButtonStyle.Primary),
                    new ButtonBuilder()
                        .setCustomId('help_profil')
                        .setLabel('Profil')
                        .setEmoji('👤')
                        .setStyle(ButtonStyle.Primary),
                    new ButtonBuilder()
                        .setCustomId('help_ses')
                        .setLabel('Ses')
                        .setEmoji('🎤')
                        .setStyle(ButtonStyle.Primary),
                    new ButtonBuilder()
                        .setCustomId('help_yonetim')
                        .setLabel('Yonetim')
                        .setEmoji('⚙️')
                        .setStyle(ButtonStyle.Primary)
                );
            
            const row2 = new ActionRowBuilder()
                .addComponents(
                    new ButtonBuilder()
                        .setCustomId('help_genel')
                        .setLabel('Genel')
                        .setEmoji('🛠️')
                        .setStyle(ButtonStyle.Secondary),
                    new ButtonBuilder()
                        .setCustomId('help_ozellikler')
                        .setLabel('Ozellikler')
                        .setEmoji('✨')
                        .setStyle(ButtonStyle.Success),
                    new ButtonBuilder()
                        .setCustomId('help_kurulum')
                        .setLabel('Ilk Kurulum')
                        .setEmoji('🚀')
                        .setStyle(ButtonStyle.Success)
                );
            
            if (!interaction.replied && !interaction.deferred) {
                await interaction.update({ embeds: [embed], components: [row1, row2], flags: 64 });
            }
            return;
        }
        
        // Handle other categories by showing their specific help
        let embed;
        switch (category) {
            case 'muzik':
                embed = new EmbedBuilder()
                    .setColor('#FF6B00')
                    .setTitle('🎵 Muzik Komutlari')
                    .setDescription('YouTube ve diger platformlardan muzik cal!')
                    .addFields(
                        {
                            name: '▶️ Temel Kontroller',
                            value: '`/muzik cal [sarki]` - Sarki veya playlist cal\n`/muzik duraklat` - Duraklat/devam ettir\n`/muzik gecis` - Sonraki sarkiya gec\n`/muzik durdur` - Muzigi durdur',
                            inline: false
                        },
                        {
                            name: '📋 Sira Yonetimi',
                            value: '`/muzik sira` - Calma sirasini goster\n`/muzik temizle` - Sirayi temizle\n`/muzik karistir` - Sirayi karistir\n`/muzik cikar [pozisyon]` - Sarkiyi kaldir',
                            inline: false
                        },
                        {
                            name: '🔧 Gelismis Ozellikler',
                            value: '`/muzik ses [seviye]` - Ses seviyesi (1-100)\n`/muzik dongu [mod]` - Tekrar modu\n`/muzik simdi-calan` - Suanki sarki bilgileri\n`/muzik istatistikler` - Muzik istatistikleri',
                            inline: false
                        },
                        {
                            name: '💰 Oduller',
                            value: 'Muzik dinleyerek **dakikada 2 XP ve 1 coin** kazanin!',
                            inline: false
                        }
                    )
                    .setFooter({ text: 'Ses kanalinda olmalisiniz!' });
                break;
                
            case 'oyunlar':
                embed = new EmbedBuilder()
                    .setColor('#FF1493')
                    .setTitle('🎮 Oyun Komutlari')
                    .setDescription('Eglenceli oyunlarla XP ve coin kazanin!')
                    .addFields(
                        {
                            name: '🎯 Sans Oyunlari',
                            value: '`/oyunlar yazi-tura` - Klasik yazi tura\n`/oyunlar slot` - Slot makinesi\n`/oyunlar zar` - Zar atma oyunu\n`/oyunlar rulet` - Rulet oyunu',
                            inline: false
                        },
                        {
                            name: '🧠 Strateji Oyunlari',
                            value: '`/oyunlar tas-kagit-makas` - Klasik oyun\n`/oyunlar tahmin` - Sayi tahmin oyunu\n`/bilgi-yarismasi` - Bilgi yarismasi',
                            inline: false
                        },
                        {
                            name: '💰 Oduller & Bonuslar',
                            value: '`/oyunlar gunluk` - Gunluk bonus al\n`/oyunlar istatistikler` - Oyun istatistiklerin',
                            inline: false
                        },
                        {
                            name: '🏆 Ipuclari',
                            value: '• Gunluk bonusu unutmayin!\n• Yuksek seviyede daha fazla bonus\n• Bahis miktarini akillica secin',
                            inline: false
                        }
                    );
                break;
                
            case 'profil':
                embed = new EmbedBuilder()
                    .setColor('#FFD700')
                    .setTitle('👤 Profil & Istatistikler')
                    .setDescription('Ilerlemenizi takip edin ve siralamalari gorun!')
                    .addFields(
                        {
                            name: '📊 Profil Komutlari',
                            value: '`/profil` - Kendi profilinizi gorun\n`/profil [@kullanici]` - Baskasinin profilini gorun',
                            inline: false
                        },
                        {
                            name: '🏆 Liderlik Tablolari',
                            value: '`/liderlik-tablosu xp` - XP siralamalari\n`/liderlik-tablosu coins` - Coin siralamalari\n`/liderlik-tablosu voice_time` - Ses suresi siralamalari',
                            inline: false
                        },
                        {
                            name: '📈 Seviye Sistemi',
                            value: '**100 XP = 1 Seviye**\n• Yeni Baslayanlar (0-4)\n• Yukselenler (5-9)\n• Aktif Katilimcilar (10-19)\n• Deneyimli Uye (20-29)\n• Efsanevi Usta (100+)',
                            inline: false
                        }
                    );
                break;
                
            case 'ses':
                embed = new EmbedBuilder()
                    .setColor('#00FF00')
                    .setTitle('🎤 Ses Aktivitesi')
                    .setDescription('Ses kanallarinda vakit gecirerek XP ve coin kazanin!')
                    .addFields(
                        {
                            name: '📊 Durum Komutlari',
                            value: '`/ses-durumu` - Kim ses kanalinda ve kim odul kazaniyor\n`/ses-ayarlari goster` - Mevcut ayarlar',
                            inline: false
                        },
                        {
                            name: '⚙️ Yonetici Ayarlari',
                            value: '`/ses-ayarlari xp-orani` - Dakika basina XP\n`/ses-ayarlari coin-orani` - Dakika basina coin\n`/ses-ayarlari minimum-uyeler` - Minimum kisi sayisi',
                            inline: false
                        },
                        {
                            name: '💰 Nasil Odul Kazanilir',
                            value: '• Ses kanalinda olmak\n• Susturulmamis olmak\n• Sagirlastirilmamis olmak\n• Minimum kisi sayisi saglanmali',
                            inline: false
                        }
                    );
                break;
                
            case 'yonetim':
                embed = new EmbedBuilder()
                    .setColor('#8B00FF')
                    .setTitle('⚙️ Sunucu Yonetimi')
                    .setDescription('Sunucu ayarlarini yapilandir (Yonetici yetkisi gerekir)')
                    .addFields(
                        {
                            name: '👑 Admin Komutları',
                            value: '`/admin xp-ver` - Kullanıcıya XP ver\n`/admin coin-ver` - Kullanıcıya coin ver\n`/admin xp-al` - Kullanıcıdan XP al\n`/admin coin-al` - Kullanıcıdan coin al\n`/admin sifirla` - Tüm istatistikleri sıfırla',
                            inline: false
                        },
                        {
                            name: '⚙️ **XP & Coin Oran Yönetimi**',
                            value: '`/admin xp-orani [oran]` - **Dakika başına XP oranı ayarla**\n`/admin coin-orani [oran]` - **Dakika başına coin oranı ayarla**\n`/admin oranlar-goster` - Mevcut oranları göster',
                            inline: false
                        },
                        {
                            name: '🎭 **Seviye Rol Yönetimi**',
                            value: '`/rol-yonetimi ekle [seviye] [rol]` - Seviye için rol ayarla\n`/rol-yonetimi kaldir [seviye]` - Seviye rolünü kaldır\n`/rol-yonetimi liste` - Tüm seviye rollerini göster',
                            inline: false
                        },
                        {
                            name: '📊 Oran Yönetimi',
                            value: '`/oran-yonetimi goster` - Detaylı oran analizi\n`/oran-yonetimi hizli-ayar` - Ön tanımlı profiller\n`/oran-yonetimi ozel-ayar` - Özel oran ayarlama\n`/oran-yonetimi hesaplama` - Kazanç hesaplama\n`/oran-yonetimi karsilastir` - Profil karşılaştırma',
                            inline: false
                        },
                        {
                            name: '📢 Kanal Ayarlari',
                            value: '`/kanal-ayarla goster` - Mevcut ayarlar\n`/kanal-ayarla seviye-atlamasi` - Seviye duyuru kanali\n`/kanal-ayarla hosgeldin` - Hosgeldin kanali\n`/kanal-ayarla duyurular` - Bot duyuru kanali',
                            inline: false
                        },
                        {
                            name: '🎤 Ses Aktivitesi',
                            value: '`/ses-ayarlari goster` - Mevcut ayarlar\n`/ses-ayarlari minimum-uyeler` - Minimum kişi sayısı\n`/ses-durumu` - Aktif ses durumu',
                            inline: false
                        },
                        {
                            name: '📋 Bilgi Komutlari',
                            value: '`/sunucu-bilgi` - Sunucu detaylari\n`/kullanici-bilgi [@kullanici]` - Kullanici bilgileri',
                            inline: false
                        },
                        {
                            name: '🛠️ Yardimci Komutlar',
                            value: '`/soyle [mesaj]` - Bot ile mesaj gonder\n`/ping` - Bot performans testi',
                            inline: false
                        }
                    );
                break;
                
            case 'genel':
                embed = new EmbedBuilder()
                    .setColor('#00BFFF')
                    .setTitle('🛠️ Genel Komutlar')
                    .setDescription('Temel bot fonksiyonlari')
                    .addFields(
                        {
                            name: '🏓 Test Komutlari',
                            value: '`/ping` - Bot yanit suresi ve gecikme\n`/yardim` - Bu yardim menusu',
                            inline: false
                        },
                        {
                            name: '🧠 Egitim & Eglence',
                            value: '`/bilgi-yarismasi` - Bilgi sorulari\n`/soyle [mesaj]` - Bot ile mesaj',
                            inline: false
                        },
                        {
                            name: '📊 Bilgi Komutlari',
                            value: '`/kullanici-bilgi` - Kullanici profili\n`/sunucu-bilgi` - Sunucu istatistikleri',
                            inline: false
                        }
                    );
                break;
                
            default:
                // Show main help menu as fallback
                const defaultEmbed = new EmbedBuilder()
                    .setColor('#0099ff')
                    .setTitle('🤖 Bot Yardim - Tum Komutlar')
                    .setDescription('Bu bot Turkce komutlarla calisir! Asagida tum ozellikler ve komutlar bulunmaktadir.')
                    .setThumbnail(interaction.client.user.displayAvatarURL())
                    .addFields(
                        {
                            name: '🎵 Muzik Komutlari',
                            value: '`/muzik` - Muzik calmak, duraklatmak ve kontrol etmek icin\n**14 alt komut mevcut**',
                            inline: true
                        },
                        {
                            name: '🎮 Oyun Komutlari', 
                            value: '`/oyunlar` - XP ve coin kazanmak icin eglenceli oyunlar\n**7 farkli oyun**',
                            inline: true
                        },
                        {
                            name: '👤 Profil & Istatistikler',
                            value: '`/profil` - Profilinizi goruntuleyin\n`/liderlik-tablosu` - Sunucu siralamalari',
                            inline: true
                        },
                        {
                            name: '🎭 Roller & Seviyeler',
                            value: '`/rol-yonetimi` - Seviye rollerini yonetin\nOtomatik rol atamasi',
                            inline: true
                        },
                        {
                            name: '🎤 Ses Aktivitesi',
                            value: '`/ses-durumu` - Aktif ses kullanicilari\n`/ses-ayarlari` - Yonetici ayarlari',
                            inline: true
                        },
                        {
                            name: '⚙️ Sunucu Yonetimi',
                            value: '`/kanal-ayarla` - Duyuru kanallari\n`/admin` - XP/Coin oran yönetimi\n`/sunucu-bilgi` - Sunucu bilgileri',
                            inline: true
                        },
                        {
                            name: '🛠️ Genel Komutlar',
                            value: '`/ping` - Bot gecikme testi\n`/bilgi-yarismasi` - Bilgi oyunu\n`/yardim` - Bu yardim menusu',
                            inline: true
                        }
                    )
                    .addFields({
                        name: '💰 XP & Coin Sistemi',
                        value: '• Ses kanallarinda her dakika **XP** ve **coin** kazanin\n• Muzik dinleyerek de odul kazanin\n• Oyunlar oynayarak ekstra coin elde edin\n• Her 100 XP = 1 seviye',
                        inline: false
                    })
                    .setFooter({ 
                        text: `${interaction.guild?.name || 'Sunucu'} • Detaylar icin kategori butonlarini kullanin`,
                        iconURL: interaction.guild?.iconURL()
                    })
                    .setTimestamp();
                
                // Create category buttons
                const defaultRow1 = new ActionRowBuilder()
                    .addComponents(
                        new ButtonBuilder()
                            .setCustomId('help_muzik')
                            .setLabel('Muzik')
                            .setEmoji('🎵')
                            .setStyle(ButtonStyle.Primary),
                        new ButtonBuilder()
                            .setCustomId('help_oyunlar')
                            .setLabel('Oyunlar')
                            .setEmoji('🎮')
                            .setStyle(ButtonStyle.Primary),
                        new ButtonBuilder()
                            .setCustomId('help_profil')
                            .setLabel('Profil')
                            .setEmoji('👤')
                            .setStyle(ButtonStyle.Primary),
                        new ButtonBuilder()
                            .setCustomId('help_ses')
                            .setLabel('Ses')
                            .setEmoji('🎤')
                            .setStyle(ButtonStyle.Primary),
                        new ButtonBuilder()
                            .setCustomId('help_yonetim')
                            .setLabel('Yonetim')
                            .setEmoji('⚙️')
                            .setStyle(ButtonStyle.Primary)
                    );
                
                const defaultRow2 = new ActionRowBuilder()
                    .addComponents(
                        new ButtonBuilder()
                            .setCustomId('help_genel')
                            .setLabel('Genel')
                            .setEmoji('🛠️')
                            .setStyle(ButtonStyle.Secondary),
                        new ButtonBuilder()
                            .setCustomId('help_ozellikler')
                            .setLabel('Ozellikler')
                            .setEmoji('✨')
                            .setStyle(ButtonStyle.Success),
                        new ButtonBuilder()
                            .setCustomId('help_kurulum')
                            .setLabel('Ilk Kurulum')
                            .setEmoji('🚀')
                            .setStyle(ButtonStyle.Success)
                    );
                
                if (!interaction.replied && !interaction.deferred) {
                    await interaction.update({ embeds: [defaultEmbed], components: [defaultRow1, defaultRow2], flags: 64 });
                }
                return;
        }
        
        // Add back button for category views
        const backButton = new ActionRowBuilder()
            .addComponents(
                new ButtonBuilder()
                    .setCustomId('help_back')
                    .setLabel('Ana Menuye Don')
                    .setEmoji('◀️')
                    .setStyle(ButtonStyle.Secondary)
            );
        
        if (!interaction.replied && !interaction.deferred) {
            await interaction.update({ embeds: [embed], components: [backButton], flags: 64 });
        }
    } catch (error) {
        console.error('Error handling help buttons:', error);
        
        // Only try to respond if we haven't already
        if (!interaction.replied && !interaction.deferred) {
            try {
                await interaction.reply({
                    content: '❌ Yardım menüsü yüklenirken hata oluştu!',
                    flags: 64
                });
            } catch (replyError) {
                console.error('Could not send error response:', replyError);
            }
        }
    }
};

// Event: Voice state changes (join/leave/mute/deafen)
client.on(Events.VoiceStateUpdate, (oldState, newState) => {
    if (!voiceManager) return; // Voice manager not initialized yet
    
    const oldChannelId = oldState.channelId;
    const newChannelId = newState.channelId;
    
    // User joined a voice channel
    if (!oldChannelId && newChannelId) {
        voiceManager.handleVoiceJoin(oldState, newState);
    }
    // User left a voice channel
    else if (oldChannelId && !newChannelId) {
        voiceManager.handleVoiceLeave(oldState, newState);
    }
    // User switched channels
    else if (oldChannelId && newChannelId && oldChannelId !== newChannelId) {
        voiceManager.handleVoiceLeave(oldState, newState);
        voiceManager.handleVoiceJoin(oldState, newState);
    }
    // User updated voice state (mute/deafen/etc.)
    else if (oldChannelId && newChannelId) {
        voiceManager.handleVoiceUpdate(oldState, newState);
    }
});

// Event: New member joins
client.on(Events.GuildMemberAdd, async member => {
    console.log(`👋 ${member.user.tag} joined ${member.guild.name}`);
    
    try {
        // Initialize new member with level 1 and 0 XP
        await client.voiceManager?.db.updateUserStats(member.user.id, member.guild.id, 0, 0, 0);
        console.log(`📊 Initialized ${member.user.tag} with level 1, 0 XP`);
        
        // Check for starting role (level 1 role) and assign it
        const levelRoles = await client.voiceManager?.db.getLevelRoles(member.guild.id);
        const startingRole = levelRoles?.find(role => role.level === 1);
        
        if (startingRole) {
            try {
                const role = member.guild.roles.cache.get(startingRole.role_id);
                if (role) {
                    await member.roles.add(role);
                    console.log(`✅ Assigned starting role "${role.name}" to ${member.user.tag}`);
                } else {
                    console.log(`⚠️ Starting role ID ${startingRole.role_id} not found in guild`);
                }
            } catch (error) {
                console.log(`❌ Failed to assign starting role to ${member.user.tag}:`, error.message);
            }
        } else {
            console.log(`ℹ️ No starting role configured for level 1 in ${member.guild.name}`);
        }
        
        // Get guild settings to check for configured welcome channel
        const guildSettings = await client.voiceManager?.db.getGuildSettings(member.guild.id);
        let channel = null;
        
        // First, try to use channel settings from /kanal_ayarla command
        const settingsPath = path.join(__dirname, 'data', `settings_${member.guild.id}.json`);
        if (fs.existsSync(settingsPath)) {
            try {
                const channelSettings = JSON.parse(fs.readFileSync(settingsPath, 'utf8'));
                if (channelSettings.hosgeldinChannel) {
                    channel = member.guild.channels.cache.get(channelSettings.hosgeldinChannel);
                    console.log(`📢 Using configured welcome channel: ${channel?.name || 'NOT FOUND'} (ID: ${channelSettings.hosgeldinChannel})`);
                }
            } catch (error) {
                console.error('Error reading channel settings:', error);
            }
        }
        
        // Fallback to voice manager database settings
        if (!channel && guildSettings?.welcome_channel_id) {
            channel = member.guild.channels.cache.get(guildSettings.welcome_channel_id);
        }
        
        // Fallback to automatic channel detection
        if (!channel) {
            channel = member.guild.channels.cache.find(ch => 
                ch.isTextBased() &&
                (ch.name === 'general' || 
                 ch.name === 'welcome' || 
                 ch.name.includes('general') ||
                 ch.name.includes('welcome'))
            );
        }
        
        if (channel) {
            const embed = {
                color: 0x00FF00,
                title: '🎉 Sunucuya Hoş Geldiniz!',
                description: `Hoş geldin ${member}! Sizi burada görmekten mutluyuz!`,
                thumbnail: {
                    url: member.user.displayAvatarURL({ dynamic: true })
                },
                fields: [
                    {
                        name: '🎯 Başlangıç Durumu',
                        value: 'Seviye 1 ile başladınız! Ses kanallarında zaman geçirerek XP kazanabilirsiniz.',
                        inline: false
                    },
                    {
                        name: '🎤 XP ve Coin Kazan',
                        value: 'XP ve coin kazanmaya başlamak için ses kanallarına katılın!',
                        inline: false
                    },
                    {
                        name: '📈 İlerlemeyi Kontrol Et',
                        value: 'İstatistiklerinizi görmek için `/profil` ve sıralamaları görmek için `/liderlik-tablosu` kullanın!',
                        inline: false
                    }
                ],
                footer: {
                    text: `Üye #${member.guild.memberCount}`
                },
                timestamp: new Date().toISOString()
            };
            
            await channel.send({ embeds: [embed] });
        }
    } catch (error) {
        console.error('Error sending welcome message:', error);
    }
});

// Event: Error handling
client.on(Events.Error, error => {
    console.error('Discord client error:', error);
});

// Process error handling
process.on('unhandledRejection', error => {
    console.error('Unhandled promise rejection:', error);
});

// Graceful shutdown
process.on('SIGINT', () => {
    console.log('\n🚫 Shutting down gracefully...');
    if (voiceManager) {
        voiceManager.cleanup();
    }
    client.destroy();
    process.exit(0);
});

process.on('SIGTERM', () => {
    console.log('\n🚫 Shutting down gracefully...');
    if (voiceManager) {
        voiceManager.cleanup();
    }
    client.destroy();
    process.exit(0);
});

// Login to Discord with your app's token
console.log('🔄 Attempting to login to Discord...');

// Add a timeout to detect hanging connections
const loginTimeout = setTimeout(() => {
    console.error('⚠️ Login timeout - connection taking too long');
    console.log('This might indicate:');
    console.log('1. Network connectivity issues');
    console.log('2. Invalid token format');
    console.log('3. Discord API issues');
    process.exit(1);
}, 30000); // 30 seconds timeout

client.login(process.env.DISCORD_TOKEN).then(() => {
    clearTimeout(loginTimeout);
    console.log('✅ Login successful!');
}).catch(error => {
    clearTimeout(loginTimeout);
    console.error('❌ Failed to login:', error);
    console.log('Token format check:', process.env.DISCORD_TOKEN.substring(0, 10) + '...');
    process.exit(1);
});