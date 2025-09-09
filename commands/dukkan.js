const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('dükkan')
        .setDescription('Discord Bot Shop - Profesyonel dükkan sistemi'),

    async execute(interaction) {
        try {
            await interaction.deferReply();
            
            // Create professional Discord Bot Shop embed
            const shopEmbed = new EmbedBuilder()
                .setTitle('🛍️ Discord Bot Shop')
                .setDescription('**Hoş geldiniz! Profesyonel Discord Bot dükkanımıza göz atın.**\n\n*Tüm ürünlerimiz kaliteli ve garantilidir. Coin bakiyenizi kontrol etmek için `/profil` komutunu kullanın.*')
                .setColor('#2B2D31')
                .setThumbnail('https://cdn.discordapp.com/emojis/1234567890123456789.png') // You can replace with your bot's avatar
                .setImage('https://via.placeholder.com/600x200/2B2D31/FFFFFF?text=Discord+Bot+Shop') // Optional banner
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
                    text: 'Discord Bot Shop • Profesyonel Hizmet • Güvenli Alışveriş',
                    iconURL: interaction.client.user.displayAvatarURL()
                })
                .setTimestamp();

            await interaction.editReply({ embeds: [shopEmbed] });
            
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
    }
};
