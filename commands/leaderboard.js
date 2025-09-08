const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('liderlik_tablosu')
        .setDescription('Sunucu liderlik tablolarini goruntuleyin')
        .addStringOption(option =>
            option.setName('tur')
                .setDescription('Goruntulemek icin liderlik tablosu turu')
                .setRequired(false)
                .addChoices(
                    { name: 'XP Liderlik Tablosu', value: 'xp' },
                    { name: 'Coin Liderlik Tablosu', value: 'coins' },
                    { name: 'Ses Süresi Liderlik Tablosu', value: 'voice_time' }
                ))
        .addIntegerOption(option =>
            option.setName('sinir')
                .setDescription('Gosterilecek kullanici sayisi (1-25)')
                .setRequired(false)
                .setMinValue(1)
                .setMaxValue(25)),
    
    async execute(interaction) {
        // Defer the reply immediately to prevent timeout
        if (!interaction.replied && !interaction.deferred) {
            await interaction.deferReply();
        }
        
        const type = interaction.options.getString('tur') || 'xp';
        const limit = interaction.options.getInteger('sinir') || 10;
        
        // Get voice manager from client
        const voiceManager = interaction.client.voiceManager;
        if (!voiceManager) {
            return interaction.editReply({ content: 'Ses takip sistemi başlatılmamış!' });
        }
        
        let leaderboard;
        let title, emoji, field, unit;
        
        switch (type) {
            case 'xp':
                leaderboard = await voiceManager.db.getXPLeaderboard(interaction.guildId, limit);
                title = 'XP Liderlik Tablosu';
                emoji = '🏆';
                field = 'total_xp';
                unit = 'XP';
                break;
            case 'coins':
                leaderboard = await voiceManager.db.getCoinLeaderboard(interaction.guildId, limit);
                title = 'Coin Liderlik Tablosu';
                emoji = '🪙';
                field = 'coins';
                unit = 'coin';
                break;
            case 'voice_time':
                // Custom query for voice time leaderboard
                leaderboard = await voiceManager.db.dbAll(`
                    SELECT user_id, username, total_xp, coins, voice_time_minutes, last_active 
                    FROM users WHERE guild_id = ? ORDER BY voice_time_minutes DESC LIMIT ?
                `, [interaction.guildId, limit]);
                title = 'Ses Süresi Liderlik Tablosu';
                emoji = '🎤';
                field = 'voice_time_minutes';
                unit = 'dakika';
                break;
        }
        
        if (!leaderboard || leaderboard.length === 0) {
            return interaction.editReply({ 
                content: 'Liderlik tablosunda hiç kullanıcı bulunamadı! Ödül kazanmaya başlamak için ses kanallarına katılın! 🎤'
            });
        }
        
        // Create a more professional table-like format
        let tableContent = '```\n';
        tableContent += `${emoji} ${title}\n`;
        tableContent += '='.repeat(45) + '\n';
        tableContent += '#  Kullanıcı Adı'.padEnd(25) + 'Değer'.padEnd(15) + 'Seviye\n';
        tableContent += '-'.repeat(45) + '\n';
        
        for (let i = 0; i < leaderboard.length; i++) {
            const user = leaderboard[i];
            const rank = i + 1;
            const medal = this.getRankMedal(rank);
            
            let value, levelInfo = '';
            switch (type) {
                case 'xp':
                    const level = Math.floor(user.total_xp / 100);
                    value = `${user.total_xp.toLocaleString()} ${unit}`.padEnd(15);
                    levelInfo = `Lvl ${level}`;
                    break;
                case 'coins':
                    value = `${user.coins.toLocaleString()} ${unit}`.padEnd(15);
                    levelInfo = '';
                    break;
                case 'voice_time':
                    const hours = Math.floor(user.voice_time_minutes / 60);
                    const minutes = user.voice_time_minutes % 60;
                    value = `${hours}h ${minutes}m`.padEnd(15);
                    levelInfo = '';
                    break;
            }
            
            // Try to get current username
            const member = interaction.guild.members.cache.get(user.user_id);
            const displayName = member ? member.displayName : user.username;
            // Truncate display name if too long
            const truncatedName = displayName.length > 20 ? displayName.substring(0, 17) + '...' : displayName;
            
            tableContent += `${medal} ${rank.toString().padEnd(2)} ${truncatedName.padEnd(20)} ${value} ${levelInfo}\n`;
        }
        
        tableContent += '='.repeat(45) + '\n';
        tableContent += `Toplam ${leaderboard.length} kullanıcı gösteriliyor\n`;
        tableContent += '```';
        
        // Add user's rank if they're not in top results
        let userRankInfo = '';
        const currentUserStats = await voiceManager.getUserStats(interaction.user.id, interaction.guildId);
        if (currentUserStats) {
            let userRank;
            switch (type) {
                case 'xp':
                    userRank = currentUserStats.xpRank;
                    break;
                case 'coins':
                    userRank = currentUserStats.coinRank;
                    break;
                case 'voice_time':
                    // Calculate voice time rank
                    const result = await voiceManager.db.dbGet(`
                        SELECT COUNT(*) + 1 as rank FROM users 
                        WHERE guild_id = ? AND voice_time_minutes > ?
                    `, [interaction.guildId, currentUserStats.voice_time_minutes]);
                    userRank = result.rank;
                    break;
            }
            
            if (userRank > limit) {
                userRankInfo = `\n📍 Sizin sıralamanız: #${userRank}`;
            } else {
                userRankInfo = `\n📍 Sizin sıralamanız: #${userRank} (Bu sayfada)`;
            }
        }
        
        const embed = new EmbedBuilder()
            .setColor('#FFD700')
            .setTitle(`${emoji} ${title}`)
            .setDescription(tableContent + userRankInfo)
            .setThumbnail(interaction.guild.iconURL())
            .setTimestamp()
            .setFooter({ 
                text: `${interaction.guild.name} • En iyi ${leaderboard.length} kullanıcı`,
                iconURL: interaction.guild.iconURL()
            });
        
        await interaction.editReply({ embeds: [embed] });
    },
    
    getRankMedal(rank) {
        switch (rank) {
            case 1: return '🥇';
            case 2: return '🥈';
            case 3: return '🥉';
            default: return '🏅';
        }
    },
};