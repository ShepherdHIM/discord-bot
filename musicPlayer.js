const { Player } = require('discord-player');
const { EmbedBuilder } = require('discord.js');

class MusicPlayerManager {
    constructor(client) {
        this.client = client;
        this.player = new Player(client, {
            ytdlOptions: {
                quality: 'highestaudio',
                highWaterMark: 1 << 25
            }
        });
        
        // Register extractors
        this.registerExtractors();
        
        // Store guild music data
        this.guildData = new Map();
        
        this.setupPlayerEvents();
    }
    
    registerExtractors() {
        try {
            // Try to register discord-player-youtubei first (preferred)
            const { YoutubeiExtractor } = require('discord-player-youtubei');
            this.player.extractors.register(YoutubeiExtractor, {
                cookie: process.env.YOUTUBE_COOKIE || undefined,
                userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
            });
            console.log('✅ Youtubei extractor registered');
        } catch (error) {
            console.log('⚠️ Youtubei extractor not available, using default');
            console.log('Youtubei error:', error.message);
            
            // Fallback to default extractors
            try {
                const { YoutubeExtractor } = require('@discord-player/extractor');
                this.player.extractors.register(YoutubeExtractor, {
                    cookie: process.env.YOUTUBE_COOKIE || undefined,
                    userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
                });
                console.log('✅ Default YouTube extractor registered');
            } catch (fallbackError) {
                console.log('⚠️ No YouTube extractors available');
                console.log('Fallback error:', fallbackError.message);
                
                // Try to register any available extractor
                try {
                    const { SoundCloudExtractor } = require('@discord-player/extractor');
                    this.player.extractors.register(SoundCloudExtractor, {});
                    console.log('✅ SoundCloud extractor registered as fallback');
                } catch (soundcloudError) {
                    console.log('❌ No extractors available at all');
                }
            }
        }
    }
    
    setupPlayerEvents() {
        // Track started
        this.player.events.on('playerStart', (queue, track) => {
            const guildData = this.getGuildData(queue.guild.id);
            guildData.isPlaying = true;
            guildData.currentTrack = track;
            guildData.startTime = Date.now();
            
            this.sendTrackStartMessage(queue, track);
        });
        
        // Track finished
        this.player.events.on('playerFinish', (queue, track) => {
            const guildData = this.getGuildData(queue.guild.id);
            const playTime = Date.now() - (guildData.startTime || Date.now());
            
            // Award XP/coins for listening
            this.awardListeningRewards(queue.guild.id, playTime);
            
            guildData.isPlaying = false;
            guildData.currentTrack = null;
        });
        
        // Queue finished
        this.player.events.on('emptyQueue', (queue) => {
            const guildData = this.getGuildData(queue.guild.id);
            guildData.isPlaying = false;
            guildData.currentTrack = null;
            
            // Only send message if music was actually played
            if (guildData.songsPlayed > 0) {
                this.sendQueueFinishedMessage(queue);
            }
        });
        
        // Error handling
        this.player.events.on('error', (queue, error) => {
            console.error('Music player error:', error);
            console.error('Error details:', {
                message: error.message,
                stack: error.stack,
                guildId: queue.guild.id,
                channelId: queue.connection?.joinConfig?.channelId
            });
            
            if (queue.metadata?.channel) {
                queue.metadata.channel.send('❌ Something went wrong with the music player! Attempting to recover...');
            }
            
            // Attempt recovery for general errors
            this.attemptPlayerRecovery(queue, error);
        });
        
        // Connection error
        this.player.events.on('connectionError', (queue, error) => {
            console.error('Connection error:', error);
            console.error('Connection error details:', {
                message: error.message,
                stack: error.stack,
                guildId: queue.guild.id,
                channelId: queue.connection?.joinConfig?.channelId
            });
            
            if (queue.metadata?.channel) {
                queue.metadata.channel.send('❌ Failed to connect to voice channel! Attempting to reconnect...');
            }
            
            // Attempt recovery for connection errors
            this.attemptPlayerRecovery(queue, error);
        });
        
        // Track error
        this.player.events.on('trackError', (queue, error) => {
            console.error('Track error:', error);
            console.error('Track error details:', {
                message: error.message,
                stack: error.stack,
                guildId: queue.guild.id,
                currentTrack: queue.currentTrack?.title,
                trackUrl: queue.currentTrack?.url
            });
            
            if (queue.metadata?.channel) {
                queue.metadata.channel.send('❌ Error playing track. Skipping to next...');
            }
            
            // Auto-skip the problematic track
            if (queue.tracks.size > 0) {
                try {
                    queue.node.skip();
                    console.log('✅ Skipped problematic track');
                } catch (skipError) {
                    console.error('❌ Failed to skip track:', skipError);
                    // If skip fails, try recovery
                    this.attemptPlayerRecovery(queue, error);
                }
            } else {
                // No more tracks, try recovery
                this.attemptPlayerRecovery(queue, error);
            }
        });
        
        // Player error
        this.player.events.on('playerError', (queue, error) => {
            console.error('🎵 Player error occurred:', error.message);
            console.error('🎵 Error details:', {
                message: error.message,
                code: error.code,
                guildId: queue.guild.id,
                channelId: queue.connection?.joinConfig?.channelId,
                currentTrack: queue.currentTrack?.title,
                queueSize: queue.tracks.size,
                isPlaying: queue.node.isPlaying(),
                isPaused: queue.node.isPaused()
            });
            
            // Send user-friendly message
            if (queue.metadata?.channel) {
                queue.metadata.channel.send('❌ Player error occurred. Trying to recover...');
            }
            
            // Attempt recovery with more specific handling
            this.attemptPlayerRecovery(queue, error);
        });
    }
    
    getGuildData(guildId) {
        if (!this.guildData.has(guildId)) {
            this.guildData.set(guildId, {
                isPlaying: false,
                currentTrack: null,
                startTime: null,
                listeners: new Set(),
                totalPlayTime: 0,
                songsPlayed: 0
            });
        }
        return this.guildData.get(guildId);
    }
    
    // Helper function to safely reply to interactions
    async safeReply(interaction, content, options = {}) {
        try {
            // Check interaction state and respond appropriately
            if (!interaction.replied && !interaction.deferred) {
                return await interaction.reply({ content, ...options });
            } else if (interaction.deferred) {
                return await interaction.editReply(content);
            } else {
                return await interaction.followUp({ content, ...options });
            }
        } catch (error) {
            console.error('Error in safeReply:', error);
            // Interaction might be expired or already acknowledged
            console.log('Interaction state:', {
                replied: interaction.replied,
                deferred: interaction.deferred,
                age: Date.now() - interaction.createdTimestamp
            });
        }
    }

    // Helper function to safely reply with embeds
    async safeReplyEmbed(interaction, embed, options = {}) {
        try {
            // Check interaction state and respond appropriately
            if (!interaction.replied && !interaction.deferred) {
                return await interaction.reply({ embeds: [embed], ...options });
            } else if (interaction.deferred) {
                return await interaction.editReply({ embeds: [embed], ...options });
            } else {
                return await interaction.followUp({ embeds: [embed], ...options });
            }
        } catch (error) {
            console.error('Error in safeReplyEmbed:', error);
            // Interaction might be expired or already acknowledged
            console.log('Interaction state:', {
                replied: interaction.replied,
                deferred: interaction.deferred,
                age: Date.now() - interaction.createdTimestamp
            });
        }
    }
    
    async play(interaction, query) {
        const channel = interaction.member.voice.channel;
        if (!channel) {
            return this.safeReply(interaction, '🎵 You need to be in a voice channel to play music!', { flags: 64 });
        }
        
        try {
            console.log(`🎵 Searching for: ${query}`);
            
            // Check if player is healthy before proceeding
            if (!this.isPlayerHealthy()) {
                console.log('⚠️ Player not healthy, attempting to restart...');
                await this.restartPlayer();
            }
            
            // Try different search engines if YouTube fails
            let searchResult = null;
            const searchEngines = ['youtube', 'youtubeMusic', 'soundcloud'];
            
            for (const engine of searchEngines) {
                try {
                    console.log(`🎵 Trying search engine: ${engine}`);
                    
                    // Add timeout to search operation
                    const searchPromise = this.player.search(query, {
                        requestedBy: interaction.user,
                        searchEngine: engine
                    });
                    
                    const timeoutPromise = new Promise((_, reject) => 
                        setTimeout(() => reject(new Error('Search timeout')), 15000)
                    );
                    
                    searchResult = await Promise.race([searchPromise, timeoutPromise]);
                    
                    if (searchResult && searchResult.tracks.length > 0) {
                        console.log(`✅ Found ${searchResult.tracks.length} tracks using ${engine}`);
                        break;
                    }
                } catch (searchError) {
                    console.log(`⚠️ Search failed with ${engine}:`, searchError.message);
                    continue;
                }
            }
            
            if (!searchResult || !searchResult.tracks.length) {
                return interaction.editReply('❌ No results found for your search! Please try:\n• A different song name\n• Including the artist name\n• A YouTube URL\n• A SoundCloud URL');
            }
            
            console.log(`🎵 Found ${searchResult.tracks.length} tracks`);
            
            const queue = this.player.nodes.create(interaction.guild, {
                metadata: {
                    channel: interaction.channel,
                    requestedBy: interaction.user
                },
                leaveOnEmptyCooldown: 300000, // 5 minutes
                leaveOnEmpty: true,
                leaveOnEnd: false,
                selfDeaf: true,
                bufferingTimeout: 30000, // 30 seconds timeout
                connectionTimeout: 30000 // 30 seconds connection timeout
            });
            
            if (!queue.connection) {
                console.log(`🎵 Connecting to voice channel: ${channel.name}`);
                try {
                    await queue.connect(channel);
                    console.log(`✅ Connected to voice channel`);
                } catch (connectError) {
                    console.error('❌ Failed to connect to voice channel:', connectError);
                    await interaction.editReply('❌ Failed to connect to voice channel. Please try again.');
                    return;
                }
            }
            
            if (searchResult.playlist) {
                queue.addTrack(searchResult.tracks);
                const embed = new EmbedBuilder()
                    .setColor('#FF6B00')
                    .setTitle('📋 Playlist Added to Queue')
                    .setDescription(`**${searchResult.playlist.title}**`)
                    .addFields(
                        { name: '🎵 Tracks', value: searchResult.tracks.length.toString(), inline: true },
                        { name: '👤 Requested by', value: interaction.user.toString(), inline: true }
                    )
                    .setThumbnail(searchResult.playlist.thumbnail || searchResult.tracks[0].thumbnail)
                    .setTimestamp();
                
                await interaction.editReply({ embeds: [embed] });
            } else {
                const track = searchResult.tracks[0];
                console.log(`🎵 Adding track: ${track.title}`);
                queue.addTrack(track);
                
                const embed = new EmbedBuilder()
                    .setColor('#00FF00')
                    .setTitle('🎵 Track Added to Queue')
                    .setDescription(`**[${track.title}](${track.url})**`)
                    .addFields(
                        { name: '👤 Artist', value: track.author, inline: true },
                        { name: '⏱️ Duration', value: track.duration, inline: true },
                        { name: '👤 Requested by', value: interaction.user.toString(), inline: true }
                    )
                    .setThumbnail(track.thumbnail)
                    .setTimestamp();
                
                await interaction.editReply({ embeds: [embed] });
            }
            
            if (!queue.node.isPlaying()) {
                console.log(`🎵 Starting playback...`);
                try {
                    await queue.node.play();
                    console.log(`✅ Playback started successfully`);
                    
                    // Track guild music activity
                    const guildData = this.getGuildData(interaction.guild.id);
                    guildData.songsPlayed++;
                } catch (playError) {
                    console.error('❌ Error starting playback:', playError);
                    console.error('Playback error details:', {
                        message: playError.message,
                        stack: playError.stack,
                        trackTitle: queue.currentTrack?.title,
                        trackUrl: queue.currentTrack?.url
                    });
                    
                    // Try to recover from playback error
                    await this.attemptPlayerRecovery(queue, playError);
                    
                    await interaction.editReply('❌ Failed to start playback. Attempting to recover...');
                }
            }
            
        } catch (error) {
            console.error('Error playing music:', error);
            console.error('Play error details:', {
                message: error.message,
                stack: error.stack,
                query: query,
                guildId: interaction.guild.id,
                channelId: channel.id
            });
            
            await interaction.editReply('❌ Something went wrong while trying to play music! Please try again.');
        }
    }
    
    async skip(interaction) {
        const queue = this.player.nodes.get(interaction.guild.id);
        if (!queue || !queue.node.isPlaying()) {
            return this.safeReply(interaction, '❌ No music is currently playing!', { flags: 64 });
        }
        
        const currentTrack = queue.currentTrack;
        queue.node.skip();
        
        const embed = new EmbedBuilder()
            .setColor('#FFD700')
            .setTitle('⏭️ Track Skipped')
            .setDescription(`Skipped: **${currentTrack.title}**`)
            .addFields({ name: '👤 Skipped by', value: interaction.user.toString(), inline: true })
            .setTimestamp();
        
        await this.safeReplyEmbed(interaction, embed);
    }
    
    async pause(interaction) {
        const queue = this.player.nodes.get(interaction.guild.id);
        if (!queue || !queue.node.isPlaying()) {
            return this.safeReply(interaction, '❌ No music is currently playing!', { flags: 64 });
        }
        
        queue.node.setPaused(!queue.node.isPaused());
        const isPaused = queue.node.isPaused();
        
        const embed = new EmbedBuilder()
            .setColor(isPaused ? '#FFA500' : '#00FF00')
            .setTitle(isPaused ? '⏸️ Music Paused' : '▶️ Music Resumed')
            .setDescription(`**${queue.currentTrack.title}**`)
            .addFields({ name: '👤 Action by', value: interaction.user.toString(), inline: true })
            .setTimestamp();
        
        await this.safeReplyEmbed(interaction, embed);
    }
    
    async stop(interaction) {
        const queue = this.player.nodes.get(interaction.guild.id);
        if (!queue) {
            return this.safeReply(interaction, '❌ No music is currently playing!', { flags: 64 });
        }
        
        queue.delete();
        
        const embed = new EmbedBuilder()
            .setColor('#FF0000')
            .setTitle('⏹️ Music Stopped')
            .setDescription('Queue cleared and disconnected from voice channel.')
            .addFields({ name: '👤 Stopped by', value: interaction.user.toString(), inline: true })
            .setTimestamp();
        
        await this.safeReplyEmbed(interaction, embed);
    }
    
    async showQueue(interaction) {
        const queue = this.player.nodes.get(interaction.guild.id);
        if (!queue || !queue.tracks.size) {
            return this.safeReply(interaction, '❌ The queue is empty!', { flags: 64 });
        }
        
        const tracks = queue.tracks.toArray();
        const current = queue.currentTrack;
        
        const embed = new EmbedBuilder()
            .setColor('#4169E1')
            .setTitle('📋 Music Queue')
            .setTimestamp();
        
        if (current) {
            embed.addFields({
                name: '🎵 Now Playing',
                value: `**[${current.title}](${current.url})**\\n${current.author} • ${current.duration}`,
                inline: false
            });
        }
        
        if (tracks.length > 0) {
            const upcoming = tracks.slice(0, 10).map((track, index) => 
                `\`${index + 1}.\` **[${track.title}](${track.url})**\\n${track.author} • ${track.duration}`
            ).join('\\n\\n');
            
            embed.addFields({
                name: `📋 Up Next (${tracks.length} track${tracks.length !== 1 ? 's' : ''})`,
                value: upcoming,
                inline: false
            });
            
            if (tracks.length > 10) {
                embed.setFooter({ text: `And ${tracks.length - 10} more track${tracks.length - 10 !== 1 ? 's' : ''}...` });
            }
        }
        
        await this.safeReplyEmbed(interaction, embed);
    }
    
    async showNowPlaying(interaction) {
        const queue = this.player.nodes.get(interaction.guild.id);
        if (!queue || !queue.node.isPlaying()) {
            return this.safeReply(interaction, '❌ No music is currently playing!', { flags: 64 });
        }
        
        const track = queue.currentTrack;
        const progress = queue.node.getTimestamp();
        const progressBar = this.createProgressBar(progress.current.value, track.durationMS, 20);
        
        const embed = new EmbedBuilder()
            .setColor('#FF6B00')
            .setTitle('🎵 Now Playing')
            .setDescription(`**[${track.title}](${track.url})**`)
            .addFields(
                { name: '👤 Artist', value: track.author, inline: true },
                { name: '⏱️ Duration', value: track.duration, inline: true },
                { name: '🔊 Volume', value: `${queue.node.volume}%`, inline: true },
                { name: '👤 Requested by', value: track.requestedBy.toString(), inline: true },
                { name: '📊 Progress', value: `${progressBar}\\n\`${progress.current.label} / ${track.duration}\``, inline: false }
            )
            .setThumbnail(track.thumbnail)
            .setTimestamp();
        
        await this.safeReplyEmbed(interaction, embed);
    }
    
    async setVolume(interaction, volume) {
        const queue = this.player.nodes.get(interaction.guild.id);
        if (!queue) {
            return this.safeReply(interaction, '❌ No music is currently playing!', { flags: 64 });
        }
        
        const oldVolume = queue.node.volume;
        queue.node.setVolume(volume);
        
        const embed = new EmbedBuilder()
            .setColor('#4169E1')
            .setTitle('🔊 Volume Changed')
            .addFields(
                { name: '📉 Previous', value: `${oldVolume}%`, inline: true },
                { name: '📈 Current', value: `${volume}%`, inline: true },
                { name: '👤 Changed by', value: interaction.user.toString(), inline: true }
            )
            .setTimestamp();
        
        await this.safeReplyEmbed(interaction, embed);
    }
    
    createProgressBar(current, total, length) {
        const percentage = current / total;
        const progress = Math.round(percentage * length);
        const empty = length - progress;
        
        const progressChar = '█';
        const emptyChar = '░';
        
        return progressChar.repeat(progress) + emptyChar.repeat(empty);
    }
    
    async sendTrackStartMessage(queue, track) {
        if (!queue.metadata?.channel) return;
        
        const embed = new EmbedBuilder()
            .setColor('#00FF00')
            .setTitle('🎵 Now Playing')
            .setDescription(`**[${track.title}](${track.url})**`)
            .addFields(
                { name: '👤 Artist', value: track.author, inline: true },
                { name: '⏱️ Duration', value: track.duration, inline: true },
                { name: '👤 Requested by', value: track.requestedBy.toString(), inline: true }
            )
            .setThumbnail(track.thumbnail)
            .setTimestamp();
        
        try {
            await queue.metadata.channel.send({ embeds: [embed] });
        } catch (error) {
            console.error('Error sending track start message:', error);
        }
    }
    
    async sendQueueFinishedMessage(queue) {
        if (!queue.metadata?.channel) return;
        
        const embed = new EmbedBuilder()
            .setColor('#FFA500')
            .setTitle('🎵 Queue Finished')
            .setDescription('All tracks have been played! Add more music or I\'ll leave the voice channel in 5 minutes.')
            .setTimestamp();
        
        try {
            await queue.metadata.channel.send({ embeds: [embed] });
        } catch (error) {
            console.error('Error sending queue finished message:', error);
        }
    }
    
    async awardListeningRewards(guildId, playTimeMs) {
        try {
            const voiceManager = this.client.voiceManager;
            if (!voiceManager) return;
            
            const queue = this.player.nodes.get(guildId);
            if (!queue || !queue.connection?.joinConfig?.channelId) return;
            
            const guild = this.client.guilds.cache.get(guildId);
            if (!guild) return;
            
            const voiceChannel = guild.channels.cache.get(queue.connection.joinConfig.channelId);
            if (!voiceChannel) return;
            
            // Award XP/coins to users listening for more than 30 seconds
            if (playTimeMs > 30000) {
                const listeners = voiceChannel.members.filter(member => 
                    !member.user.bot && 
                    !member.voice.deaf && 
                    !member.voice.mute
                );
                
                // Get guild settings for interval configuration
                const guildSettings = await voiceManager.db.getGuildSettings(guildId);
                
                // Calculate rewards based on actual play time and configured intervals
                const playTimeMinutes = playTimeMs / 60000;
                const xpIntervalMinutes = guildSettings.xp_interval_minutes || 1;
                const coinIntervalMinutes = guildSettings.coin_interval_minutes || 1;
                
                // Calculate rewards based on intervals
                const baseXP = Math.floor(playTimeMinutes / xpIntervalMinutes) * (guildSettings.xp_per_minute * xpIntervalMinutes);
                const baseCoins = Math.floor(playTimeMinutes / coinIntervalMinutes) * (guildSettings.coins_per_minute * coinIntervalMinutes);
                
                for (const [, member] of listeners) {
                    const userStats = await voiceManager.getUserStats(member.id, guildId);
                    if (userStats) {
                        const oldXP = userStats.total_xp;
                        const newXP = oldXP + baseXP;
                        
                        await voiceManager.db.updateUserStats(
                            member.id,
                            guildId,
                            newXP,
                            userStats.coins + baseCoins,
                            userStats.voice_time_minutes
                        );
                        
                        // Check for level up
                        const oldLevel = Math.floor(oldXP / 100);
                        const newLevel = Math.floor(newXP / 100);
                        
                        if (newLevel > oldLevel) {
                            console.log(`🎉 User ${member.user.username} leveled up from ${oldLevel} to ${newLevel} through music listening`);
                            await voiceManager.handleLevelUp(member, newLevel);
                        }
                        
                        if (baseXP > 0 || baseCoins > 0) {
                            console.log(`💰 Music reward: +${baseXP} XP, +${baseCoins} coins to user ${member.user.username}`);
                        }
                    }
                }
            }
        } catch (error) {
            console.error('Error awarding listening rewards:', error);
        }
    }
    
    // Check if player is healthy
    isPlayerHealthy() {
        try {
            // Check if player exists and is not destroyed
            if (!this.player || this.player.destroyed) {
                return false;
            }
            
            // Check if extractors are working
            if (!this.player.extractors || this.player.extractors.size === 0) {
                return false;
            }
            
            return true;
        } catch (error) {
            console.error('Error checking player health:', error);
            return false;
        }
    }
    
    // Restart the player
    async restartPlayer() {
        try {
            console.log('🔄 Restarting music player...');
            
            // Destroy the old player
            if (this.player && !this.player.destroyed) {
                this.player.destroy();
            }
            
            // Wait a moment
            await new Promise(resolve => setTimeout(resolve, 1000));
            
            // Create a new player
            this.player = new Player(this.client, {
                ytdlOptions: {
                    quality: 'highestaudio',
                    highWaterMark: 1 << 25
                }
            });
            
            // Re-register extractors
            this.registerExtractors();
            
            // Re-setup events
            this.setupPlayerEvents();
            
            console.log('✅ Music player restarted successfully');
            return true;
        } catch (error) {
            console.error('❌ Failed to restart music player:', error);
            return false;
        }
    }
    
    // Player recovery method
    async attemptPlayerRecovery(queue, error) {
        try {
            console.log('🔄 Attempting player recovery...');
            console.log('🔄 Error type analysis:', {
                message: error.message,
                code: error.code,
                includesConnection: error.message?.toLowerCase().includes('connection'),
                includesVoice: error.message?.toLowerCase().includes('voice'),
                includesTrack: error.message?.toLowerCase().includes('track'),
                includesAudio: error.message?.toLowerCase().includes('audio'),
                includesTimeout: error.message?.toLowerCase().includes('timeout'),
                includesNetwork: error.message?.toLowerCase().includes('network')
            });
            
            // Check if it's a connection issue
            if (error.message?.toLowerCase().includes('connection') || 
                error.message?.toLowerCase().includes('voice') ||
                error.message?.toLowerCase().includes('timeout') ||
                error.message?.toLowerCase().includes('network')) {
                console.log('🔌 Connection-related error detected, attempting to reconnect...');
                
                // Try to reconnect
                if (queue.connection) {
                    try {
                        await queue.connection.disconnect();
                        await new Promise(resolve => setTimeout(resolve, 3000)); // Wait 3 seconds
                        
                        const channel = queue.metadata?.channel?.guild?.channels?.cache?.get(queue.connection.joinConfig?.channelId);
                        if (channel) {
                            await queue.connect(channel);
                            console.log('✅ Successfully reconnected to voice channel');
                            
                            if (queue.metadata?.channel) {
                                await queue.metadata.channel.send('✅ Successfully reconnected! Resuming playback...');
                            }
                            
                            // Try to resume playback
                            if (queue.tracks.size > 0 && !queue.node.isPlaying()) {
                                await queue.node.play();
                            }
                            return;
                        }
                    } catch (reconnectError) {
                        console.error('❌ Failed to reconnect:', reconnectError);
                    }
                }
            }
            
            // Check if it's a track-specific issue
            if (error.message?.toLowerCase().includes('track') || 
                error.message?.toLowerCase().includes('audio') ||
                error.message?.toLowerCase().includes('playback') ||
                error.message?.toLowerCase().includes('stream')) {
                console.log('🎵 Track/audio error detected, skipping problematic track...');
                
                if (queue.tracks.size > 0) {
                    try {
                        queue.node.skip();
                        console.log('✅ Skipped problematic track');
                        
                        if (queue.metadata?.channel) {
                            await queue.metadata.channel.send('✅ Skipped problematic track, continuing with next song...');
                        }
                        return;
                    } catch (skipError) {
                        console.error('❌ Failed to skip track:', skipError);
                    }
                }
            }
            
            // Check if it's a YouTube/extractor issue
            if (error.message?.toLowerCase().includes('youtube') || 
                error.message?.toLowerCase().includes('extractor') ||
                error.message?.toLowerCase().includes('search')) {
                console.log('🔍 YouTube/extractor error detected, trying to restart player...');
                
                try {
                    await this.restartPlayer();
                    console.log('✅ Player restarted successfully');
                    
                    if (queue.metadata?.channel) {
                        await queue.metadata.channel.send('✅ Player restarted successfully! Please try playing music again.');
                    }
                    return;
                } catch (restartError) {
                    console.error('❌ Failed to restart player:', restartError);
                }
            }
            
            // If all else fails, clear the queue and disconnect gracefully
            console.log('⚠️ Recovery failed, clearing queue and disconnecting...');
            
            if (queue.metadata?.channel) {
                await queue.metadata.channel.send('⚠️ Unable to recover from error. Clearing queue and disconnecting...');
            }
            
            // Clear the queue and disconnect after a short delay
            setTimeout(() => {
                try {
                    queue.delete();
                } catch (deleteError) {
                    console.error('Error deleting queue:', deleteError);
                }
            }, 5000);
            
        } catch (recoveryError) {
            console.error('❌ Error during recovery attempt:', recoveryError);
            
            // Last resort: force disconnect
            try {
                if (queue.connection) {
                    await queue.connection.disconnect();
                }
            } catch (disconnectError) {
                console.error('Error during forced disconnect:', disconnectError);
            }
        }
    }
    
    // Cleanup method
    cleanup() {
        this.player.destroy();
    }
}

module.exports = MusicPlayerManager;