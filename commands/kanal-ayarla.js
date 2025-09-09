const { SlashCommandBuilder, EmbedBuilder, PermissionFlagsBits, ChannelType } = require('discord.js');
const fs = require('fs');
const path = require('path');

// Server-specific settings file path
const getSettingsPath = (guildId) => path.join(__dirname, '..', 'data', `settings_${guildId}.json`);

// Ensure data directory exists
const ensureDataDir = () => {
    const dataDir = path.join(__dirname, '..', 'data');
    if (!fs.existsSync(dataDir)) {
        fs.mkdirSync(dataDir, { recursive: true });
    }
};

// Load server settings
const loadServerSettings = (guildId) => {
    ensureDataDir();
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

// Save server settings
const saveServerSettings = (guildId, settings) => {
    ensureDataDir();
    const settingsPath = getSettingsPath(guildId);
    
    try {
        fs.writeFileSync(settingsPath, JSON.stringify(settings, null, 2));
        return true;
    } catch (error) {
        console.error(`Settings dosyası kaydedilemedi ${guildId}:`, error);
        return false;
    }
};

module.exports = {
    data: new SlashCommandBuilder()
        .setName('kanal_ayarla')
        .setDescription('Sunucuya özel kanal ayarlarını yapılandır')
        .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild)
        .addStringOption(option =>
            option.setName('tip')
                .setDescription('Kanal tipi')
                .setRequired(true)
                .addChoices(
                    { name: 'Duyuru', value: 'duyuru' },
                    { name: 'Hoşgeldin', value: 'hosgeldin' },
                    { name: 'Log', value: 'log' },
                    { name: 'Müzik', value: 'muzik' },
                    { name: 'Göster', value: 'goster' },
                    { name: 'Test', value: 'test' },
                    { name: 'Temizle', value: 'temizle' }
                ))
        .addChannelOption(option =>
            option.setName('kanal')
                .setDescription('Ayarlanacak kanal')
                .addChannelTypes(ChannelType.GuildText)
                .setRequired(false)),

    async execute(interaction) {
        const tip = interaction.options.getString('tip');
        const channel = interaction.options.getChannel('kanal');
        const guildId = interaction.guild.id;
        
        // Check permissions
        if (!interaction.member.permissions.has(PermissionFlagsBits.ManageGuild)) {
            return interaction.reply({
                content: '❌ Bu komutu kullanmak için **Sunucuyu Yönet** yetkisine sahip olmalısınız!',
                flags: 64
            });
        }

        try {
            const settings = loadServerSettings(guildId);

            switch (tip) {
                case 'duyuru':
                    await this.setChannel(interaction, settings, guildId, 'duyuru', channel, 'Duyuru');
                    break;
                    
                case 'hosgeldin':
                    await this.setChannel(interaction, settings, guildId, 'hosgeldin', channel, 'Hoşgeldin');
                    break;
                    
                case 'log':
                    await this.setChannel(interaction, settings, guildId, 'log', channel, 'Log');
                    break;
                    
                case 'muzik':
                    await this.setChannel(interaction, settings, guildId, 'muzik', channel, 'Müzik');
                    break;
                    
                case 'goster':
                    await this.showSettings(interaction, settings);
                    break;
                    
                case 'test':
                    await this.testChannelSettings(interaction, settings, guildId);
                    break;
                    
                case 'temizle':
                    await this.clearSettings(interaction, settings, guildId);
                    break;
            }
        } catch (error) {
            console.error('Kanal ayarlama hatası:', error);
            await interaction.reply({
                content: '❌ Kanal ayarları yapılırken bir hata oluştu!',
                flags: 64
            });
        }
    },

    async setChannel(interaction, settings, guildId, channelType, channel, displayName) {
        if (!channel) {
            return interaction.reply({
                content: `❌ ${displayName} kanalı için bir kanal seçmelisiniz!`,
                flags: 64
            });
        }
        
        // Check if bot can send messages to the channel
        if (!channel.permissionsFor(interaction.guild.members.me).has('SendMessages')) {
            return interaction.reply({
                content: `❌ ${channel} kanalına mesaj gönderme yetkim yok!`,
                flags: 64
            });
        }

        settings[`${channelType}Channel`] = channel.id;
        
        if (saveServerSettings(guildId, settings)) {
            const embed = new EmbedBuilder()
                .setColor('#00FF00')
                .setTitle('✅ Kanal Ayarlandı')
                .setDescription(`${displayName} kanalı başarıyla ayarlandı.`)
                .addFields(
                    { name: `📢 ${displayName} Kanalı`, value: `${channel}`, inline: true },
                    { name: '👤 Ayarı Yapan', value: interaction.user.toString(), inline: true },
                    { name: '🕒 Tarih', value: `<t:${Math.floor(Date.now() / 1000)}:F>`, inline: true }
                )
                .setTimestamp();

            await interaction.reply({ embeds: [embed] });
        } else {
            await interaction.reply({
                content: '❌ Ayar kaydedilemedi!',
                flags: 64
            });
        }
    },

    async showSettings(interaction, settings) {
        const embed = new EmbedBuilder()
            .setColor('#4169E1')
            .setTitle('📋 Mevcut Kanal Ayarları')
            .setDescription(`${interaction.guild.name} sunucusunun kanal ayarları:`)
            .setThumbnail(interaction.guild.iconURL())
            .setTimestamp();

        const channelTypes = [
            { key: 'duyuruChannel', name: '📢 Duyuru Kanalı', emoji: '📢' },
            { key: 'hosgeldinChannel', name: '👋 Hoşgeldin Kanalı', emoji: '👋' },
            { key: 'logChannel', name: '📝 Log Kanalı', emoji: '📝' },
            { key: 'muzikChannel', name: '🎵 Müzik Kanalı', emoji: '🎵' }
        ];

        let hasSettings = false;

        for (const channelType of channelTypes) {
            const channelId = settings[channelType.key];
            if (channelId) {
                const channel = interaction.guild.channels.cache.get(channelId);
                if (channel) {
                    embed.addFields({
                        name: channelType.name,
                        value: `${channelType.emoji} ${channel}`,
                        inline: true
                    });
                    hasSettings = true;
                } else {
                    embed.addFields({
                        name: channelType.name,
                        value: `${channelType.emoji} ❌ Kanal bulunamadı`,
                        inline: true
                    });
                    hasSettings = true;
                }
            }
        }

        if (!hasSettings) {
            embed.setDescription('❌ Henüz hiçbir kanal ayarı yapılmamış.');
        }

        embed.addFields({
            name: 'ℹ️ Bilgi',
            value: 'Kanal ayarları sadece bu sunucu için geçerlidir.',
            inline: false
        });

        await interaction.reply({ embeds: [embed] });
    },

    async clearSettings(interaction, settings, guildId) {
        const embed = new EmbedBuilder()
            .setColor('#FF6B00')
            .setTitle('🗑️ Kanal Ayarları Temizlendi')
            .setDescription('Tüm kanal ayarları temizlendi.')
            .setTimestamp();

        // Clear all channel settings
        const channelTypes = ['duyuruChannel', 'hosgeldinChannel', 'logChannel', 'muzikChannel'];
        let clearedCount = 0;

        for (const channelType of channelTypes) {
            if (settings[channelType]) {
                delete settings[channelType];
                clearedCount++;
            }
        }

        if (clearedCount > 0) {
            if (saveServerSettings(guildId, settings)) {
                embed.addFields(
                    { name: '📋 Temizlenen Ayarlar', value: clearedCount.toString(), inline: true },
                    { name: '👤 Temizleyen', value: interaction.user.toString(), inline: true },
                    { name: '🕒 Tarih', value: `<t:${Math.floor(Date.now() / 1000)}:F>`, inline: true }
                );
                await interaction.reply({ embeds: [embed] });
            } else {
                await interaction.reply({
                    content: '❌ Ayarlar temizlenemedi!',
                    flags: 64
                });
            }
        } else {
            await interaction.reply({
                content: '❌ Temizlenecek ayar bulunamadı!',
                flags: 64
            });
        }
    },

    async testChannelSettings(interaction, settings, guildId) {
        const embed = new EmbedBuilder()
            .setColor('#FFD700')
            .setTitle('🧪 Kanal Ayarları Test')
            .setDescription('Kanal ayarlarının nasıl çalıştığını test edin.')
            .setTimestamp();

        const channelTypes = [
            { key: 'duyuruChannel', name: '📢 Duyuru Kanalı', emoji: '📢' },
            { key: 'hosgeldinChannel', name: '👋 Hoşgeldin Kanalı', emoji: '👋' },
            { key: 'logChannel', name: '📝 Log Kanalı', emoji: '📝' },
            { key: 'muzikChannel', name: '🎵 Müzik Kanalı', emoji: '🎵' }
        ];

        let hasSettings = false;
        let testResults = [];

        for (const channelType of channelTypes) {
            const channelId = settings[channelType.key];
            if (channelId) {
                const channel = interaction.guild.channels.cache.get(channelId);
                if (channel) {
                    // Test if bot can send messages to this channel
                    const canSend = channel.permissionsFor(interaction.guild.members.me).has('SendMessages');
                    testResults.push({
                        name: channelType.name,
                        value: `${channelType.emoji} ${channel} ${canSend ? '✅' : '❌'}`,
                        inline: true
                    });
                    hasSettings = true;
                } else {
                    testResults.push({
                        name: channelType.name,
                        value: `${channelType.emoji} ❌ Kanal bulunamadı`,
                        inline: true
                    });
                    hasSettings = true;
                }
            }
        }

        if (testResults.length > 0) {
            embed.addFields(testResults);
        }

        if (!hasSettings) {
            embed.setDescription('❌ Henüz hiçbir kanal ayarı yapılmamış. Test edilecek bir şey yok.');
        } else {
            embed.addFields({
                name: 'ℹ️ Test Açıklaması',
                value: '✅ = Bot bu kanala mesaj gönderebilir\n❌ = Bot bu kanala mesaj gönderemez veya kanal bulunamadı',
                inline: false
            });
        }

        await interaction.reply({ embeds: [embed] });
    }
};