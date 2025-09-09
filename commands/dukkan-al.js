const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('dükkan-al')
        .setDescription('Dükkan ürünlerini satın al')
        .addStringOption(option =>
            option.setName('ürün')
                .setDescription('Satın alınacak ürün')
                .setRequired(true)
                .addChoices(
                    { name: '🎁 Gizemli Kutu (200 🪙)', value: 'gizemli-kutu' },
                    { name: '🎡 Çark Çevir (150 🪙)', value: 'cark-cevir' },
                    { name: '🚀 XP Boost (500 🪙)', value: 'xp-boost' },
                    { name: '🪙 Coin Çarpanı (300 🪙)', value: 'coin-carpani' },
                    { name: '🃏 Kart Çekme (250 🪙)', value: 'kart-cekme' }
                )),

    async execute(interaction) {
        try {
            await interaction.deferReply({ flags: 64 });
            
            const product = interaction.options.getString('ürün');
            const userId = interaction.user.id;
            const guildId = interaction.guild.id;
            
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
                    .setTitle('❌ Kullanıcı Hatası')
                    .setDescription('Kullanıcı verisi bulunamadı. Lütfen botu kullanmaya başlamak için sesli kanala katılın.')
                    .setTimestamp();
                
                return interaction.editReply({ embeds: [errorEmbed] });
            }
            
            // Define products
            const products = {
                'gizemli-kutu': {
                    name: '🎁 Gizemli Kutu',
                    price: 200,
                    rewards: [
                        { type: 'xp', amount: 50, message: '🎖️ 50 XP kazandın!' },
                        { type: 'coin', amount: 100, message: '💰 100 Coin kazandın!' },
                        { type: 'coin', amount: 250, message: '🪙 250 Coin kazandın! (Nadir!)', rarity: 'rare' },
                        { type: 'xp-boost', duration: 3600000, message: '🚀 1 Saatlik XP Boost kazandın!' },
                        { type: 'extra-spin', amount: 1, message: '🎡 Ekstra Çark Çevir Hakkı kazandın!' }
                    ]
                },
                'cark-cevir': {
                    name: '🎡 Çark Çevir',
                    price: 150,
                    rewards: [
                        { type: 'coin', amount: 50, message: '💰 50 Coin kazandın!' },
                        { type: 'coin', amount: 100, message: '💰 100 Coin kazandın!' },
                        { type: 'coin', amount: 200, message: '💰 200 Coin kazandın!' },
                        { type: 'coin', amount: 300, message: '💰 300 Coin kazandın!' },
                        { type: 'coin', amount: 500, message: '💰 500 Coin kazandın!' },
                        { type: 'xp', amount: 100, message: '🎖️ 100 XP kazandın!' },
                        { type: 'xp-boost', duration: 1800000, message: '🚀 30 Dakikalık XP Boost kazandın!' },
                        { type: 'free-box', message: '🎁 Bedava Gizemli Kutu kazandın!' },
                        { type: 'nothing', message: '❌ Boş! Şanssızsın 😅' }
                    ]
                },
                'xp-boost': {
                    name: '🚀 XP Boost',
                    price: 500,
                    rewards: [
                        { type: 'xp-boost', duration: 3600000, message: '🚀 1 Saatlik XP Boost aktif!' }
                    ]
                },
                'coin-carpani': {
                    name: '🪙 Coin Çarpanı',
                    price: 300,
                    rewards: [
                        { type: 'coin-multiplier', duration: 3600000, multiplier: 0.02, message: '🪙 1 Saatlik %2 Coin Bonus aktif!' },
                        { type: 'coin-multiplier', duration: 3600000, multiplier: 0.03, message: '🪙 1 Saatlik %3 Coin Bonus aktif!' }
                    ]
                },
                'kart-cekme': {
                    name: '🃏 Kart Çekme',
                    price: 250,
                    rewards: [
                        { type: 'xp', amount: 100, message: '🎖️ 100 XP kazandın!' },
                        { type: 'xp', amount: 200, message: '🎖️ 200 XP kazandın!' },
                        { type: 'xp', amount: 300, message: '🎖️ 300 XP kazandın!' },
                        { type: 'xp', amount: 400, message: '🎖️ 400 XP kazandın!' },
                        { type: 'xp', amount: 500, message: '🎖️ 500 XP kazandın!' },
                        { type: 'coin', amount: 50, message: '💰 50 Coin kazandın!' },
                        { type: 'coin', amount: 100, message: '💰 100 Coin kazandın!' },
                        { type: 'coin', amount: 150, message: '💰 150 Coin kazandın!' },
                        { type: 'coin', amount: 200, message: '💰 200 Coin kazandın!' }
                    ]
                }
            };
            
            const productData = products[product];
            if (!productData) {
                const errorEmbed = new EmbedBuilder()
                    .setColor('#FF0000')
                    .setTitle('❌ Geçersiz Ürün')
                    .setDescription('Seçtiğiniz ürün bulunamadı. Lütfen geçerli bir ürün seçin.')
                    .setTimestamp();
                
                return interaction.editReply({ embeds: [errorEmbed] });
            }
            
            // Check if user has enough coins
            if (userData.coins < productData.price) {
                const errorEmbed = new EmbedBuilder()
                    .setColor('#FF0000')
                    .setTitle('❌ Yetersiz Bakiye')
                    .setDescription(`Bu ürünü satın almak için **${productData.price} 🪙** gerekli.`)
                    .addFields(
                        { name: '💰 Mevcut Bakiyeniz', value: `${userData.coins} 🪙`, inline: true },
                        { name: '💸 Gerekli Miktar', value: `${productData.price} 🪙`, inline: true },
                        { name: '📊 Eksik Miktar', value: `${productData.price - userData.coins} 🪙`, inline: true }
                    )
                    .setTimestamp();
                
                return interaction.editReply({ embeds: [errorEmbed] });
            }
            
            // Deduct coins
            userData.coins -= productData.price;
            
            // Select random reward
            const reward = productData.rewards[Math.floor(Math.random() * productData.rewards.length)];
            
            // Apply reward
            let rewardMessage = reward.message;
            
            switch (reward.type) {
                case 'xp':
                    userData.xp += reward.amount;
                    break;
                case 'coin':
                    userData.coins += reward.amount;
                    break;
                case 'xp-boost':
                    // Store XP boost (you'll need to implement boost tracking)
                    userData.xpBoost = Date.now() + reward.duration;
                    break;
                case 'coin-multiplier':
                    // Store coin multiplier
                    userData.coinMultiplier = {
                        multiplier: reward.multiplier,
                        expires: Date.now() + reward.duration
                    };
                    break;
                case 'extra-spin':
                    // Store extra spin (you'll need to implement spin tracking)
                    userData.extraSpins = (userData.extraSpins || 0) + reward.amount;
                    break;
                case 'free-box':
                    // Give free box (recursive call with 0 cost)
                    userData.coins += productData.price; // Refund the cost
                    const freeBoxReward = products['gizemli-kutu'].rewards[Math.floor(Math.random() * products['gizemli-kutu'].rewards.length)];
                    switch (freeBoxReward.type) {
                        case 'xp':
                            userData.xp += freeBoxReward.amount;
                            break;
                        case 'coin':
                            userData.coins += freeBoxReward.amount;
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
            
            // Save updated data
            voiceManager.saveUserData(guildId, userId, userData);
            
            // Log the purchase
            await this.logPurchase(interaction, productData, userData, rewardMessage);
            
            // Create success embed
            const embed = new EmbedBuilder()
                .setTitle('🛒 Satın Alma Başarılı!')
                .setColor('#00FF00')
                .addFields(
                    { name: '🛍️ Ürün', value: productData.name, inline: true },
                    { name: '💰 Ödenen', value: `${productData.price} 🪙`, inline: true },
                    { name: '💳 Kalan Coin', value: `${userData.coins} 🪙`, inline: true },
                    { name: '🎁 Ödül', value: rewardMessage, inline: false }
                )
                .setTimestamp();
            
            await interaction.editReply({ embeds: [embed] });
            
        } catch (error) {
            console.error('Error in dükkan-al command:', error);
            try {
                if (!interaction.replied && !interaction.deferred) {
                    await interaction.reply({
                        content: '❌ Satın alma işlemi sırasında bir hata oluştu!',
                        flags: 64
                    });
                } else {
                    await interaction.editReply({
                        content: '❌ Satın alma işlemi sırasında bir hata oluştu!',
                        flags: 64
                    });
                }
            } catch (replyError) {
                console.error('Error sending error response:', replyError);
            }
        }
    },

    async logPurchase(interaction, productData, userData, rewardMessage) {
        try {
            // Load server settings to get log channel
            const fs = require('fs');
            const path = require('path');
            
            const getSettingsPath = (guildId) => path.join(__dirname, '..', 'data', `settings_${guildId}.json`);
            const settingsPath = getSettingsPath(interaction.guild.id);
            
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
                                { name: '🛍️ Ürün', value: productData.name, inline: true },
                                { name: '💰 Fiyat', value: `${productData.price} 🪙`, inline: true },
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
