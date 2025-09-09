const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('dükkan')
        .setDescription('Discord Bot Shop - Profesyonel dükkan sistemi'),

    async execute(interaction) {
        try {
            await interaction.deferReply({ flags: 64 });
            
            // Get shop channel from settings
            const shopChannel = await this.getShopChannel(interaction.guild.id, interaction);
            
            if (!shopChannel) {
                await interaction.editReply({
                    content: '❌ Dükkan kanalı ayarlanmamış! Yönetici `/kanal_ayarla dükkan` komutunu kullanarak dükkan kanalını ayarlamalı.',
                    flags: 64
                });
                return;
            }

            // Delete existing shop messages in the channel
            await this.deleteExistingShopMessages(shopChannel);

            // Create and send new shop embed
            const shopEmbed = this.createShopEmbed();
            const shopMessage = await shopChannel.send({ embeds: [shopEmbed] });
            
            // Pin the new shop message
            await shopMessage.pin();

            // Update settings with new message ID
            await this.updateShopMessageId(interaction.guild.id, shopMessage.id);

            await interaction.editReply({
                content: `✅ Dükkan embed'i ${shopChannel} kanalında güncellendi ve sabitlendi!`,
                flags: 64
            });
            
        } catch (error) {
            console.error('Error in dükkan command:', error);
            try {
                if (!interaction.replied && !interaction.deferred) {
                    await interaction.reply({
                        content: '❌ Dükkan yüklenirken bir hata oluştu!',
                        flags: 64
                    });
                } else {
                    await interaction.editReply({
                        content: '❌ Dükkan yüklenirken bir hata oluştu!',
                        flags: 64
                    });
                }
            } catch (replyError) {
                console.error('Error sending error response:', replyError);
            }
        }
    },

    async getShopChannel(guildId, interaction) {
        try {
            const fs = require('fs');
            const path = require('path');
            const settingsPath = path.join(__dirname, '..', 'data', `settings_${guildId}.json`);
            
            if (!fs.existsSync(settingsPath)) {
                return null;
            }
            
            const settings = JSON.parse(fs.readFileSync(settingsPath, 'utf8'));
            const shopChannelId = settings.dukkanChannel;
            
            if (!shopChannelId) {
                return null;
            }
            
            // Get the channel from the guild
            const guild = interaction.client.guilds.cache.get(guildId);
            if (!guild) {
                return null;
            }
            
            return guild.channels.cache.get(shopChannelId);
        } catch (error) {
            console.error('Error getting shop channel:', error);
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
                (msg.embeds[0].title.includes('Discord Bot Shop') || msg.embeds[0].title.includes('Discord Bot Dükkanı'))
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

    async updateShopMessageId(guildId, messageId) {
        try {
            const fs = require('fs');
            const path = require('path');
            const settingsPath = path.join(__dirname, '..', 'data', `settings_${guildId}.json`);
            
            let settings = {};
            if (fs.existsSync(settingsPath)) {
                settings = JSON.parse(fs.readFileSync(settingsPath, 'utf8'));
            }
            
            settings.dukkanMessageId = messageId;
            
            // Ensure data directory exists
            const dataDir = path.dirname(settingsPath);
            if (!fs.existsSync(dataDir)) {
                fs.mkdirSync(dataDir, { recursive: true });
            }
            
            fs.writeFileSync(settingsPath, JSON.stringify(settings, null, 2));
        } catch (error) {
            console.error('Error updating shop message ID:', error);
        }
    },

    createShopEmbed() {
        const embed = new EmbedBuilder()
            .setTitle('🛍️ Discord Bot Shop')
            .setDescription('**Hoş geldiniz! Profesyonel Discord Bot dükkanımıza göz atın.**\n\n*Tüm ürünlerimiz kaliteli ve garantilidir. Coin bakiyenizi kontrol etmek için `/profil` komutunu kullanın.*')
            .setColor('#2B2D31')
            .setThumbnail('https://cdn.discordapp.com/emojis/1234567890123456789.png')
            .addFields(
                {
                    name: '🎁 **Gizemli Kutu**',
                    value: '**Fiyat:** 200 🪙\n**Açıklama:** Rastgele ödüller içeren gizemli kutu!\n**Ödüller:** XP, Coin, Boost, Ekstra Hak\n**Kullanım:** `/dükkan-al gizemli-kutu`',
                    inline: true
                },
                {
                    name: '🎡 **Çark Çevir**',
                    value: '**Fiyat:** 150 🪙\n**Açıklama:** Şanslı çarkı çevir ve ödül kazan!\n**Ödüller:** 50-500 Coin, XP, Boost\n**Kullanım:** `/dükkan-al cark-cevir`',
                    inline: true
                },
                {
                    name: '🚀 **XP Boost**',
                    value: '**Fiyat:** 500 🪙\n**Açıklama:** 1 saat boyunca %50 daha fazla XP!\n**Süre:** 60 dakika\n**Kullanım:** `/dükkan-al xp-boost`',
                    inline: true
                },
                {
                    name: '🪙 **Coin Çarpanı**',
                    value: '**Fiyat:** 300 🪙\n**Açıklama:** 1 saat boyunca coin bonusu!\n**Bonus:** %2-3 ekstra coin\n**Kullanım:** `/dükkan-al coin-carpani`',
                    inline: true
                },
                {
                    name: '🃏 **Kart Çekme**',
                    value: '**Fiyat:** 250 🪙\n**Açıklama:** Rastgele XP veya Coin kazan!\n**Ödüller:** 100-500 XP, 50-200 Coin\n**Kullanım:** `/dükkan-al kart-cekme`',
                    inline: true
                },
                {
                    name: '💡 **Nasıl Satın Alırım?**',
                    value: '1️⃣ Coin bakiyenizi kontrol edin (`/profil`)\n2️⃣ İstediğiniz ürünün komutunu kullanın\n3️⃣ Ödülünüzü hemen alın!\n\n**Örnek:** `/dükkan-al gizemli-kutu`',
                    inline: false
                }
            )
            .addFields(
                {
                    name: '💰 **Coin Nasıl Kazanılır?**',
                    value: '• 🎤 Sesli kanallarda aktif olmak\n• 🎵 Müzik dinlemek\n• 🎮 Oyunlar oynamak\n• 📊 Günlük ödüller',
                    inline: true
                },
                {
                    name: '⭐ **Özel Özellikler**',
                    value: '• 🎯 Garantili ödüller\n• ⚡ Anında teslimat\n• 🔄 7/24 hizmet\n• 🛡️ Güvenli alışveriş',
                    inline: true
                },
                {
                    name: '📞 **Destek**',
                    value: 'Sorunuz mu var? `/destek` komutu ile bizimle iletişime geçin!\n\n**Bot:** Kratos#7768\n**Geliştirici:** Shepherd',
                    inline: true
                }
            )
            .setFooter({ 
                text: 'Discord Bot Shop • Profesyonel Hizmet • Güvenli Alışveriş'
            })
            .setTimestamp();

        return embed;
    }
};