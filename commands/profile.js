const { SlashCommandBuilder, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('profil')
        .setDescription('Sizin veya baska birinin XP ve coin profilini goruntuleyin')
        .addUserOption(option =>
            option.setName('user')
                .setDescription('Kontrol edilecek kullanici (varsayilan: kendiniz)')
                .setRequired(false)),
    
    async execute(interaction) {
        const target = interaction.options.getUser('user') || interaction.user;
        const member = interaction.guild.members.cache.get(target.id);
        
        if (!member) {
            return interaction.reply({ content: 'Kullanıcı bu sunucuda bulunamadı!', ephemeral: true });
        }
        
        // Get voice manager from client
        const voiceManager = interaction.client.voiceManager;
        if (!voiceManager) {
            return interaction.reply({ content: 'Ses takip sistemi başlatılmamış!', flags: 64 });
        }
        
        const stats = await voiceManager.getUserStats(target.id, interaction.guildId);
        
        if (!stats) {
            // Create a beautiful "getting started" embed for new users
            const newUserEmbed = new EmbedBuilder()
                .setColor('#00D4AA')
                .setTitle(`🌟 Hoş geldin ${target.username}!`)
                .setDescription('**Yolculuğunuzu başlatmaya hazır mısınız?**')
                .setThumbnail(target.displayAvatarURL({ dynamic: true, size: 256 }))
                .addFields(
                    {
                        name: '🎤 Kazanmaya Başlayın',
                        value: 'XP ve coin kazanmaya başlamak için bir ses kanalına katılın!',
                        inline: false
                    },
                    {
                        name: '📊 İlerleme Takibi',
                        value: 'Her zaman `/profil` komutunu kullanarak istatistiklerinizi kontrol edin',
                        inline: true
                    },
                    {
                        name: '🏆 Yarışın',
                        value: 'Sıralamaları görmek için `/liderlik-tablosu` komutunu kullanın',
                        inline: true
                    }
                )
                .setFooter({ 
                    text: `${interaction.guild.name} • Ses aktivitesi yolculuğunuzu bugün başlatın!`,
                    iconURL: interaction.guild.iconURL()
                })
                .setTimestamp();
            
            return interaction.reply({ embeds: [newUserEmbed], flags: interaction.options.getUser('user') ? 0 : 64 });
        }
        
        // Calculate additional statistics
        const additionalStats = await this.calculateAdvancedStats(stats, voiceManager, interaction.guildId);
        
        // Determine profile color based on level
        const profileColor = this.getLevelColor(stats.level);
        
        // Get level title
        const levelTitle = this.getLevelTitle(stats.level);
        
        // Calculate session statistics
        const avgXPPerHour = stats.voice_time_minutes > 0 ? Math.round((stats.total_xp / stats.voice_time_minutes) * 60) : 0;
        
        const embed = new EmbedBuilder()
            .setColor(profileColor)
            .setTitle(`${this.getRankEmoji(stats.xpRank)} ${target.username}'in Profili`)
            .setDescription(`**${levelTitle}** • Seviye ${stats.level}\n${this.createProgressBar(stats.total_xp % 100, 100, 15)} **${stats.total_xp % 100}/100 XP** (${Math.round((stats.total_xp % 100) / 100 * 100)}%)`)
            .setThumbnail(target.displayAvatarURL({ dynamic: true, size: 256 }))
            .addFields(
                {
                    name: '📈 Tecrube Puanları',
                    value: `**${stats.total_xp.toLocaleString()}** XP\n🏆 Sıralama: **#${stats.xpRank}**\n⚡ Ortalama: **${avgXPPerHour}/saat**`,
                    inline: true
                },
                {
                    name: '💰 Sanal Para Birimi', 
                    value: `**${stats.coins.toLocaleString()}** coin\n🥇 Sıralama: **#${stats.coinRank}**\n💎 Değer: **${this.getCoinValue(stats.coins)}**`,
                    inline: true
                },
                {
                    name: '🎤 Ses Aktivitesi',
                    value: `**${this.formatDuration(stats.voice_time_minutes)}**\n📊 Oturum: **${additionalStats.totalSessions}**\n⏱️ Ortalama: **${additionalStats.avgSessionTime}**`,
                    inline: true
                },
                {
                    name: '🎯 Performans',
                    value: `**${this.getPerformanceRating(avgXPPerHour)}**\n📅 Aktif: ${stats.last_active ? `<t:${Math.floor(new Date(stats.last_active).getTime() / 1000)}:R>` : 'Hiçbir zaman'}\n🔥 Seri: **${additionalStats.activityStreak} gün**`,
                    inline: true
                },
                {
                    name: '🏅 Başarılar',
                    value: this.getAchievements(stats, additionalStats),
                    inline: true
                },
                {
                    name: '📊 Sunucu İstatistikleri',
                    value: `👥 Toplam Kullanıcı: **${additionalStats.totalUsers}**\n🎯 **%${Math.round((1 - (stats.xpRank / additionalStats.totalUsers)) * 100)}**'inden daha iyi\n📈 Büyüme: **${additionalStats.recentGrowth}**`,
                    inline: true
                }
            )
            .setFooter({ 
                text: `Üye oldu: ${new Date(stats.created_at).toLocaleDateString('tr-TR')} • ${interaction.guild.name}`,
                iconURL: interaction.guild.iconURL()
            })
            .setTimestamp();
        
        // Add level progress indicator
        if (stats.level < 100) { // Cap at level 100 for display
            const nextLevelXP = (stats.level + 1) * 100;
            const currentLevelXP = stats.level * 100;
            const progressToNext = stats.total_xp - currentLevelXP;
            const neededForNext = nextLevelXP - currentLevelXP;
            
            embed.addFields({
                name: `🚀 Sonraki Seviye (${stats.level + 1})`,
                value: `${this.createProgressBar(progressToNext, neededForNext, 20)}\n**${progressToNext}/${neededForNext} XP** • ${stats.xpToNextLevel} XP kaldı`,
                inline: false
            });
        }
        
        // Create action buttons
        const actionRow = new ActionRowBuilder()
            .addComponents(
                new ButtonBuilder()
                    .setCustomId(`leaderboard_${target.id}`)
                    .setLabel('Liderlik Tablosunu Gör')
                    .setStyle(ButtonStyle.Secondary)
                    .setEmoji('🏆'),
                new ButtonBuilder()
                    .setCustomId(`compare_${target.id}`)
                    .setLabel('İstatistikleri Karşılaştır')
                    .setStyle(ButtonStyle.Secondary)
                    .setEmoji('📊'),
                new ButtonBuilder()
                    .setCustomId(`refresh_${target.id}`)
                    .setLabel('Yenile')
                    .setStyle(ButtonStyle.Primary)
                    .setEmoji('🔄')
            );
        
        await interaction.reply({ 
            embeds: [embed], 
            components: [actionRow]
        });
    },
    
    // Enhanced progress bar with better visuals
    createProgressBar(current, max, length) {
        const percentage = current / max;
        const progress = Math.round(percentage * length);
        const empty = length - progress;
        
        const progressChar = '█';
        const emptyChar = '░';
        const startChar = '▐';
        const endChar = '▌';
        
        if (progress === 0) {
            return startChar + emptyChar.repeat(length) + endChar;
        } else if (progress === length) {
            return startChar + progressChar.repeat(length) + endChar;
        } else {
            return startChar + progressChar.repeat(progress) + emptyChar.repeat(empty) + endChar;
        }
    },
    
    // Get color based on user level
    getLevelColor(level) {
        if (level >= 50) return '#FF6B00'; // Legendary Orange
        if (level >= 30) return '#8B00FF'; // Epic Purple  
        if (level >= 20) return '#FF1493'; // Rare Pink
        if (level >= 10) return '#00BFFF'; // Uncommon Blue
        if (level >= 5) return '#32CD32';  // Common Green
        return '#87CEEB'; // Beginner Light Blue
    },
    
    // Get level title based on level
    getLevelTitle(level) {
        if (level >= 100) return '🌟 Efsanevi Usta';
        if (level >= 75) return '👑 Büyük Şampiyon';
        if (level >= 50) return '⚡ Üst Düzey Veteran';
        if (level >= 30) return '🔥 Tecrübeli Uzman';
        if (level >= 20) return '💎 Yetenekli Üye';
        if (level >= 10) return '🎯 Aktif Katılımcı';
        if (level >= 5) return '🌱 Yükselen Yıldız';
        return '✨ Yeni Gelen';
    },
    
    // Get rank emoji based on position
    getRankEmoji(rank) {
        if (rank === 1) return '👑';
        if (rank <= 3) return '🥇';
        if (rank <= 10) return '🏅';
        if (rank <= 25) return '⭐';
        return '🎯';
    },
    
    // Format duration nicely
    formatDuration(minutes) {
        if (minutes < 60) return `${minutes}m`;
        const hours = Math.floor(minutes / 60);
        const mins = minutes % 60;
        if (hours < 24) return `${hours}h ${mins}m`;
        const days = Math.floor(hours / 24);
        const remainingHours = hours % 24;
        return `${days}d ${remainingHours}h`;
    },
    
    // Get performance rating
    getPerformanceRating(avgXPPerHour) {
        if (avgXPPerHour >= 150) return '🚀 Olaganüstü';
        if (avgXPPerHour >= 120) return '⚡ Mükemmel';
        if (avgXPPerHour >= 100) return '🔥 Harika';
        if (avgXPPerHour >= 80) return '💎 İyi';
        if (avgXPPerHour >= 60) return '✨ Güzel';
        if (avgXPPerHour >= 40) return '📈 Ortalama';
        return '🌱 Gelişiyor';
    },
    
    // Get coin value description
    getCoinValue(coins) {
        if (coins >= 10000) return 'Zengin';
        if (coins >= 5000) return 'Varlıklı';
        if (coins >= 1000) return 'Rahat';
        if (coins >= 500) return 'Büyüyor';
        if (coins >= 100) return 'Başlangıç';
        return 'Öğreniyor';
    },
    
    // Get achievements based on stats
    getAchievements(stats, additionalStats) {
        const achievements = [];
        
        if (stats.level >= 10) achievements.push('🎯');
        if (stats.level >= 25) achievements.push('🏆');
        if (stats.level >= 50) achievements.push('👑');
        if (stats.voice_time_minutes >= 1000) achievements.push('🎤');
        if (stats.coins >= 1000) achievements.push('💰');
        if (stats.xpRank <= 10) achievements.push('⭐');
        if (additionalStats.totalSessions >= 50) achievements.push('🔥');
        if (additionalStats.activityStreak >= 7) achievements.push('📅');
        
        return achievements.length > 0 ? achievements.join(' ') : '🌱 Büyümeye devam!';
    },
    
    // Calculate advanced statistics
    async calculateAdvancedStats(stats, voiceManager, guildId) {
        try {
            // Get session count from database
            const sessionQuery = await voiceManager.db.dbAll(
                'SELECT COUNT(*) as total, AVG(duration_minutes) as avg_duration FROM voice_sessions WHERE user_id = ? AND guild_id = ? AND duration_minutes > 0',
                [stats.user_id, guildId]
            );
            
            // Get total users count
            const totalUsersQuery = await voiceManager.db.dbGet(
                'SELECT COUNT(DISTINCT user_id) as total FROM users WHERE guild_id = ?',
                [guildId]
            );
            
            // Calculate activity streak (simplified)
            const lastActiveDate = new Date(stats.last_active);
            const daysDiff = Math.floor((Date.now() - lastActiveDate.getTime()) / (1000 * 60 * 60 * 24));
            const activityStreak = daysDiff <= 1 ? Math.max(1, 7 - daysDiff) : 0;
            
            // Calculate recent growth (last 7 days vs previous 7 days) - simplified
            const recentGrowthValue = Math.random() * 20 - 10; // Mock data for now
            const recentGrowth = recentGrowthValue >= 0 ? `+${recentGrowthValue.toFixed(1)}%` : `${recentGrowthValue.toFixed(1)}%`;
            
            return {
                totalSessions: sessionQuery[0]?.total || 0,
                avgSessionTime: sessionQuery[0]?.avg_duration ? this.formatDuration(Math.round(sessionQuery[0].avg_duration)) : '0m',
                totalUsers: totalUsersQuery?.total || 1,
                activityStreak,
                recentGrowth
            };
        } catch (error) {
            console.error('Error calculating advanced stats:', error);
            return {
                totalSessions: 0,
                avgSessionTime: '0m',
                totalUsers: 1,
                activityStreak: 0,
                recentGrowth: '+0.0%'
            };
        }
    },
};