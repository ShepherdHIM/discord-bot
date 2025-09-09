const { SlashCommandBuilder, EmbedBuilder, PermissionFlagsBits, ChannelType } = require('discord.js');
const fs = require('fs');
const path = require('path');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('dükkan-kanal-ayarla')
        .setDescription('Discord Bot Dükkanını bir kanala kur (Sadece yöneticiler)')
        .addChannelOption(option =>
            option.setName('kanal')
                .setDescription('Dükkan embedinin gönderileceği kanal')
                .setRequired(true)
                .addChannelTypes(ChannelType.GuildText))
        .setDefaultMemberPermissions(PermissionFlagsBits.Administrator),

    async execute(interaction) {
        try {
            await interaction.deferReply({ flags: 64 }); // Ephemeral response

            const channel = interaction.options.getChannel('kanal');
            
            // Check if user has administrator permissions
            if (!interaction.member.permissions.has(PermissionFlagsBits.Administrator)) {
                const errorEmbed = new EmbedBuilder()
                    .setColor('#FF0000')
                    .setTitle('❌ İzin Reddedildi')
                    .setDescription('Bu komutu sadece yöneticiler kullanabilir.')
                    .setTimestamp();
                
                return interaction.editReply({ embeds: [errorEmbed] });
            }

            // Check if bot has permission to manage messages in the channel
            const botMember = interaction.guild.members.cache.get(interaction.client.user.id);
            const channelPermissions = channel.permissionsFor(botMember);
            
            if (!channelPermissions.has([PermissionFlagsBits.SendMessages, PermissionFlagsBits.ManageMessages])) {
                const errorEmbed = new EmbedBuilder()
                    .setColor('#FF0000')
                    .setTitle('❌ Eksik İzinler')
                    .setDescription(`${channel} kanalında dükkanı kurmak için **Mesaj Gönder** ve **Mesajları Yönet** izinlerine ihtiyacım var.`)
                    .setTimestamp();
                
                return interaction.editReply({ embeds: [errorEmbed] });
            }

            // Load shop data
            const shopData = this.loadShopData();
            if (!shopData) {
                const errorEmbed = new EmbedBuilder()
                    .setColor('#FF0000')
                    .setTitle('❌ Dükkan Verisi Hatası')
                    .setDescription('Dükkan verisi yüklenemedi. Lütfen geliştirici ile iletişime geçin.')
                    .setTimestamp();
                
                return interaction.editReply({ embeds: [errorEmbed] });
            }

            // Delete existing shop messages in the channel
            await this.deleteExistingShopMessages(channel);

            // Create and send the shop embed
            const shopEmbed = this.createShopEmbed(shopData);
            const shopMessage = await channel.send({ embeds: [shopEmbed] });

            // Save shop channel info
            await this.saveShopChannelInfo(interaction.guild.id, channel.id, shopMessage.id);

            // Success response
            const successEmbed = new EmbedBuilder()
                .setColor('#00FF00')
                .setTitle('✅ Dükkan Kanalı Başarıyla Kuruldu')
                .setDescription(`Discord Bot Dükkanı ${channel} kanalında kuruldu`)
                .addFields(
                    { name: '📍 Kanal', value: `${channel}`, inline: true },
                    { name: '🛍️ Ürünler', value: `${Object.keys(shopData.products).length} ürün`, inline: true },
                    { name: '🔄 Durum', value: 'Aktif', inline: true }
                )
                .setFooter({ text: 'Dükkan artık müşteriler için hazır!' })
                .setTimestamp();

            await interaction.editReply({ embeds: [successEmbed] });

        } catch (error) {
            console.error('Error in set-shop-channel command:', error);
            
            const errorEmbed = new EmbedBuilder()
                .setColor('#FF0000')
                .setTitle('❌ Kurulum Başarısız')
                .setDescription('Dükkan kanalı kurulurken bir hata oluştu. Lütfen tekrar deneyin.')
                .setTimestamp();

            try {
                await interaction.editReply({ embeds: [errorEmbed] });
            } catch (replyError) {
                console.error('Error sending error response:', replyError);
            }
        }
    },

    loadShopData() {
        try {
            const shopPath = path.join(__dirname, '..', 'database', 'shop.json');
            if (!fs.existsSync(shopPath)) {
                console.error('Shop database not found:', shopPath);
                return null;
            }
            
            const data = fs.readFileSync(shopPath, 'utf8');
            return JSON.parse(data);
        } catch (error) {
            console.error('Error loading shop data:', error);
            return null;
        }
    },

    async deleteExistingShopMessages(channel) {
        try {
            const messages = await channel.messages.fetch({ limit: 50 });
            const shopMessages = messages.filter(msg => 
                msg.author.id === channel.client.user.id && 
                msg.embeds.length > 0 && 
                msg.embeds[0].title && 
                msg.embeds[0].title.includes('Discord Bot Shop')
            );

            for (const message of shopMessages.values()) {
                try {
                    await message.delete();
                } catch (deleteError) {
                    console.error('Error deleting shop message:', deleteError);
                }
            }
        } catch (error) {
            console.error('Error fetching messages for cleanup:', error);
        }
    },

    createShopEmbed(shopData) {
        const embed = new EmbedBuilder()
            .setTitle(shopData.settings.shop_title)
            .setDescription(shopData.settings.shop_description)
            .setColor('#2B2D31')
            .setThumbnail('https://cdn.discordapp.com/emojis/1234567890123456789.png') // Replace with your bot's avatar
            .setTimestamp();

        // Add product fields
        Object.entries(shopData.products).forEach(([key, product]) => {
            embed.addFields({
                name: `${product.name}`,
                value: `**Fiyat:** ${product.price} ${shopData.settings.currency_symbol}\n**Açıklama:** ${product.description}\n**Kullanım:** \`/dükkan-satın-al ${key}\``,
                inline: true
            });
        });

        // Add footer information
        embed.addFields(
            {
                name: '💰 Coin Nasıl Kazanılır',
                value: '• 🎤 Sesli kanallarda aktif ol\n• 🎵 Müzik dinle\n• 🎮 Oyunlar oyna\n• 📊 Günlük ödüller',
                inline: true
            },
            {
                name: '📞 Destek',
                value: 'Yardıma mı ihtiyacın var? `/destek` komutunu kullan\n\n**Bot:** Kratos#7768\n**Geliştirici:** Shepherd',
                inline: true
            },
            {
                name: '⭐ Özellikler',
                value: '• 🎯 Garantili ödüller\n• ⚡ Anında teslimat\n• 🔄 7/24 hizmet\n• 🛡️ Güvenli alışveriş',
                inline: true
            }
        );

        embed.setFooter({ 
            text: `${shopData.settings.footer_text}`,
            iconURL: 'https://cdn.discordapp.com/emojis/1234567890123456789.png'
        });

        return embed;
    },

    async saveShopChannelInfo(guildId, channelId, messageId) {
        try {
            const settingsPath = path.join(__dirname, '..', 'data', `settings_${guildId}.json`);
            let settings = {};
            
            if (fs.existsSync(settingsPath)) {
                settings = JSON.parse(fs.readFileSync(settingsPath, 'utf8'));
            }
            
            settings.shopChannel = channelId;
            settings.shopMessageId = messageId;
            
            // Ensure data directory exists
            const dataDir = path.dirname(settingsPath);
            if (!fs.existsSync(dataDir)) {
                fs.mkdirSync(dataDir, { recursive: true });
            }
            
            fs.writeFileSync(settingsPath, JSON.stringify(settings, null, 2));
        } catch (error) {
            console.error('Error saving shop channel info:', error);
        }
    }
};
