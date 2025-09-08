const { SlashCommandBuilder, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, PermissionFlagsBits } = require('discord.js');
const { checkChannelRestriction } = require('../utils/channelRestrictions');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('muzik')
        .setDescription('Muzik calar kontrolleri ve komutlari')
        .addSubcommand(subcommand =>
            subcommand
                .setName('cal')
                .setDescription('Bir sarki veya calma listesi cal')
                .addStringOption(option =>
                    option.setName('sarki')
                        .setDescription('Sarki adi, sanatci, YouTube URL veya calma listesi URL')
                        .setRequired(true)))
        .addSubcommand(subcommand =>
            subcommand
                .setName('duraklat')
                .setDescription('Mevcut sarkiyi duraklat veya devam ettir'))
        .addSubcommand(subcommand =>
            subcommand
                .setName('gecis')
                .setDescription('Mevcut sarkiyi gec'))
        .addSubcommand(subcommand =>
            subcommand
                .setName('durdur')
                .setDescription('Calmayi durdur ve sirayi temizle'))
        .addSubcommand(subcommand =>
            subcommand
                .setName('sira')
                .setDescription('Mevcut muzik sirasini goster'))
        .addSubcommand(subcommand =>
            subcommand
                .setName('simdi-calan')
                .setDescription('Mevcut sarki hakkinda bilgi goster'))
        .addSubcommand(subcommand =>
            subcommand
                .setName('ses')
                .setDescription('Muzik sesini ayarla')
                .addIntegerOption(option =>
                    option.setName('seviye')
                        .setDescription('Ses seviyesi (1-100)')
                        .setMinValue(1)
                        .setMaxValue(100)
                        .setRequired(true)))
        .addSubcommand(subcommand =>
            subcommand
                .setName('karistir')
                .setDescription('Mevcut sirayi karistir'))
        .addSubcommand(subcommand =>
            subcommand
                .setName('temizle')
                .setDescription('Muzik sirasini temizle'))
        .addSubcommand(subcommand =>
            subcommand
                .setName('dongu')
                .setDescription('Sira icin dongu modunu ayarla')
                .addStringOption(option =>
                    option.setName('mode')
                        .setDescription('Dongu modu')
                        .setRequired(true)
                        .addChoices(
                            { name: 'Kapali', value: 'off' },
                            { name: 'Sarki', value: 'track' },
                            { name: 'Sira', value: 'queue' }
                        )))
        .addSubcommand(subcommand =>
            subcommand
                .setName('cikar')
                .setDescription('Siradan bir sarki cikar')
                .addIntegerOption(option =>
                    option.setName('position')
                        .setDescription('Cikarilacak sarkinin siradaki pozisyonu')
                        .setMinValue(1)
                        .setRequired(true)))
        .addSubcommand(subcommand =>
            subcommand
                .setName('sozler')
                .setDescription('Mevcut sarkinin sozlerini al veya ara'))
        .addSubcommand(subcommand =>
            subcommand
                .setName('istatistikler')
                .setDescription('Muzik dinleme istatistiklerini goruntule')),
    
    async execute(interaction) {
        const subcommand = interaction.options.getSubcommand();
        
        // Check channel restriction for music commands
        const restriction = checkChannelRestriction(interaction, 'muzik');
        if (restriction.isRestricted) {
            return interaction.reply({
                content: restriction.message,
                flags: 64
            });
        }
        
        // Get music player manager
        const musicPlayer = interaction.client.musicPlayer;
        if (!musicPlayer) {
            return interaction.reply({ 
                content: '🎵 Müzik sistemi mevcut değil! Lütfen bir yöneticiyle iletişime geçin.', 
                ephemeral: true 
            });
        }
        
        // Check if user is in a voice channel for most commands
        const requiresVoiceChannel = ['cal', 'duraklat', 'gecis', 'durdur', 'ses', 'karistir', 'temizle', 'dongu', 'cikar'];
        if (requiresVoiceChannel.includes(subcommand)) {
            if (!interaction.member.voice.channel) {
                return interaction.reply({ 
                    content: '🎵 Bu komutu kullanmak için bir ses kanalında olmalısınız!', 
                    ephemeral: true 
                });
            }
            
            // Check if bot is in a different voice channel
            const queue = musicPlayer.player.nodes.get(interaction.guild.id);
            if (queue && queue.connection && queue.connection.joinConfig.channelId !== interaction.member.voice.channel.id) {
                return interaction.reply({ 
                    content: '🎵 Botla aynı ses kanalında olmalısınız!', 
                    ephemeral: true 
                });
            }
        }
        
        try {
            switch (subcommand) {
                case 'cal':
                    const query = interaction.options.getString('sarki');
                    await musicPlayer.play(interaction, query);
                    break;
                    
                case 'duraklat':
                    await musicPlayer.pause(interaction);
                    break;
                    
                case 'gecis':
                    await musicPlayer.skip(interaction);
                    break;
                    
                case 'durdur':
                    await musicPlayer.stop(interaction);
                    break;
                    
                case 'sira':
                    await musicPlayer.showQueue(interaction);
                    break;
                    
                case 'simdi-calan':
                    await this.showNowPlayingWithControls(interaction, musicPlayer);
                    break;
                    
                case 'ses':
                    const volume = interaction.options.getInteger('seviye');
                    await musicPlayer.setVolume(interaction, volume);
                    break;
                    
                case 'karistir':
                    await this.shuffleQueue(interaction, musicPlayer);
                    break;
                    
                case 'temizle':
                    await this.clearQueue(interaction, musicPlayer);
                    break;
                    
                case 'dongu':
                    const mode = interaction.options.getString('mode');
                    await this.setLoopMode(interaction, musicPlayer, mode);
                    break;
                    
                case 'cikar':
                    const position = interaction.options.getInteger('position');
                    await this.removeTrack(interaction, musicPlayer, position);
                    break;
                    
                case 'sozler':
                    await this.getLyrics(interaction, musicPlayer);
                    break;
                    
                case 'istatistikler':
                    await this.showMusicStats(interaction, musicPlayer);
                    break;
            }
        } catch (error) {
            console.error(`Müzik komutu çalıştırılırken hata oluştu ${subcommand}:`, error);
            const errorMessage = 'Bu müzik komutu çalıştırılırken bir hata oluştu!';
            
            if (interaction.replied || interaction.deferred) {
                await interaction.followUp({ content: errorMessage, ephemeral: true });
            } else {
                await interaction.reply({ content: errorMessage, ephemeral: true });
            }
        }
    },
    
    async showNowPlayingWithControls(interaction, musicPlayer) {
        const queue = musicPlayer.player.nodes.get(interaction.guild.id);
        if (!queue || !queue.node.isPlaying()) {
            return interaction.reply({ 
                content: '❌ No music is currently playing!', 
                ephemeral: true 
            });
        }
        
        const track = queue.currentTrack;
        const progress = queue.node.getTimestamp();
        const progressBar = musicPlayer.createProgressBar(progress.current.value, track.durationMS, 20);
        
        const embed = new EmbedBuilder()
            .setColor('#FF6B00')
            .setTitle('🎵 Now Playing')
            .setDescription(`**[${track.title}](${track.url})**`)
            .addFields(
                { name: '👤 Artist', value: track.author, inline: true },
                { name: '⏱️ Duration', value: track.duration, inline: true },
                { name: '🔊 Volume', value: `${queue.node.volume}%`, inline: true },
                { name: '👤 Requested by', value: track.requestedBy.toString(), inline: true },
                { name: '🔁 Loop Mode', value: this.getLoopModeText(queue.repeatMode), inline: true },
                { name: '📋 Queue', value: `${queue.tracks.size} track${queue.tracks.size !== 1 ? 's' : ''}`, inline: true },
                { name: '📊 Progress', value: `${progressBar}\\n\`${progress.current.label} / ${track.duration}\``, inline: false }
            )
            .setThumbnail(track.thumbnail)
            .setTimestamp();
        
        // Create control buttons
        const row = new ActionRowBuilder()
            .addComponents(
                new ButtonBuilder()
                    .setCustomId('music_pause')
                    .setLabel(queue.node.isPaused() ? 'Resume' : 'Pause')
                    .setEmoji(queue.node.isPaused() ? '▶️' : '⏸️')
                    .setStyle(ButtonStyle.Primary),
                new ButtonBuilder()
                    .setCustomId('music_skip')
                    .setLabel('Skip')
                    .setEmoji('⏭️')
                    .setStyle(ButtonStyle.Secondary),
                new ButtonBuilder()
                    .setCustomId('music_stop')
                    .setLabel('Stop')
                    .setEmoji('⏹️')
                    .setStyle(ButtonStyle.Danger),
                new ButtonBuilder()
                    .setCustomId('music_queue')
                    .setLabel('Queue')
                    .setEmoji('📋')
                    .setStyle(ButtonStyle.Secondary),
                new ButtonBuilder()
                    .setCustomId('music_shuffle')
                    .setLabel('Shuffle')
                    .setEmoji('🔀')
                    .setStyle(ButtonStyle.Secondary)
            );
        
        await interaction.reply({ embeds: [embed], components: [row] });
    },
    
    async shuffleQueue(interaction, musicPlayer) {
        const queue = musicPlayer.player.nodes.get(interaction.guild.id);
        if (!queue || !queue.tracks.size) {
            return interaction.reply({ 
                content: '❌ The queue is empty!', 
                ephemeral: true 
            });
        }
        
        queue.tracks.shuffle();
        
        const embed = new EmbedBuilder()
            .setColor('#9370DB')
            .setTitle('🔀 Queue Shuffled')
            .setDescription(`Shuffled ${queue.tracks.size} track${queue.tracks.size !== 1 ? 's' : ''} in the queue!`)
            .addFields({ name: '👤 Shuffled by', value: interaction.user.toString(), inline: true })
            .setTimestamp();
        
        await interaction.reply({ embeds: [embed] });
    },
    
    async clearQueue(interaction, musicPlayer) {
        const queue = musicPlayer.player.nodes.get(interaction.guild.id);
        if (!queue || !queue.tracks.size) {
            return interaction.reply({ 
                content: '❌ The queue is empty!', 
                ephemeral: true 
            });
        }
        
        const trackCount = queue.tracks.size;
        queue.tracks.clear();
        
        const embed = new EmbedBuilder()
            .setColor('#FF6B00')
            .setTitle('🗑️ Queue Cleared')
            .setDescription(`Removed ${trackCount} track${trackCount !== 1 ? 's' : ''} from the queue!`)
            .addFields({ name: '👤 Cleared by', value: interaction.user.toString(), inline: true })
            .setTimestamp();
        
        await interaction.reply({ embeds: [embed] });
    },
    
    async setLoopMode(interaction, musicPlayer, mode) {
        const queue = musicPlayer.player.nodes.get(interaction.guild.id);
        if (!queue) {
            return interaction.reply({ 
                content: '❌ No music is currently playing!', 
                ephemeral: true 
            });
        }
        
        const { QueueRepeatMode } = require('discord-player');
        const modes = {
            'off': QueueRepeatMode.OFF,
            'track': QueueRepeatMode.TRACK,
            'queue': QueueRepeatMode.QUEUE
        };
        
        queue.setRepeatMode(modes[mode]);
        
        const embed = new EmbedBuilder()
            .setColor('#4169E1')
            .setTitle('🔁 Loop Mode Changed')
            .setDescription(`Loop mode set to: **${mode.charAt(0).toUpperCase() + mode.slice(1)}**`)
            .addFields({ name: '👤 Changed by', value: interaction.user.toString(), inline: true })
            .setTimestamp();
        
        await interaction.reply({ embeds: [embed] });
    },
    
    async removeTrack(interaction, musicPlayer, position) {
        const queue = musicPlayer.player.nodes.get(interaction.guild.id);
        if (!queue || !queue.tracks.size) {
            return interaction.reply({ 
                content: '❌ The queue is empty!', 
                ephemeral: true 
            });
        }
        
        if (position > queue.tracks.size) {
            return interaction.reply({ 
                content: `❌ There are only ${queue.tracks.size} track${queue.tracks.size !== 1 ? 's' : ''} in the queue!`, 
                ephemeral: true 
            });
        }
        
        const track = queue.tracks.at(position - 1);
        queue.removeTrack(position - 1);
        
        const embed = new EmbedBuilder()
            .setColor('#FF6B00')
            .setTitle('🗑️ Track Removed')
            .setDescription(`Removed: **${track.title}**`)
            .addFields(
                { name: '📍 Position', value: position.toString(), inline: true },
                { name: '👤 Removed by', value: interaction.user.toString(), inline: true }
            )
            .setTimestamp();
        
        await interaction.reply({ embeds: [embed] });
    },
    
    async searchMusic(interaction, musicPlayer) {
        // This would implement a search interface with multiple results
        // For now, we'll redirect to the play command
        await interaction.reply({ 
            content: '🔍 **Search feature coming soon!**\nFor now, use `/music play` with your search terms.', 
            ephemeral: true 
        });
    },
    
    async getLyrics(interaction, musicPlayer) {
        // This would implement lyrics fetching
        await interaction.reply({ 
            content: '🎤 **Lyrics feature coming soon!**\nWe\'re working on integrating lyrics for the current track.', 
            ephemeral: true 
        });
    },
    
    async showMusicStats(interaction, musicPlayer) {
        const guildData = musicPlayer.getGuildData(interaction.guild.id);
        const queue = musicPlayer.player.nodes.get(interaction.guild.id);
        
        // Get user voice activity stats for comparison
        const voiceManager = interaction.client.voiceManager;
        let userStats = null;
        if (voiceManager) {
            userStats = await voiceManager.getUserStats(interaction.user.id, interaction.guild.id);
        }
        
        const embed = new EmbedBuilder()
            .setColor('#9370DB')
            .setTitle('📊 Music Statistics')
            .addFields(
                { name: '🎵 Songs Played Today', value: guildData.songsPlayed.toString(), inline: true },
                { name: '🎶 Currently Playing', value: guildData.isPlaying ? 'Yes' : 'No', inline: true },
                { name: '📋 Queue Size', value: queue ? queue.tracks.size.toString() : '0', inline: true }
            )
            .setFooter({ 
                text: `${interaction.guild.name} • Music Bot Stats`,
                iconURL: interaction.guild.iconURL()
            })
            .setTimestamp();
        
        if (userStats) {
            embed.addFields({
                name: '🏆 Your Voice Stats',
                value: `Level ${userStats.level} • ${userStats.coins} coins • ${Math.floor(userStats.voice_time_minutes / 60)}h voice time`,
                inline: false
            });
        }
        
        await interaction.reply({ embeds: [embed] });
    },
    
    getLoopModeText(mode) {
        const { QueueRepeatMode } = require('discord-player');
        switch (mode) {
            case QueueRepeatMode.TRACK: return '🔂 Track';
            case QueueRepeatMode.QUEUE: return '🔁 Queue';
            default: return '➡️ Off';
        }
    }
};