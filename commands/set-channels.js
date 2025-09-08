const { SlashCommandBuilder, EmbedBuilder, PermissionFlagsBits, ChannelType } = require('discord.js');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('kanal-ayarla')
        .setDescription('Bot duyuruları için kanalları yapılandır')
        .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild)
        .addSubcommand(subcommand =>
            subcommand
                .setName('goster')
                .setDescription('Mevcut kanal yapılandırmalarını göster'))
        .addSubcommand(subcommand =>
            subcommand
                .setName('seviye-atlamasi')
                .setDescription('Seviye atlama duyuruları için kanalı ayarla')
                .addChannelOption(option =>
                    option.setName('kanal')
                        .setDescription('Seviye atlama mesajları için kanal')
                        .addChannelTypes(ChannelType.GuildText)
                        .setRequired(true)))
        .addSubcommand(subcommand =>
            subcommand
                .setName('hosgeldin')
                .setDescription('Hoşgeldin mesajları için kanalı ayarla')
                .addChannelOption(option =>
                    option.setName('kanal')
                        .setDescription('Hoşgeldin mesajları için kanal')
                        .addChannelTypes(ChannelType.GuildText)
                        .setRequired(true)))
        .addSubcommand(subcommand =>
            subcommand
                .setName('duyurular')
                .setDescription('Bot duyuruları için kanalı ayarla')
                .addChannelOption(option =>
                    option.setName('kanal')
                        .setDescription('Genel bot duyuruları için kanal')
                        .addChannelTypes(ChannelType.GuildText)
                        .setRequired(true)))
        .addSubcommand(subcommand =>
            subcommand
                .setName('sifirla')
                .setDescription('Tüm kanal yapılandırmalarını sıfırla')),
    
    async execute(interaction) {
        // Get voice manager from client
        const voiceManager = interaction.client.voiceManager;
        if (!voiceManager) {
            return interaction.reply({ content: 'Ses takip sistemi başlatılmamış!', ephemeral: true });
        }
        
        const subcommand = interaction.options.getSubcommand();
        
        if (subcommand === 'goster') {
            const settings = await voiceManager.db.getGuildSettings(interaction.guildId);
            
            const embed = new EmbedBuilder()
                .setColor('#0099ff')
                .setTitle('📺 Kanal Yapılandırması')
                .setThumbnail(interaction.guild.iconURL())
                .setTimestamp();
            
            const channels = [
                {
                    name: '🎉 Seviye Atlama Duyuruları',
                    channelId: settings.levelup_channel_id,
                    description: 'Seviye atlama mesajlarının gönderildiği yer'
                },
                {
                    name: '👋 Hoşgeldin Mesajları',
                    channelId: settings.welcome_channel_id,
                    description: 'Yeni üye hoşgeldin mesajlarının gönderildiği yer'
                },
                {
                    name: '📢 Bot Duyuruları',
                    channelId: settings.announcement_channel_id,
                    description: 'Bot duyuruları ve güncellemelerinin gönderildiği yer'
                }
            ];
            
            for (const channelConfig of channels) {
                let value = 'Yapılandırılmamış (otomatik algılama kullanılır)';
                if (channelConfig.channelId) {
                    const channel = interaction.guild.channels.cache.get(channelConfig.channelId);
                    value = channel ? `${channel}` : `❌ Kanal bulunamadı (ID: ${channelConfig.channelId})`;
                }
                
                embed.addFields({
                    name: channelConfig.name,
                    value: `${value}\\n*${channelConfig.description}*`,
                    inline: false
                });
            }
            
            embed.setFooter({ 
                text: `Yapılandırmak için /kanal-ayarla kullanın • Son güncelleme: ${new Date(settings.updated_at).toLocaleString()}` 
            });
            
            await interaction.reply({ embeds: [embed], ephemeral: true });
        }
        
        else if (['seviye-atlamasi', 'hosgeldin', 'duyurular'].includes(subcommand)) {
            const channel = interaction.options.getChannel('kanal');
            
            if (channel && !channel.isTextBased()) {
                return interaction.reply({ 
                    content: '❌ Lütfen bir metin kanalı seçin!', 
                    ephemeral: true 
                });
            }
            
            // Check bot permissions in the channel
            if (channel) {
                const botMember = interaction.guild.members.cache.get(interaction.client.user.id);
                const permissions = channel.permissionsFor(botMember);
                
                if (!permissions.has(['SendMessages', 'EmbedLinks'])) {
                    return interaction.reply({ 
                        content: `❌ ${channel}'da mesaj gönderme iznime sahip değilim! Lütfen bana **Mesaj Gönderme** ve **Bağlantı Gömme** izinleri verin.`, 
                        ephemeral: true 
                    });
                }
            }
            
            const channelTypes = {
                'seviye-atlamasi': 'levelup_channel_id',
                'hosgeldin': 'welcome_channel_id',
                'duyurular': 'announcement_channel_id'
            };
            
            const channelNames = {
                'seviye-atlamasi': '🎉 Seviye Atlama Duyuruları',
                'hosgeldin': '👋 Hoşgeldin Mesajları',
                'duyurular': '📢 Bot Duyuruları'
            };
            
            const updateData = {};
            updateData[channelTypes[subcommand]] = channel ? channel.id : null;
            
            await voiceManager.db.updateGuildSettings(interaction.guildId, updateData);
            
            const embed = new EmbedBuilder()
                .setColor('#00ff00')
                .setTitle('✅ Kanal Yapılandırması Güncellendi!')
                .setTimestamp();
            
            if (channel) {
                embed.setDescription(`${channelNames[subcommand]} kanalı ${channel} olarak ayarlandı!`);
                embed.addFields({
                    name: '📝 Not',
                    value: 'Bot artık otomatik algılama yerine bu kanala ilgili mesajları gönderecek.',
                    inline: false
                });
            } else {
                embed.setDescription(`${channelNames[subcommand]} kanalı temizlendi!`);
                embed.addFields({
                    name: '📝 Not',
                    value: 'Bot artık bu mesajlar için otomatik kanal algılaması kullanacak.',
                    inline: false
                });
            }
            
            await interaction.reply({ embeds: [embed], ephemeral: true });
        }
        
        else if (subcommand === 'sifirla') {
            const resetType = interaction.options.getString('type') || 'all';
            
            const updateData = {};
            
            if (resetType === 'all' || resetType === 'levelup') {
                updateData.levelup_channel_id = null;
            }
            if (resetType === 'all' || resetType === 'welcome') {
                updateData.welcome_channel_id = null;
            }
            if (resetType === 'all' || resetType === 'announcements') {
                updateData.announcement_channel_id = null;
            }
            
            await voiceManager.db.updateGuildSettings(interaction.guildId, updateData);
            
            const embed = new EmbedBuilder()
                .setColor('#ff6600')
                .setTitle('🔄 Kanal Yapılandırması Sıfırlandı')
                .setDescription(`${resetType === 'all' ? 'Tüm kanal yapılandırmaları' : `${resetType} kanal yapılandırması`} sıfırlandı!`)
                .addFields({
                    name: '📝 Bunun anlamı',
                    value: 'Bot artık yapılandırılmış kanallar yerine mesajlar için otomatik kanal algılaması kullanacak.',
                    inline: false
                })
                .setTimestamp();
            
            await interaction.reply({ embeds: [embed], ephemeral: true });
        }
    },
};