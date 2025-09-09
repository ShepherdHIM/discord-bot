const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const fs = require('fs');
const path = require('path');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('dükkan-satın-al')
        .setDescription('Discord Bot Dükkanından ürün satın al')
        .addStringOption(option =>
            option.setName('ürün')
                .setDescription('Satın almak istediğiniz ürün')
                .setRequired(true)
                .addChoices(
                    { name: '🎁 Gizemli Kutu (200 🪙)', value: 'gizemli-kutu' },
                    { name: '🚀 XP Boost (500 🪙)', value: 'xp-boost' },
                    { name: '🪙 Coin Çarpanı (300 🪙)', value: 'coin-carpani' },
                    { name: '🎡 Çark Çevir (150 🪙)', value: 'cark-cevir' },
                    { name: '🃏 Kart Çekme (250 🪙)', value: 'kart-cekme' }
                )),

    async execute(interaction) {
        try {
            await interaction.deferReply({ flags: 64 }); // Ephemeral response

            const itemKey = interaction.options.getString('ürün');
            const userId = interaction.user.id;
            const guildId = interaction.guild.id;

            // Load shop data
            const shopData = this.loadShopData();
            if (!shopData) {
                const errorEmbed = new EmbedBuilder()
                    .setColor('#FF0000')
                    .setTitle('❌ Dükkan Hatası')
                    .setDescription('Dükkan verisi şu anda kullanılamıyor. Lütfen daha sonra tekrar deneyin.')
                    .setTimestamp();
                
                return interaction.editReply({ embeds: [errorEmbed] });
            }

            // Get product data
            const product = shopData.products[itemKey];
            if (!product) {
                const errorEmbed = new EmbedBuilder()
                    .setColor('#FF0000')
                    .setTitle('❌ Geçersiz Ürün')
                    .setDescription('Seçilen ürün mevcut değil. Lütfen geçerli bir ürün seçin.')
                    .setTimestamp();
                
                return interaction.editReply({ embeds: [errorEmbed] });
            }

            // Get voice manager to access user data
            const voiceManager = interaction.client.voiceManager;
            if (!voiceManager) {
                const errorEmbed = new EmbedBuilder()
                    .setColor('#FF0000')
                    .setTitle('❌ Sistem Hatası')
                    .setDescription('Bot sistemi şu anda kullanılamıyor. Lütfen daha sonra tekrar deneyin.')
                    .setTimestamp();
                
                return interaction.editReply({ embeds: [errorEmbed] });
            }

            // Get user data
            const userData = voiceManager.getUserData(guildId, userId);
            if (!userData) {
                const errorEmbed = new EmbedBuilder()
                    .setColor('#FF0000')
                    .setTitle('❌ Kullanıcı Verisi Hatası')
                    .setDescription('Kullanıcı verisi bulunamadı. Botu kullanmaya başlamak için sesli kanala katılın.')
                    .setTimestamp();
                
                return interaction.editReply({ embeds: [errorEmbed] });
            }

            // Check if user has enough currency
            const requiredAmount = product.price;
            const userBalance = userData.coins || 0;

            if (userBalance < requiredAmount) {
                const errorEmbed = new EmbedBuilder()
                    .setColor('#FF0000')
                    .setTitle('❌ Yetersiz Bakiye!')
                    .setDescription(`Bu ürünü satın almak için **${requiredAmount} ${shopData.settings.currency_symbol}** gerekli.`)
                    .addFields(
                        { name: '💰 Bakiyeniz', value: `${userBalance} ${shopData.settings.currency_symbol}`, inline: true },
                        { name: '💸 Gerekli', value: `${requiredAmount} ${shopData.settings.currency_symbol}`, inline: true },
                        { name: '📊 Eksik', value: `${requiredAmount - userBalance} ${shopData.settings.currency_symbol}`, inline: true }
                    )
                    .setFooter({ text: 'Bakiyenizi kontrol etmek için /profil kullanın' })
                    .setTimestamp();
                
                return interaction.editReply({ embeds: [errorEmbed] });
            }

            // Deduct the cost
            userData.coins -= requiredAmount;

            // Apply random reward
            const reward = product.rewards[Math.floor(Math.random() * product.rewards.length)];
            let rewardMessage = reward.message;

            // Process the reward
            switch (reward.type) {
                case 'xp':
                    userData.xp = (userData.xp || 0) + reward.amount;
                    break;
                case 'coins':
                    userData.coins = (userData.coins || 0) + reward.amount;
                    break;
                case 'xp-boost':
                    userData.xpBoost = Date.now() + reward.duration;
                    break;
                case 'coin-multiplier':
                    userData.coinMultiplier = {
                        multiplier: reward.multiplier,
                        expires: Date.now() + reward.duration
                    };
                    break;
                case 'extra-spin':
                    userData.extraSpins = (userData.extraSpins || 0) + reward.amount;
                    break;
                case 'free-box':
                    // Give a free mystery box
                    userData.coins += requiredAmount; // Refund the cost
                    const freeBoxReward = shopData.products['gizemli-kutu'].rewards[Math.floor(Math.random() * shopData.products['gizemli-kutu'].rewards.length)];
                    switch (freeBoxReward.type) {
                        case 'xp':
                            userData.xp = (userData.xp || 0) + freeBoxReward.amount;
                            break;
                        case 'coins':
                            userData.coins = (userData.coins || 0) + freeBoxReward.amount;
                            break;
                        case 'xp-boost':
                            userData.xpBoost = Date.now() + freeBoxReward.duration;
                            break;
                        case 'extra-spin':
                            userData.extraSpins = (userData.extraSpins || 0) + freeBoxReward.amount;
                            break;
                    }
                    rewardMessage += `\n🎁 Bedava kutudan: ${freeBoxReward.message}`;
                    break;
                case 'nothing':
                    // Do nothing
                    break;
            }

            // Save updated user data
            voiceManager.saveUserData(guildId, userId, userData);

            // Log the purchase
            await this.logPurchase(interaction, product, userData, rewardMessage);

            // Success response
            const successEmbed = new EmbedBuilder()
                .setColor('#00FF00')
                .setTitle('✅ Satın Alma Başarılı!')
                .setDescription('Bu ürünü başarıyla satın aldınız!')
                .addFields(
                    { name: '🛍️ Ürün', value: product.name, inline: true },
                    { name: '💰 Maliyet', value: `${requiredAmount} ${shopData.settings.currency_symbol}`, inline: true },
                    { name: '💳 Kalan Bakiye', value: `${userData.coins} ${shopData.settings.currency_symbol}`, inline: true },
                    { name: '🎁 Ödül', value: rewardMessage, inline: false }
                )
                .setFooter({ text: 'Satın alımınız için teşekkürler!' })
                .setTimestamp();

            await interaction.editReply({ embeds: [successEmbed] });

        } catch (error) {
            console.error('Error in shop-buy command:', error);
            
            const errorEmbed = new EmbedBuilder()
                .setColor('#FF0000')
                .setTitle('❌ Satın Alma Başarısız')
                .setDescription('Satın alma sırasında bir hata oluştu. Lütfen tekrar deneyin.')
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

    async logPurchase(interaction, product, userData, rewardMessage) {
        try {
            const settingsPath = path.join(__dirname, '..', 'data', `settings_${interaction.guild.id}.json`);
            
            if (fs.existsSync(settingsPath)) {
                const settings = JSON.parse(fs.readFileSync(settingsPath, 'utf8'));
                const logChannelId = settings.logChannel;
                
                if (logChannelId) {
                    const logChannel = interaction.guild.channels.cache.get(logChannelId);
                    if (logChannel) {
                        const logEmbed = new EmbedBuilder()
                            .setColor('#FFA500')
                            .setTitle('🛒 Satın Alma Logu')
                            .setDescription('Yeni bir ürün satın alındı!')
                            .addFields(
                                { name: '👤 Kullanıcı', value: `${interaction.user} (${interaction.user.id})`, inline: true },
                                { name: '🛍️ Ürün', value: product.name, inline: true },
                                { name: '💰 Fiyat', value: `${product.price} 🪙`, inline: true },
                                { name: '💳 Kalan Bakiye', value: `${userData.coins} 🪙`, inline: true },
                                { name: '🎁 Ödül', value: rewardMessage, inline: false },
                                { name: '🏠 Sunucu', value: interaction.guild.name, inline: true },
                                { name: '🕒 Tarih', value: `<t:${Math.floor(Date.now() / 1000)}:F>`, inline: true }
                            )
                            .setThumbnail(interaction.user.displayAvatarURL())
                            .setTimestamp();
                        
                        await logChannel.send({ embeds: [logEmbed] });
                    }
                }
            }
        } catch (error) {
            console.error('Purchase logging error:', error);
        }
    }
};
