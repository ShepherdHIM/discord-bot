const { SlashCommandBuilder, EmbedBuilder, PermissionFlagsBits } = require('discord.js');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('admin')
        .setDescription('Yöneticiler için kapsamlı yönetim komutları')
        .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild)
        .addSubcommand(subcommand =>
            subcommand
                .setName('xp-ver')
                .setDescription('Belirli bir kullanıcıya XP ver')
                .addUserOption(option =>
                    option.setName('kullanici')
                        .setDescription('XP verilecek kullanıcı')
                        .setRequired(true))
                .addIntegerOption(option =>
                    option.setName('miktar')
                        .setDescription('Verilecek XP miktarı')
                        .setRequired(true)
                        .setMinValue(1)
                        .setMaxValue(10000)))
        .addSubcommand(subcommand =>
            subcommand
                .setName('coin-ver')
                .setDescription('Belirli bir kullanıcıya coin ver')
                .addUserOption(option =>
                    option.setName('kullanici')
                        .setDescription('Coin verilecek kullanıcı')
                        .setRequired(true))
                .addIntegerOption(option =>
                    option.setName('miktar')
                        .setDescription('Verilecek coin miktarı')
                        .setRequired(true)
                        .setMinValue(1)
                        .setMaxValue(50000)))
        .addSubcommand(subcommand =>
            subcommand
                .setName('xp-al')
                .setDescription('Belirli bir kullanıcıdan XP al')
                .addUserOption(option =>
                    option.setName('kullanici')
                        .setDescription('XP alınacak kullanıcı')
                        .setRequired(true))
                .addIntegerOption(option =>
                    option.setName('miktar')
                        .setDescription('Alınacak XP miktarı')
                        .setRequired(true)
                        .setMinValue(1)
                        .setMaxValue(10000)))
        .addSubcommand(subcommand =>
            subcommand
                .setName('coin-al')
                .setDescription('Belirli bir kullanıcıdan coin al')
                .addUserOption(option =>
                    option.setName('kullanici')
                        .setDescription('Coin alınacak kullanıcı')
                        .setRequired(true))
                .addIntegerOption(option =>
                    option.setName('miktar')
                        .setDescription('Alınacak coin miktarı')
                        .setRequired(true)
                        .setMinValue(1)
                        .setMaxValue(50000)))
        .addSubcommand(subcommand =>
            subcommand
                .setName('sifirla')
                .setDescription('Belirli bir kullanıcının istatistiklerini sıfırla')
                .addUserOption(option =>
                    option.setName('kullanici')
                        .setDescription('İstatistikleri sıfırlanacak kullanıcı')
                        .setRequired(true))
                .addStringOption(option =>
                    option.setName('tur')
                        .setDescription('Sıfırlanacak istatistik türü')
                        .setRequired(true)
                        .addChoices(
                            { name: 'XP Sıfırla', value: 'xp' },
                            { name: 'Coin Sıfırla', value: 'coins' },
                            { name: 'Tümünü Sıfırla', value: 'all' }
                        )))
        .addSubcommand(subcommand =>
            subcommand
                .setName('xp-orani')
                .setDescription('Dakika başına XP oranını ayarla')
                .addIntegerOption(option =>
                    option.setName('miktar')
                        .setDescription('Dakika başına XP miktarı (1-50)')
                        .setRequired(true)
                        .setMinValue(1)
                        .setMaxValue(50)))
        .addSubcommand(subcommand =>
            subcommand
                .setName('coin-orani')
                .setDescription('Dakika başına coin oranını ayarla')
                .addIntegerOption(option =>
                    option.setName('miktar')
                        .setDescription('Dakika başına coin miktarı (1-25)')
                        .setRequired(true)
                        .setMinValue(1)
                        .setMaxValue(25)))
        .addSubcommand(subcommand =>
            subcommand
                .setName('xp-time')
                .setDescription('XP kazanma aralığını dakika olarak ayarla')
                .addIntegerOption(option =>
                    option.setName('dakika')
                        .setDescription('XP kazanma aralığı (1-60 dakika)')
                        .setRequired(true)
                        .setMinValue(1)
                        .setMaxValue(60)))
        .addSubcommand(subcommand =>
            subcommand
                .setName('coin-time')
                .setDescription('Coin kazanma aralığını dakika olarak ayarla')
                .addIntegerOption(option =>
                    option.setName('dakika')
                        .setDescription('Coin kazanma aralığı (1-60 dakika)')
                        .setRequired(true)
                        .setMinValue(1)
                        .setMaxValue(60)))
        .addSubcommand(subcommand =>
            subcommand
                .setName('oranlar-goster')
                .setDescription('Mevcut XP ve coin oranlarını göster'))
        .addSubcommand(subcommand =>
            subcommand
                .setName('oranlar-ayarla')
                .setDescription('XP ve coin oranlarını aynı anda ayarla')
                .addIntegerOption(option =>
                    option.setName('xp-miktar')
                        .setDescription('Dakika başına XP miktarı (1-50)')
                        .setRequired(true)
                        .setMinValue(1)
                        .setMaxValue(50))
                .addIntegerOption(option =>
                    option.setName('coin-miktar')
                        .setDescription('Dakika başına coin miktarı (1-25)')
                        .setRequired(true)
                        .setMinValue(1)
                        .setMaxValue(25)))
        .addSubcommand(subcommand =>
            subcommand
                .setName('xp-range-ekle')
                .setDescription('XP ödül aralığı ekle')
                .addIntegerOption(option =>
                    option.setName('min')
                        .setDescription('Minimum XP miktarı')
                        .setRequired(true)
                        .setMinValue(1)
                        .setMaxValue(10000))
                .addIntegerOption(option =>
                    option.setName('max')
                        .setDescription('Maksimum XP miktarı')
                        .setRequired(true)
                        .setMinValue(1)
                        .setMaxValue(10000))
                .addIntegerOption(option =>
                    option.setName('sure')
                        .setDescription('Ödül süresi (dakika)')
                        .setRequired(true)
                        .setMinValue(1)
                        .setMaxValue(1440)))
        .addSubcommand(subcommand =>
            subcommand
                .setName('coin-range-ekle')
                .setDescription('Coin ödül aralığı ekle')
                .addIntegerOption(option =>
                    option.setName('min')
                        .setDescription('Minimum coin miktarı')
                        .setRequired(true)
                        .setMinValue(1)
                        .setMaxValue(50000))
                .addIntegerOption(option =>
                    option.setName('max')
                        .setDescription('Maksimum coin miktarı')
                        .setRequired(true)
                        .setMinValue(1)
                        .setMaxValue(50000))
                .addIntegerOption(option =>
                    option.setName('sure')
                        .setDescription('Ödül süresi (dakika)')
                        .setRequired(true)
                        .setMinValue(1)
                        .setMaxValue(1440)))
        .addSubcommand(subcommand =>
            subcommand
                .setName('range-liste')
                .setDescription('Tüm ödül aralıklarını listele')),

    async execute(interaction) {
        // Defer reply early for admin commands
        try {
            if (!interaction.replied && !interaction.deferred) {
                await interaction.deferReply({ ephemeral: true });
            }
        } catch (error) {
            console.log('Could not defer admin interaction:', error);
            return;
        }
        
        // Get voice manager from client
        const voiceManager = interaction.client.voiceManager;
        if (!voiceManager) {
            return interaction.editReply({ content: 'Ses takip sistemi başlatılmamış!' });
        }
        
        const subcommand = interaction.options.getSubcommand();
        const targetUser = interaction.options.getUser('kullanici');
        const amount = interaction.options.getInteger('miktar');
        const type = interaction.options.getString('tur');
        const minutes = interaction.options.getInteger('dakika');
        
        // Handle reward range commands
        if (subcommand === 'xp-range-ekle') {
            const minAmount = interaction.options.getInteger('min');
            const maxAmount = interaction.options.getInteger('max');
            const duration = interaction.options.getInteger('sure');
            
            if (minAmount > maxAmount) {
                return interaction.editReply({ 
                    content: '❌ Minimum miktar maksimum miktardan büyük olamaz!' 
                });
            }
            
            const success = await voiceManager.db.addRewardRange(
                interaction.guildId, 
                'xp', 
                minAmount, 
                maxAmount, 
                duration
            );
            
            if (success) {
                const embed = new EmbedBuilder()
                    .setColor('#00ff00')
                    .setTitle('✅ XP Ödül Aralığı Eklendi!')
                    .setDescription(`XP ödül aralığı başarıyla eklendi!`)
                    .addFields(
                        { name: '⚡ XP Aralığı', value: `${minAmount} - ${maxAmount} XP`, inline: true },
                        { name: '⏱️ Süre', value: `${duration} dakika`, inline: true },
                        { name: '👑 Yönetici', value: interaction.user.toString(), inline: true }
                    )
                    .setTimestamp();
                
                return interaction.editReply({ embeds: [embed] });
            } else {
                return interaction.editReply({ content: '❌ XP ödül aralığı eklenirken bir hata oluştu!' });
            }
        }
        
        if (subcommand === 'coin-range-ekle') {
            const minAmount = interaction.options.getInteger('min');
            const maxAmount = interaction.options.getInteger('max');
            const duration = interaction.options.getInteger('sure');
            
            if (minAmount > maxAmount) {
                return interaction.editReply({ 
                    content: '❌ Minimum miktar maksimum miktardan büyük olamaz!' 
                });
            }
            
            const success = await voiceManager.db.addRewardRange(
                interaction.guildId, 
                'coin', 
                minAmount, 
                maxAmount, 
                duration
            );
            
            if (success) {
                const embed = new EmbedBuilder()
                    .setColor('#00ff00')
                    .setTitle('✅ Coin Ödül Aralığı Eklendi!')
                    .setDescription(`Coin ödül aralığı başarıyla eklendi!`)
                    .addFields(
                        { name: '🪙 Coin Aralığı', value: `${minAmount} - ${maxAmount} coin`, inline: true },
                        { name: '⏱️ Süre', value: `${duration} dakika`, inline: true },
                        { name: '👑 Yönetici', value: interaction.user.toString(), inline: true }
                    )
                    .setTimestamp();
                
                return interaction.editReply({ embeds: [embed] });
            } else {
                return interaction.editReply({ content: '❌ Coin ödül aralığı eklenirken bir hata oluştu!' });
            }
        }
        
        if (subcommand === 'range-liste') {
            const rewardRanges = await voiceManager.db.getRewardRanges(interaction.guildId);
            
            if (rewardRanges.length === 0) {
                return interaction.editReply({ 
                    content: '❌ Bu sunucuda henüz ödül aralığı ayarlanmamış!' 
                });
            }
            
            // Separate XP and Coin ranges
            const xpRanges = rewardRanges.filter(range => range.reward_type === 'xp');
            const coinRanges = rewardRanges.filter(range => range.reward_type === 'coin');
            
            let description = '';
            
            if (xpRanges.length > 0) {
                description += '**⚡ XP Ödül Aralıkları:**\n';
                for (const range of xpRanges) {
                    description += `- ${range.min_amount} - ${range.max_amount} XP (Her ${range.duration_minutes} dakikada bir)\n`;
                }
                description += '\n';
            }
            
            if (coinRanges.length > 0) {
                description += '**🪙 Coin Ödül Aralıkları:**\n';
                for (const range of coinRanges) {
                    description += `- ${range.min_amount} - ${range.max_amount} coin (Her ${range.duration_minutes} dakikada bir)\n`;
                }
            }
            
            const embed = new EmbedBuilder()
                .setColor('#0099ff')
                .setTitle('📋 Ödül Aralığı Listesi')
                .setDescription(description)
                .setFooter({ 
                    text: `${interaction.guild.name} • Toplam ${rewardRanges.length} ödül aralığı`,
                    iconURL: interaction.guild.iconURL()
                })
                .setTimestamp();
            
            return interaction.editReply({ embeds: [embed] });
        }
        
        // Handle rate management commands first
        if (subcommand === 'xp-orani') {
            const xpPerMinute = interaction.options.getInteger('miktar');
            
            const currentSettings = await voiceManager.db.getGuildSettings(interaction.guildId);
            const newSettings = {
                ...currentSettings,
                xp_per_minute: xpPerMinute
            };
            
            await voiceManager.db.updateGuildSettings(interaction.guildId, newSettings);
            
            const embed = new EmbedBuilder()
                .setColor('#00ff00')
                .setTitle('✅ XP Oranı Güncellendi!')
                .addFields(
                    { name: '⚡ Yeni XP Oranı', value: `${xpPerMinute} XP dakika başı`, inline: true }
                )
                .setTimestamp();
            
            return interaction.editReply({ embeds: [embed] });
        }
        
        if (subcommand === 'coin-orani') {
            const coinsPerMinute = interaction.options.getInteger('miktar');
            
            const currentSettings = await voiceManager.db.getGuildSettings(interaction.guildId);
            const newSettings = {
                ...currentSettings,
                coins_per_minute: coinsPerMinute
            };
            
            await voiceManager.db.updateGuildSettings(interaction.guildId, newSettings);
            
            const embed = new EmbedBuilder()
                .setColor('#00ff00')
                .setTitle('✅ Coin Oranı Güncellendi!')
                .addFields(
                    { name: '🪙 Yeni Coin Oranı', value: `${coinsPerMinute} coin dakika başı`, inline: true }
                )
                .setTimestamp();
            
            return interaction.editReply({ embeds: [embed] });
        }
        
        if (subcommand === 'xp-time') {
            const xpIntervalMinutes = interaction.options.getInteger('dakika');
            
            const currentSettings = await voiceManager.db.getGuildSettings(interaction.guildId);
            const newSettings = {
                ...currentSettings,
                xp_interval_minutes: xpIntervalMinutes
            };
            
            await voiceManager.db.updateGuildSettings(interaction.guildId, newSettings);
            
            const embed = new EmbedBuilder()
                .setColor('#00ff00')
                .setTitle('✅ XP Zaman Aralığı Güncellendi!')
                .addFields(
                    { name: '⚡ Yeni XP Aralığı', value: `Her ${xpIntervalMinutes} dakikada bir`, inline: true }
                )
                .setTimestamp();
            
            return interaction.editReply({ embeds: [embed] });
        }
        
        if (subcommand === 'coin-time') {
            const coinIntervalMinutes = interaction.options.getInteger('dakika');
            
            const currentSettings = await voiceManager.db.getGuildSettings(interaction.guildId);
            const newSettings = {
                ...currentSettings,
                coin_interval_minutes: coinIntervalMinutes
            };
            
            await voiceManager.db.updateGuildSettings(interaction.guildId, newSettings);
            
            const embed = new EmbedBuilder()
                .setColor('#00ff00')
                .setTitle('✅ Coin Zaman Aralığı Güncellendi!')
                .addFields(
                    { name: '🪙 Yeni Coin Aralığı', value: `Her ${coinIntervalMinutes} dakikada bir`, inline: true }
                )
                .setTimestamp();
            
            return interaction.editReply({ embeds: [embed] });
        }
        
        if (subcommand === 'oranlar-goster') {
            const settings = await voiceManager.db.getGuildSettings(interaction.guildId);
            
            const embed = new EmbedBuilder()
                .setColor('#0099ff')
                .setTitle('🎤 Mevcut XP ve Coin Oranları')
                .setThumbnail(interaction.guild.iconURL())
                .addFields(
                    { name: '⚡ Dakika Başına XP', value: settings.xp_per_minute.toString(), inline: true },
                    { name: '🪙 Dakika Başına Coin', value: settings.coins_per_minute.toString(), inline: true },
                    { name: '👥 Minimum Üye Sayısı', value: settings.min_members_required.toString(), inline: true },
                    { name: '⏱️ XP Aralığı', value: `${settings.xp_interval_minutes || 1} dakika`, inline: true },
                    { name: '⏱️ Coin Aralığı', value: `${settings.coin_interval_minutes || 1} dakika`, inline: true }
                )
                .addFields(
                    { name: '📊 Günlük Maksimum Kazanç', value: `${settings.xp_per_minute * 60 * 24} XP / ${settings.coins_per_minute * 60 * 24} Coin`, inline: false },
                    { name: '📈 Saatlik Ortalama', value: `${settings.xp_per_minute * 60} XP / ${settings.coins_per_minute * 60} Coin`, inline: false }
                )
                .setFooter({ 
                    text: `Son güncelleme: ${new Date(settings.updated_at).toLocaleString('tr-TR')}`,
                    iconURL: interaction.guild.iconURL()
                })
                .setTimestamp();
            
            return interaction.editReply({ embeds: [embed] });
        }
        
        if (subcommand === 'oranlar-ayarla') {
            const xpPerMinute = interaction.options.getInteger('xp-miktar');
            const coinsPerMinute = interaction.options.getInteger('coin-miktar');
            
            const currentSettings = await voiceManager.db.getGuildSettings(interaction.guildId);
            const newSettings = {
                ...currentSettings,
                xp_per_minute: xpPerMinute,
                coins_per_minute: coinsPerMinute
            };
            
            await voiceManager.db.updateGuildSettings(interaction.guildId, newSettings);
            
            const embed = new EmbedBuilder()
                .setColor('#00ff00')
                .setTitle('✅ Tüm Oranlar Güncellendi!')
                .setDescription('XP ve Coin oranları başarıyla güncellendi!\nYeni zaman aralıklarını ayarlamak için `/admin xp-time` ve `/admin coin-time` komutlarını kullanın.')
                .addFields(
                    { name: '⚡ Yeni XP Oranı', value: `${xpPerMinute} XP/dakika`, inline: true },
                    { name: '🪙 Yeni Coin Oranı', value: `${coinsPerMinute} coin/dakika`, inline: true },
                    { name: '📊 Saatlik Kazanç', value: `${xpPerMinute * 60} XP / ${coinsPerMinute * 60} Coin`, inline: true }
                )
                .addFields(
                    { name: '📈 Günlük Potansiyel', value: `${xpPerMinute * 60 * 24} XP / ${coinsPerMinute * 60 * 24} Coin`, inline: false },
                    { name: '👑 Yönetici', value: interaction.user.toString(), inline: true },
                    { name: '📅 Güncelleme Zamanı', value: `<t:${Math.floor(Date.now() / 1000)}:F>`, inline: true }
                )
                .setFooter({ 
                    text: `${interaction.guild.name} • Rate Management System`,
                    iconURL: interaction.guild.iconURL()
                })
                .setTimestamp();
            
            return interaction.editReply({ embeds: [embed] });
        }
        
        // Get target user's current stats for reward commands
        const userStats = await voiceManager.getUserStats(targetUser.id, interaction.guildId);
        if (!userStats) {
            return interaction.editReply({ 
                content: `❌ ${targetUser.username} henüz sistemde kayıtlı değil! Önce ses kanalına girmesi gerekiyor.`
            });
        }
        
        let newXP = userStats.total_xp;
        let newCoins = userStats.coins;
        let actionText = '';
        
        switch (subcommand) {
            case 'xp-ver':
                newXP = userStats.total_xp + amount;
                actionText = `+${amount} XP eklendi`;
                break;
                
            case 'coin-ver':
                newCoins = userStats.coins + amount;
                actionText = `+${amount} coin eklendi`;
                break;
                
            case 'xp-al':
                newXP = Math.max(0, userStats.total_xp - amount);
                const actualXPRemoved = userStats.total_xp - newXP;
                actionText = `-${actualXPRemoved} XP alındı`;
                break;
                
            case 'coin-al':
                newCoins = Math.max(0, userStats.coins - amount);
                const actualCoinsRemoved = userStats.coins - newCoins;
                actionText = `-${actualCoinsRemoved} coin alındı`;
                break;
                
            case 'sifirla':
                switch (type) {
                    case 'xp':
                        newXP = 0;
                        actionText = 'XP sıfırlandı';
                        break;
                    case 'coins':
                        newCoins = 0;
                        actionText = 'Coin sıfırlandı';
                        break;
                    case 'all':
                        newXP = 0;
                        newCoins = 0;
                        actionText = 'Tüm istatistikler sıfırlandı';
                        break;
                }
                break;
        }
        
        // Update user stats
        await voiceManager.db.updateUserStats(
            targetUser.id,
            interaction.guildId,
            newXP,
            newCoins,
            userStats.voice_time_minutes
        );
        
        // Check for level changes when XP is modified
        const oldLevel = Math.floor(userStats.total_xp / 100);
        const newLevel = Math.floor(newXP / 100);
        
        if (newLevel !== oldLevel) {
            // Get member object for role assignment
            const member = interaction.guild.members.cache.get(targetUser.id);
            if (member) {
                if (newLevel > oldLevel) {
                    // Level up
                    console.log(`🎉 User ${targetUser.username} leveled up from ${oldLevel} to ${newLevel} through admin XP modification`);
                    await voiceManager.handleLevelUp(member, newLevel);
                } else if (newLevel < oldLevel) {
                    // Level down - remove all higher level roles and assign new one if configured
                    console.log(`⚠️ User ${targetUser.username} leveled down from ${oldLevel} to ${newLevel} through admin XP modification`);
                    await voiceManager.assignLevelRole(member, newLevel);
                }
            }
        }

        // Create success embed
        const embed = new EmbedBuilder()
            .setColor('#00ff00')
            .setTitle('✅ Ödül Yönetimi Başarılı!')
            .setThumbnail(targetUser.displayAvatarURL({ dynamic: true }))
            .addFields(
                { name: '👤 Kullanıcı', value: targetUser.toString(), inline: true },
                { name: '🔧 İşlem', value: actionText, inline: true },
                { name: '⚡ Yeni XP', value: `${newXP.toLocaleString()} XP (Seviye ${Math.floor(newXP / 100)})`, inline: true },
                { name: '💰 Yeni Coin', value: `${newCoins.toLocaleString()} coin`, inline: true },
                { name: '👑 Yönetici', value: interaction.user.toString(), inline: true },
                { name: '📅 Tarih', value: `<t:${Math.floor(Date.now() / 1000)}:F>`, inline: true }
            )
            .setFooter({ 
                text: `${interaction.guild.name} • Yönetici Ödül Sistemi`,
                iconURL: interaction.guild.iconURL()
            })
            .setTimestamp();
        
        await interaction.editReply({ embeds: [embed] });
        
        // Log the action (optional: send to a log channel)
        console.log(`🔧 Admin ${interaction.user.tag} performed reward action on ${targetUser.tag}: ${actionText}`);
    },
};