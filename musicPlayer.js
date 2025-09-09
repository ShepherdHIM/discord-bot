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
            this.player.extractors.register(YoutubeiExtractor, {});
            console.log('✅ Youtubei extractor registered');
        } catch (error) {
            console.log('⚠️ Youtubei extractor not available, using default');
            // Fallback to default extractors
            try {
                const { YoutubeExtractor } = require('@discord-player/extractor');
                this.player.extractors.register(YoutubeExtractor, {});
                console.log('✅ Default YouTube extractor registered');
            } catch (fallbackError) {
                console.log('⚠️ No YouTube extractors available');
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
            if (queue.metadata?.channel) {
                queue.metadata.channel.send('❌ Something went wrong with the music player!');
            }
        });
        
        // Connection error
        this.player.events.on('connectionError', (queue, error) => {
            console.error('Connection error:', error);
            if (queue.metadata?.channel) {
                queue.metadata.channel.send('❌ Failed to connect to voice channel!');
            }
        });
        
        // Track error
        this.player.events.on('trackError', (queue, error) => {
            console.error('Track error:', error);
            if (queue.metadata?.channel) {
                queue.metadata.channel.send('❌ Error playing track. Skipping to next...');
            }
            // Auto-skip the problematic track
            if (queue.tracks.size > 0) {
                queue.node.skip();
            }
        });
        
        // Player error
        this.player.events.on('playerError', (queue, error) => {
            console.error('Player error:', error);
            if (queue.metadata?.channel) {
                queue.metadata.channel.send('❌ Player error occurred. Trying to recover...');
            }
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
    
    async play(interaction, query) {
        const channel = interaction.member.voice.channel;
        if (!channel) {
            return interaction.reply({ 
                content: '🎵 You need to be in a voice channel to play music!', 
                ephemeral: true 
            });
        }
        
        try {
            await interaction.deferReply();
            
            console.log(`🎵 Searching for: ${query}`);
            
            const searchResult = await this.player.search(query, {
                requestedBy: interaction.user,
                searchEngine: 'youtube'
            });
            
            if (!searchResult || !searchResult.tracks.length) {
                return interaction.editReply('❌ No results found for your search!');
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
                await queue.connect(channel);
                console.log(`✅ Connected to voice channel`);
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
                    await interaction.editReply('❌ Failed to start playback. The track might be unavailable or corrupted.');
                }
            }
            
        } catch (error) {
            console.error('Error playing music:', error);
            await interaction.editReply('❌ Something went wrong while trying to play music!');
        }
    }
    
    async skip(interaction) {
        const queue = this.player.nodes.get(interaction.guild.id);
        if (!queue || !queue.node.isPlaying()) {
            return interaction.reply({ 
                content: '❌ No music is currently playing!', 
                ephemeral: true 
            });
        }
        
        const currentTrack = queue.currentTrack;
        queue.node.skip();
        
        const embed = new EmbedBuilder()
            .setColor('#FFD700')
            .setTitle('⏭️ Track Skipped')
            .setDescription(`Skipped: **${currentTrack.title}**`)
            .addFields({ name: '👤 Skipped by', value: interaction.user.toString(), inline: true })
            .setTimestamp();
        
        await interaction.reply({ embeds: [embed] });
    }
    
    async pause(interaction) {
        const queue = this.player.nodes.get(interaction.guild.id);
        if (!queue || !queue.node.isPlaying()) {
            return interaction.reply({ 
                content: '❌ No music is currently playing!', 
                ephemeral: true 
            });
        }
        
        queue.node.setPaused(!queue.node.isPaused());
        const isPaused = queue.node.isPaused();
        
        const embed = new EmbedBuilder()
            .setColor(isPaused ? '#FFA500' : '#00FF00')
            .setTitle(isPaused ? '⏸️ Music Paused' : '▶️ Music Resumed')
            .setDescription(`**${queue.currentTrack.title}**`)
            .addFields({ name: '👤 Action by', value: interaction.user.toString(), inline: true })
            .setTimestamp();
        
        await interaction.reply({ embeds: [embed] });
    }
    
    async stop(interaction) {
        const queue = this.player.nodes.get(interaction.guild.id);
        if (!queue) {
            return interaction.reply({ 
                content: '❌ No music is currently playing!', 
                ephemeral: true 
            });
        }
        
        queue.delete();
        
        const embed = new EmbedBuilder()
            .setColor('#FF0000')
            .setTitle('⏹️ Music Stopped')
            .setDescription('Queue cleared and disconnected from voice channel.')
            .addFields({ name: '👤 Stopped by', value: interaction.user.toString(), inline: true })
            .setTimestamp();
        
        await interaction.reply({ embeds: [embed] });
    }
    
    async showQueue(interaction) {
        const queue = this.player.nodes.get(interaction.guild.id);
        if (!queue || !queue.tracks.size) {
            return interaction.reply({ 
                content: '❌ The queue is empty!', 
                ephemeral: true 
            });
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
        
        await interaction.reply({ embeds: [embed] });
    }
    
    async showNowPlaying(interaction) {
        const queue = this.player.nodes.get(interaction.guild.id);
        if (!queue || !queue.node.isPlaying()) {
            return interaction.reply({ 
                content: '❌ No music is currently playing!', 
                ephemeral: true 
            });
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
        
        await interaction.reply({ embeds: [embed] });
    }
    
    async setVolume(interaction, volume) {
        const queue = this.player.nodes.get(interaction.guild.id);
        if (!queue) {
            return interaction.reply({ 
                content: '❌ No music is currently playing!', 
                ephemeral: true 
            });
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
        
        await interaction.reply({ embeds: [embed] });
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
    
    // Cleanup method
    cleanup() {
        this.player.destroy();
    }
}

module.exports = MusicPlayerManager;