const { SlashCommandBuilder, EmbedBuilder, PermissionFlagsBits, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('oranyonetimi')
        .setDescription('Kapsamlı XP ve coin oran yönetim sistemi')
        .setDefaultMemberPermissions(PermissionFlagsBits.Administrator)
        .addSubcommand(subcommand =>
            subcommand
                .setName('goster')
                .setDescription('Tüm oranları ve istatistikleri göster'))
        .addSubcommand(subcommand =>
            subcommand
                .setName('hizli_ayar')
                .setDescription('Önceden tanımlanmış oran setlerini kullan')
                .addStringOption(option =>
                    option.setName('profil')
                        .setDescription('Oran profili seçin')
                        .setRequired(true)
                        .addChoices(
                            { name: 'Düşük Oran (1 XP, 1 Coin)', value: 'low' },
                            { name: 'Normal Oran (3 XP, 2 Coin)', value: 'normal' },
                            { name: 'Yüksek Oran (5 XP, 3 Coin)', value: 'high' },
                            { name: 'Premium Oran (8 XP, 5 Coin)', value: 'premium' },
                            { name: 'Maksimum Oran (10 XP, 7 Coin)', value: 'max' }
                        )))
        .addSubcommand(subcommand =>
            subcommand
                .setName('hesaplama')
                .setDescription('Farklı senaryolar için kazanç hesapla')
                .addIntegerOption(option =>
                    option.setName('dakika')
                        .setDescription('Hesaplanacak dakika sayısı')
                        .setRequired(true)
                        .setMinValue(1)
                        .setMaxValue(1440)))
        .addSubcommand(subcommand =>
            subcommand
                .setName('karsilastir')
                .setDescription('Mevcut oranları farklı profillerle karşılaştır')),
    
    async execute(interaction) {
        // Defer reply early for admin commands
        try {
            if (!interaction.replied && !interaction.deferred) {
                await interaction.deferReply({ ephemeral: true });
            }
        } catch (error) {
            console.log('Could not defer rate management interaction:', error);
            return;
        }
        
        // Get voice manager from client
        const voiceManager = interaction.client.voiceManager;
        if (!voiceManager) {
            return interaction.editReply({ content: 'Ses takip sistemi başlatılmamış!' });
        }
        
        const subcommand = interaction.options.getSubcommand();
        
        switch (subcommand) {
            case 'goster':
                await this.showRates(interaction, voiceManager);
                break;
            case 'hizli_ayar':
                await this.quickSetRates(interaction, voiceManager);
                break;
            case 'hesaplama':
                await this.calculateEarnings(interaction, voiceManager);
                break;
            case 'karsilastir':
                await this.compareRates(interaction, voiceManager);
                break;
        }
    },
    
    async showRates(interaction, voiceManager) {
        const settings = await voiceManager.getGuildSettings(interaction.guildId);
        
        // Calculate various time frame earnings
        const hourlyXP = settings.xp_per_minute * 60;
        const hourlyCoin = settings.coins_per_minute * 60;
        const dailyXP = hourlyXP * 24;
        const dailyCoin = hourlyCoin * 24;
        const weeklyXP = dailyXP * 7;
        const weeklyCoin = dailyCoin * 7;
        
        const embed = new EmbedBuilder()
            .setColor('#0099ff')
            .setTitle('📊 Detaylı Oran Analizi')
            .setDescription('Mevcut XP ve coin oranları ile kazanç projeksiyonları')
            .setThumbnail(interaction.guild.iconURL())
            .addFields(
                { name: '⚡ Mevcut XP Oranı', value: `${settings.xp_per_minute} XP/dakika`, inline: true },
                { name: '🪙 Mevcut Coin Oranı', value: `${settings.coins_per_minute} coin/dakika`, inline: true },
                { name: '👥 Min. Üye Sayısı', value: `${settings.min_members_required} kişi`, inline: true },
                { name: '📈 Saatlik Kazanç', value: `${hourlyXP} XP\n${hourlyCoin} Coin`, inline: true },
                { name: '📊 Günlük Kazanç', value: `${dailyXP} XP\n${dailyCoin} Coin`, inline: true },
                { name: '📈 Haftalık Kazanç', value: `${weeklyXP} XP\n${weeklyCoin} Coin`, inline: true },
                { name: '🎯 Seviye Hızı', value: `${Math.ceil(100 / settings.xp_per_minute)} dakika/seviye`, inline: true },
                { name: '💰 Zenginlik Oranı', value: `${(settings.coins_per_minute / settings.xp_per_minute * 100).toFixed(1)}% coin/XP`, inline: true },
                { name: '⚖️ Oran Dengesi', value: this.getRateBalance(settings.xp_per_minute, settings.coins_per_minute), inline: true }
            )
            .setFooter({ 
                text: `Son güncelleme: ${new Date(settings.updated_at).toLocaleString('tr-TR')} • ${interaction.guild.name}`,
                iconURL: interaction.guild.iconURL()
            })
            .setTimestamp();
        
        const row = new ActionRowBuilder()
            .addComponents(
                new ButtonBuilder()
                    .setCustomId('rate_quickset')
                    .setLabel('Hızlı Ayar')
                    .setEmoji('⚡')
                    .setStyle(ButtonStyle.Primary),
                new ButtonBuilder()
                    .setCustomId('rate_compare')
                    .setLabel('Karşılaştır')
                    .setEmoji('📊')
                    .setStyle(ButtonStyle.Secondary),
                new ButtonBuilder()
                    .setCustomId('rate_calculate')
                    .setLabel('Hesapla')
                    .setEmoji('🧮')
                    .setStyle(ButtonStyle.Success)
            );
        
        await interaction.editReply({ embeds: [embed], components: [row] });
    },
    
    async quickSetRates(interaction, voiceManager, profileType = null) {
        const profile = profileType || interaction.options?.getString('profil');
        
        const rateProfiles = {
            'low': { xp: 1, coin: 1, name: 'Düşük Oran' },
            'normal': { xp: 3, coin: 2, name: 'Normal Oran' },
            'high': { xp: 5, coin: 3, name: 'Yüksek Oran' },
            'premium': { xp: 8, coin: 5, name: 'Premium Oran' },
            'max': { xp: 10, coin: 7, name: 'Maksimum Oran' }
        };
        
        const selectedProfile = rateProfiles[profile];
        
        const currentSettings = await voiceManager.getGuildSettings(interaction.guildId);
        const newSettings = {
            ...currentSettings,
            xp_per_minute: selectedProfile.xp,
            coins_per_minute: selectedProfile.coin
        };
        
        await voiceManager.updateGuildSettings(interaction.guildId, newSettings);
        
        const embed = new EmbedBuilder()
            .setColor('#00ff00')
            .setTitle('✅ Hızlı Oran Ayarı Tamamlandı!')
            .setDescription(`**${selectedProfile.name}** profili başarıyla uygulandı!`)
            .addFields(
                { name: '⚡ Yeni XP Oranı', value: `${selectedProfile.xp} XP/dakika`, inline: true },
                { name: '🪙 Yeni Coin Oranı', value: `${selectedProfile.coin} coin/dakika`, inline: true },
                { name: '📊 Profil Tipi', value: selectedProfile.name, inline: true },
                { name: '📈 Saatlik Beklenti', value: `${selectedProfile.xp * 60} XP / ${selectedProfile.coin * 60} Coin`, inline: false },
                { name: '🎯 Seviye Hızı', value: `${Math.ceil(100 / selectedProfile.xp)} dakika/seviye`, inline: true },
                { name: '👑 Yönetici', value: interaction.user.toString(), inline: true }
            )
            .setFooter({ 
                text: `${interaction.guild.name} • Oran Yönetim Sistemi`,
                iconURL: interaction.guild.iconURL()
            })
            .setTimestamp();
        
        await interaction.editReply({ embeds: [embed] });
    },
    
    async calculateEarnings(interaction, voiceManager, minutes = null) {
        const timeMinutes = minutes || interaction.options?.getInteger('dakika');
        const settings = await voiceManager.getGuildSettings(interaction.guildId);
        
        const totalXP = settings.xp_per_minute * timeMinutes;
        const totalCoins = settings.coins_per_minute * timeMinutes;
        const levels = Math.floor(totalXP / 100);
        
        const hours = Math.floor(timeMinutes / 60);
        const remainingMinutes = timeMinutes % 60;
        
        const embed = new EmbedBuilder()
            .setColor('#FFD700')
            .setTitle('🧮 Kazanç Hesaplaması')
            .setDescription(`**${hours}s ${remainingMinutes}d** süre için kazanç hesabı`)
            .addFields(
                { name: '⚡ Toplam XP', value: `${totalXP.toLocaleString()} XP`, inline: true },
                { name: '🪙 Toplam Coin', value: `${totalCoins.toLocaleString()} coin`, inline: true },
                { name: '🎯 Seviye Artışı', value: `${levels} seviye`, inline: true },
                { name: '📊 Dakikalık Oran', value: `${settings.xp_per_minute} XP / ${settings.coins_per_minute} Coin`, inline: true },
                { name: '⏱️ Hesaplanan Süre', value: `${timeMinutes} dakika`, inline: true },
                { name: '💎 Değer Oranı', value: `${(totalCoins / totalXP * 100).toFixed(1)}% coin/XP`, inline: true }
            )
            .setFooter({ 
                text: `${interaction.guild.name} • Kazanç Hesaplayıcı`,
                iconURL: interaction.guild.iconURL()
            })
            .setTimestamp();
        
        await interaction.editReply({ embeds: [embed] });
    },
    
    async compareRates(interaction, voiceManager) {
        const settings = await voiceManager.getGuildSettings(interaction.guildId);
        
        const profiles = {
            'Düşük': { xp: 1, coin: 1 },
            'Normal': { xp: 3, coin: 2 },
            'Yüksek': { xp: 5, coin: 3 },
            'Premium': { xp: 8, coin: 5 },
            'Maksimum': { xp: 10, coin: 7 },
            'Mevcut': { xp: settings.xp_per_minute, coin: settings.coins_per_minute }
        };
        
        let comparisonText = '';
        
        Object.entries(profiles).forEach(([name, rates]) => {
            const hourlyXP = rates.xp * 60;
            const hourlyCoin = rates.coin * 60;
            const isCurrentProfile = name === 'Mevcut';
            const prefix = isCurrentProfile ? '**→ ' : '   ';
            const suffix = isCurrentProfile ? ' ←**' : '';
            
            comparisonText += `${prefix}${name}: ${rates.xp} XP/dk (${hourlyXP}/saat) | ${rates.coin} coin/dk (${hourlyCoin}/saat)${suffix}\n`;
        });
        
        const embed = new EmbedBuilder()
            .setColor('#FF6B00')
            .setTitle('📊 Oran Karşılaştırması')
            .setDescription('Farklı oran profillerinin karşılaştırılması')
            .addFields(
                { name: '📈 Profil Karşılaştırması', value: comparisonText, inline: false },
                { name: '🎯 Öneriler', value: this.getRateRecommendation(settings.xp_per_minute, settings.coins_per_minute), inline: false }
            )
            .setFooter({ 
                text: `${interaction.guild.name} • Oran Karşılaştırma Aracı`,
                iconURL: interaction.guild.iconURL()
            })
            .setTimestamp();
        
        await interaction.editReply({ embeds: [embed] });
    },
    
    getRateBalance(xpRate, coinRate) {
        const ratio = coinRate / xpRate;
        if (ratio < 0.5) return '🔴 Coin düşük';
        if (ratio < 0.7) return '🟡 Dengeli';
        if (ratio < 1.0) return '🟢 İyi denge';
        return '🔵 Coin yüksek';
    },
    
    getRateRecommendation(xpRate, coinRate) {
        const ratio = coinRate / xpRate;
        
        if (xpRate <= 2) {
            return '💡 Düşük oranlar: Yeni sunucular için uygun, daha yüksek oranları deneyebilirsiniz.';
        } else if (xpRate <= 5) {
            return '✅ Orta oranlar: Çoğu sunucu için ideal, dengeli ilerleme sağlar.';
        } else if (xpRate <= 8) {
            return '🚀 Yüksek oranlar: Aktif topluluklar için mükemmel, hızlı ilerleme.';
        } else {
            return '⚡ Maksimum oranlar: Çok aktif sunucular için, aşırı hızlı ilerleme sağlar.';
        }
    },
    
    async showQuickSetMenu(interaction) {
        const { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
        
        const embed = new EmbedBuilder()
            .setColor('#FFD700')
            .setTitle('⚡ Hızlı Oran Ayarı')
            .setDescription('Önceden tanımlanmış oran profillerinden birini seçin:')
            .addFields(
                {
                    name: '🔴 Düşük Oran',
                    value: '1 XP/dakika • 1 Coin/dakika\n• Yeni sunucular için ideal',
                    inline: true
                },
                {
                    name: '🟡 Normal Oran',
                    value: '3 XP/dakika • 2 Coin/dakika\n• Çoğu sunucu için uygun',
                    inline: true
                },
                {
                    name: '🟠 Yüksek Oran',
                    value: '5 XP/dakika • 3 Coin/dakika\n• Aktif topluluklar için',
                    inline: true
                },
                {
                    name: '🟢 Premium Oran',
                    value: '8 XP/dakika • 5 Coin/dakika\n• Çok aktif sunucular için',
                    inline: true
                },
                {
                    name: '🔵 Maksimum Oran',
                    value: '10 XP/dakika • 7 Coin/dakika\n• En yüksek hız',
                    inline: true
                }
            )
            .setFooter({ 
                text: `${interaction.guild.name} • Hızlı Ayar Menüsü`,
                iconURL: interaction.guild.iconURL()
            })
            .setTimestamp();
        
        const row1 = new ActionRowBuilder()
            .addComponents(
                new ButtonBuilder()
                    .setCustomId('quickset_low')
                    .setLabel('Düşük')
                    .setEmoji('🔴')
                    .setStyle(ButtonStyle.Danger),
                new ButtonBuilder()
                    .setCustomId('quickset_normal')
                    .setLabel('Normal')
                    .setEmoji('🟡')
                    .setStyle(ButtonStyle.Primary),
                new ButtonBuilder()
                    .setCustomId('quickset_high')
                    .setLabel('Yüksek')
                    .setEmoji('🟠')
                    .setStyle(ButtonStyle.Secondary)
            );
        
        const row2 = new ActionRowBuilder()
            .addComponents(
                new ButtonBuilder()
                    .setCustomId('quickset_premium')
                    .setLabel('Premium')
                    .setEmoji('🟢')
                    .setStyle(ButtonStyle.Success),
                new ButtonBuilder()
                    .setCustomId('quickset_max')
                    .setLabel('Maksimum')
                    .setEmoji('🔵')
                    .setStyle(ButtonStyle.Success)
            );
        
        await interaction.editReply({ embeds: [embed], components: [row1, row2] });
    },
    
    async showCalculateMenu(interaction) {
        const { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
        
        const embed = new EmbedBuilder()
            .setColor('#00BFFF')
            .setTitle('🧮 Kazanç Hesaplayıcı')
            .setDescription('Farklı süreler için kazanç hesaplaması yapın:')
            .addFields(
                {
                    name: '⏰ Hesaplama Seçenekleri',
                    value: 'Aşağıdaki butonlardan birini seçerek belirli süreler için kazanç hesaplaması yapabilirsiniz.',
                    inline: false
                }
            )
            .setFooter({ 
                text: `${interaction.guild.name} • Kazanç Hesaplayıcı`,
                iconURL: interaction.guild.iconURL()
            })
            .setTimestamp();
        
        const row1 = new ActionRowBuilder()
            .addComponents(
                new ButtonBuilder()
                    .setCustomId('calc_30')
                    .setLabel('30 Dakika')
                    .setEmoji('⏰')
                    .setStyle(ButtonStyle.Primary),
                new ButtonBuilder()
                    .setCustomId('calc_60')
                    .setLabel('1 Saat')
                    .setEmoji('🕐')
                    .setStyle(ButtonStyle.Primary),
                new ButtonBuilder()
                    .setCustomId('calc_120')
                    .setLabel('2 Saat')
                    .setEmoji('🕑')
                    .setStyle(ButtonStyle.Secondary)
            );
        
        const row2 = new ActionRowBuilder()
            .addComponents(
                new ButtonBuilder()
                    .setCustomId('calc_480')
                    .setLabel('8 Saat')
                    .setEmoji('🕗')
                    .setStyle(ButtonStyle.Success),
                new ButtonBuilder()
                    .setCustomId('calc_1440')
                    .setLabel('24 Saat')
                    .setEmoji('🌅')
                    .setStyle(ButtonStyle.Success)
            );
        
        await interaction.editReply({ embeds: [embed], components: [row1, row2] });
    }
};