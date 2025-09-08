const { SlashCommandBuilder, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('oyunlar')
        .setDescription('XP ve coin kazanmak icin eglenceli oyunlar oynayın!')

        .addSubcommand(subcommand =>
            subcommand
                .setName('yazi-tura')
                .setDescription('Yazi tura at ve sonuc uzerine bahis yap')
                .addStringOption(option =>
                    option.setName('choice')
                        .setDescription('Yazi veya tura secin')
                        .setRequired(true)
                        .addChoices(
                            { name: 'Yazi', value: 'heads' },
                            { name: 'Tura', value: 'tails' }
                        ))
                .addIntegerOption(option =>
                    option.setName('bet')
                        .setDescription('Bahis yapilacak coin miktari')
                        .setMinValue(1)
                        .setMaxValue(500)
                        .setRequired(true)))
        .addSubcommand(subcommand =>
            subcommand
                .setName('slot')
                .setDescription('Slot makinesi oyna')
                .addIntegerOption(option =>
                    option.setName('bet')
                        .setDescription('Bahis yapilacak coin miktari')
                        .setMinValue(5)
                        .setMaxValue(100)
                        .setRequired(true)))
        .addSubcommand(subcommand =>
            subcommand
                .setName('zar')
                .setDescription('Zar at ve sonuc uzerine bahis yap')
                .addIntegerOption(option =>
                    option.setName('target')
                        .setDescription('Hedef sayi (2-12)')
                        .setMinValue(2)
                        .setMaxValue(12)
                        .setRequired(true))
                .addIntegerOption(option =>
                    option.setName('bet')
                        .setDescription('Bahis yapilacak coin miktari')
                        .setMinValue(1)
                        .setMaxValue(300)
                        .setRequired(true)))
        .addSubcommand(subcommand =>
            subcommand
                .setName('tahmin')
                .setDescription('1-100 arasi bir sayi tahmin edin')
                .addIntegerOption(option =>
                    option.setName('number')
                        .setDescription('Tahmininiz (1-100)')
                        .setMinValue(1)
                        .setMaxValue(100)
                        .setRequired(true))
                .addIntegerOption(option =>
                    option.setName('bet')
                        .setDescription('Bahis yapilacak coin miktari')
                        .setMinValue(1)
                        .setMaxValue(200)
                        .setRequired(true)))
        .addSubcommand(subcommand =>
            subcommand
                .setName('rulet')
                .setDescription('Rulet oyunu oyna - sayı, renk veya çift/tek bahis yap')
                .addStringOption(option =>
                    option.setName('bahis-turu')
                        .setDescription('Bahis türünü seçin')
                        .setRequired(true)
                        .addChoices(
                            { name: 'Sayı (0-36)', value: 'number' },
                            { name: 'Kırmızı', value: 'red' },
                            { name: 'Siyah', value: 'black' },
                            { name: 'Çift', value: 'even' },
                            { name: 'Tek', value: 'odd' }
                        ))
                .addIntegerOption(option =>
                    option.setName('miktar')
                        .setDescription('Bahis miktarı')
                        .setMinValue(10)
                        .setMaxValue(1000)
                        .setRequired(true))
                .addIntegerOption(option =>
                    option.setName('sayi')
                        .setDescription('Bahis yapmak istediğiniz sayı (0-36) - sadece sayı bahsi için')
                        .setMinValue(0)
                        .setMaxValue(36)
                        .setRequired(false)))
        .addSubcommand(subcommand =>
            subcommand
                .setName('tas-kagit-makas')
                .setDescription('Taş kağıt makas oyunu oyna - kullanıcı vs kullanıcı')
                .addUserOption(option =>
                    option.setName('rakip')
                        .setDescription('Oynayacağınız kişi')
                        .setRequired(true))
                .addIntegerOption(option =>
                    option.setName('bahis')
                        .setDescription('Bahis miktarı (her iki oyuncu için)')
                        .setMinValue(1)
                        .setMaxValue(100)
                        .setRequired(true)))
        .addSubcommand(subcommand =>
            subcommand
                .setName('istatistikler')
                .setDescription('Oyun istatistiklerinizi goruntuleyin')),
    
    async execute(interaction) {
        try {
            const subcommand = interaction.options.getSubcommand();
            
            // Get voice manager for coin operations
            const voiceManager = interaction.client.voiceManager;
            if (!voiceManager) {
                return interaction.reply({ content: 'Oyun sistemi mevcut değil!', ephemeral: true });
            }
            
            // Get user stats first - this should be fast
            const userStats = await voiceManager.getUserStats(interaction.user.id, interaction.guildId);
            if (!userStats) {
                return interaction.reply({ 
                    content: '🎮 Önce biraz XP kazanmanız gerekiyor! Oyunlar için coin kazanmaya başlamak için bir ses kanalına katılın!', 
                    ephemeral: true 
                });
            }
        
        switch (subcommand) {
            case 'yazi-tura':
                await this.playCoinflip(interaction, voiceManager, userStats);
                break;
            case 'slot':
                await this.playSlots(interaction, voiceManager, userStats);
                break;
            case 'zar':
                await this.playDice(interaction, voiceManager, userStats);
                break;
            case 'tahmin':
                await this.playGuess(interaction, voiceManager, userStats);
                break;
            case 'tas-kagit-makas':
                await this.playRockPaperScissors(interaction, voiceManager, userStats);
                break;
            case 'gunluk':
                await this.claimDaily(interaction, voiceManager, userStats);
                break;
            case 'istatistikler':
                await this.showGameStats(interaction, voiceManager, userStats);
                break;
        }
    } catch (error) {
        console.error('Error in games command:', error);
        
        // Only try to send an error response if we haven't replied yet
        try {
            if (!interaction.replied) {
                await interaction.reply({
                    content: '❌ Oyun komutu çalıştırılırken bir hata oluştu. Lütfen tekrar deneyin.',
                    ephemeral: true
                });
            } else {
                console.log('Interaction already replied to, not sending error response');
            }
        } catch (replyError) {
            console.error('Could not send error response:', replyError);
        }
    }
    },
    

    
    async playCoinflip(interaction, voiceManager, userStats) {
        const choice = interaction.options.getString('choice');
        const bet = interaction.options.getInteger('bet');
        
        if (userStats.coins < bet) {
            return interaction.reply({ 
                content: `💸 Yeterli coininiz yok! ${userStats.coins} coininiz var ama ${bet} coin gerekiyor.`,
                ephemeral: true
            });
        }
        
        const outcomes = ['heads', 'tails'];
        const result = outcomes[Math.floor(Math.random() * outcomes.length)];
        const won = choice === result;
        
        const winAmount = won ? bet : -bet;
        const newCoins = userStats.coins + winAmount;
        
        // Update user coins
        await voiceManager.db.updateUserStats(
            interaction.user.id, 
            interaction.guildId, 
            userStats.total_xp, 
            newCoins, 
            userStats.voice_time_minutes
        );
        
        const embed = new EmbedBuilder()
            .setColor(won ? '#00FF00' : '#FF0000')
            .setTitle('🪙 Yazı Tura Sonucu')
            .setDescription(`Para **${result === 'heads' ? 'yazı' : 'tura'}** geldi!`)
            .addFields(
                { name: 'Seçiminiz', value: `${choice === 'heads' ? '👤' : '🦅'} ${choice === 'heads' ? 'Yazı' : 'Tura'}`, inline: true },
                { name: 'Sonuç', value: `${result === 'heads' ? '👤' : '🦅'} ${result === 'heads' ? 'Yazı' : 'Tura'}`, inline: true },
                { name: 'Durum', value: won ? `🎉 ${bet} coin kazandınız!` : `💸 ${bet} coin kaybettiniz!`, inline: true },
                { name: 'Bakiye', value: `${newCoins} coin`, inline: false }
            )
            .setFooter({ text: `${interaction.user.username} • ${won ? 'Kazanan!' : 'Bir dahaki sefere!'}` })
            .setTimestamp();
        
        await interaction.reply({ embeds: [embed] });
    },
    
    async playSlots(interaction, voiceManager, userStats) {
        const bet = interaction.options.getInteger('bet');
        
        if (userStats.coins < bet) {
            return interaction.reply({ 
                content: `💸 Yeterli coininiz yok! ${userStats.coins} coininiz var ama ${bet} coin gerekiyor.`,
                ephemeral: true
            });
        }
        
        const symbols = ['🍒', '🍋', '🍊', '🍇', '🔔', '💎', '7️⃣'];
        const weights = [30, 25, 20, 15, 7, 2, 1]; // Higher weight = more common
        
        const getRandomSymbol = () => {
            const totalWeight = weights.reduce((sum, weight) => sum + weight, 0);
            let random = Math.random() * totalWeight;
            
            for (let i = 0; i < symbols.length; i++) {
                random -= weights[i];
                if (random <= 0) return symbols[i];
            }
            return symbols[0];
        };
        
        const result = [getRandomSymbol(), getRandomSymbol(), getRandomSymbol()];
        
        // Calculate winnings
        let multiplier = 0;
        const symbol = result[0];
        
        if (result.every(s => s === symbol)) {
            // All three match
            switch (symbol) {
                case '7️⃣': multiplier = 50; break;
                case '💎': multiplier = 25; break;
                case '🔔': multiplier = 10; break;
                case '🍇': multiplier = 5; break;
                case '🍊': multiplier = 4; break;
                case '🍋': multiplier = 3; break;
                case '🍒': multiplier = 2; break;
            }
        } else if (result.filter(s => s === '🍒').length >= 2) {
            // Two or more cherries
            multiplier = 1.5;
        }
        
        const winAmount = Math.floor(bet * multiplier) - bet;
        const newCoins = userStats.coins + winAmount;
        
        // Update user coins
        await voiceManager.db.updateUserStats(
            interaction.user.id, 
            interaction.guildId, 
            userStats.total_xp, 
            newCoins, 
            userStats.voice_time_minutes
        );
        
        const embed = new EmbedBuilder()
            .setColor(winAmount > 0 ? '#FFD700' : '#FF6B00')
            .setTitle('🎰 Slot Makinesi')
            .setDescription(`┌─────────────┐\\n│  ${result.join(' │ ')}  │\\n└─────────────┘`)
            .addFields(
                { name: 'Sonuç', value: winAmount > 0 ? `🎉 ${winAmount} coin kazandınız! (${multiplier}x)` : `💸 ${bet} coin kaybettiniz!`, inline: false },
                { name: 'Bakiye', value: `${newCoins} coin`, inline: true }
            )
            .setFooter({ text: `${interaction.user.username} • ${winAmount > 0 ? 'Büyük İkramiye!' : 'Tekrar deneyin!'}` })
            .setTimestamp();
        
        await interaction.reply({ embeds: [embed] });
    },
    
    async claimDaily(interaction, voiceManager, userStats) {
        // Check if user has already claimed today
        const lastDaily = await this.getLastDaily(interaction.user.id, interaction.guildId, voiceManager);
        const today = new Date().toDateString();
        
        if (lastDaily === today) {
            const tomorrow = new Date();
            tomorrow.setDate(tomorrow.getDate() + 1);
            tomorrow.setHours(0, 0, 0, 0);
            
            return interaction.reply({
                content: `⏰ Günlük bonusunuzu bugün zaten aldınız! <t:${Math.floor(tomorrow.getTime() / 1000)}:R> tekrar gelin`,
                ephemeral: true
            });
        }
        
        // Calculate daily bonus based on level
        const baseBonus = 50;
        const levelBonus = userStats.level * 5;
        const streakBonus = await this.calculateStreakBonus(interaction.user.id, interaction.guildId, voiceManager);
        const totalBonus = baseBonus + levelBonus + streakBonus;
        
        const xpBonus = Math.floor(totalBonus * 0.5);
        const newCoins = userStats.coins + totalBonus;
        const newXP = userStats.total_xp + xpBonus;
        
        // Update user stats
        await voiceManager.db.updateUserStats(
            interaction.user.id, 
            interaction.guildId, 
            newXP, 
            newCoins, 
            userStats.voice_time_minutes
        );
        
        // Check for level up
        const oldLevel = Math.floor(userStats.total_xp / 100);
        const newLevel = Math.floor(newXP / 100);
        
        if (newLevel > oldLevel) {
            // Get member object for role assignment
            const member = interaction.guild.members.cache.get(interaction.user.id);
            if (member) {
                console.log(`🎉 User ${interaction.user.username} leveled up from ${oldLevel} to ${newLevel} through daily bonus XP`);
                await voiceManager.handleLevelUp(member, newLevel);
            }
        }

        // Record daily claim
        await this.recordDailyClaim(interaction.user.id, interaction.guildId, voiceManager);
        
        const embed = new EmbedBuilder()
            .setColor('#00FF00')
            .setTitle('🎁 Günlük Bonus Alındı!')
            .setDescription('Tekrar hoş geldiniz! İşte günlük ödülünüz:')
            .addFields(
                { name: '🪙 Temel Bonus', value: `${baseBonus} coin`, inline: true },
                { name: '⭐ Seviye Bonusu', value: `${levelBonus} coin`, inline: true },
                { name: '🔥 Seri Bonusu', value: `${streakBonus} coin`, inline: true },
                { name: '📈 XP Bonusu', value: `${xpBonus} XP`, inline: true },
                { name: '💰 Toplam Kazanç', value: `${totalBonus} coin + ${xpBonus} XP`, inline: true },
                { name: '💳 Yeni Bakiye', value: `${newCoins} coin`, inline: true }
            )
            .setFooter({ text: `Seviye ${userStats.level} • Daha fazlası için yarın tekrar gelin!` })
            .setTimestamp();
        
        await interaction.reply({ embeds: [embed] });
    },
    
    async playDice(interaction, voiceManager, userStats) {
        const target = interaction.options.getInteger('target');
        const bet = interaction.options.getInteger('bet');
        
        if (userStats.coins < bet) {
            return interaction.reply({ 
                content: `💸 Yeterli coininiz yok! ${userStats.coins} coininiz var ama ${bet} coin gerekiyor.`,
                ephemeral: true
            });
        }
        
        // Roll two dice
        const dice1 = Math.floor(Math.random() * 6) + 1;
        const dice2 = Math.floor(Math.random() * 6) + 1;
        const total = dice1 + dice2;
        
        const won = total === target;
        const winAmount = won ? bet * 6 : -bet;
        const newCoins = userStats.coins + winAmount;
        
        // Update user coins
        await voiceManager.db.updateUserStats(
            interaction.user.id, 
            interaction.guildId, 
            userStats.total_xp, 
            newCoins, 
            userStats.voice_time_minutes
        );
        
        const embed = new EmbedBuilder()
            .setColor(won ? '#00FF00' : '#FF0000')
            .setTitle('🎲 Zar Oyunu Sonucu')
            .setDescription(`Zarlar **${dice1}** ve **${dice2}** geldi! Toplam: **${total}**`)
            .addFields(
                { name: 'Hedef Sayınız', value: target.toString(), inline: true },
                { name: 'Zar Sonucu', value: total.toString(), inline: true },
                { name: 'Durum', value: won ? `🎉 ${bet * 6} coin kazandınız! (6x)` : `💸 ${bet} coin kaybettiniz!`, inline: true },
                { name: 'Bakiye', value: `${newCoins} coin`, inline: false }
            )
            .setFooter({ text: `${interaction.user.username} • ${won ? 'Mükemmel tahmin!' : 'Tekrar deneyin!'}` })
            .setTimestamp();
        
        await interaction.reply({ embeds: [embed] });
    },
    
    async playGuess(interaction, voiceManager, userStats) {
        const guess = interaction.options.getInteger('number');
        const bet = interaction.options.getInteger('bet');
        
        if (userStats.coins < bet) {
            return interaction.reply({ 
                content: `💸 Yeterli coininiz yok! ${userStats.coins} coininiz var ama ${bet} coin gerekiyor.`, 
                ephemeral: true 
            });
        }
        
        const secretNumber = Math.floor(Math.random() * 100) + 1;
        const difference = Math.abs(guess - secretNumber);
        
        let multiplier = 0;
        let result = '';
        
        if (difference === 0) {
            multiplier = 50;
            result = '🎆 TAM İSABETLİ!';
        } else if (difference <= 5) {
            multiplier = 10;
            result = '🔥 Çok yakın!';
        } else if (difference <= 10) {
            multiplier = 5;
            result = '🔹 Yakın!';
        } else if (difference <= 20) {
            multiplier = 2;
            result = '🟡 Yakın sayılır!';
        } else {
            multiplier = 0;
            result = '❌ Uzak!';
        }
        
        const winAmount = Math.floor(bet * multiplier) - bet;
        const newCoins = userStats.coins + winAmount;
        
        // Update user coins
        await voiceManager.db.updateUserStats(
            interaction.user.id, 
            interaction.guildId, 
            userStats.total_xp, 
            newCoins, 
            userStats.voice_time_minutes
        );
        
        const embed = new EmbedBuilder()
            .setColor(winAmount > 0 ? '#00FF00' : '#FF6B00')
            .setTitle('🤔 Sayı Tahmin Oyunu')
            .setDescription(`Gizli sayı: **${secretNumber}**\nTahmin farkı: **${difference}**`)
            .addFields(
                { name: 'Tahmininiz', value: guess.toString(), inline: true },
                { name: 'Sonuç', value: result, inline: true },
                { name: 'Durum', value: winAmount > 0 ? `🎉 ${winAmount} coin kazandınız! (${multiplier}x)` : `💸 ${bet} coin kaybettiniz!`, inline: true },
                { name: 'Bakiye', value: `${newCoins} coin`, inline: false }
            )
            .setFooter({ text: `${interaction.user.username} • ${winAmount > 0 ? 'Harika tahmin!' : 'Tekrar deneyin!'}` })
            .setTimestamp();
        
        await interaction.reply({ embeds: [embed] });
    },
    
    async showGameStats(interaction, voiceManager, userStats) {
        const embed = new EmbedBuilder()
            .setColor('#9370DB')
            .setTitle('📈 Oyun İstatistikleriniz')
            .setDescription('Oyun performansınızı görüntüleyin!')
            .addFields(
                { name: '🏆 Genel Durum', value: `Seviye: **${userStats.level}**\nToplam XP: **${userStats.total_xp.toLocaleString()}**\nCoin Bakiyesi: **${userStats.coins.toLocaleString()}**`, inline: false },
                { name: '🎮 Oyun Bilgileri', value: 'Mevcut oyunlar:\n• Yazı Tura\n• Slot Makinesi\n• Zar Oyunu\n• Sayı Tahmin', inline: true },
                { name: '🎁 Bonuslar', value: 'Günlük bonus: `/oyunlar gunluk`\nSes kanalında zaman geçirerek coin kazanabilirsiniz!', inline: true }
            )
            .setThumbnail(interaction.user.displayAvatarURL({ dynamic: true }))
            .setFooter({ text: `${interaction.guild.name} • Oyun İstatistikleri` })
            .setTimestamp();
        
        await interaction.reply({ embeds: [embed] });
    },
    
    async playRoulette(interaction, voiceManager, userStats) {
        const betType = interaction.options.getString('bahis-turu');
        const number = interaction.options.getInteger('sayi');
        const bet = interaction.options.getInteger('miktar');
        
        if (userStats.coins < bet) {
            return interaction.reply({ 
                content: `💸 Yeterli coininiz yok! ${userStats.coins} coininiz var ama ${bet} coin gerekiyor.`,
                ephemeral: true
            });
        }
        
        // Validate number bet
        if (betType === 'number' && (number === null || number === undefined)) {
            return interaction.reply({
                content: '❌ Sayı bahsi için bir sayı belirtmelisiniz (0-36)!',
                ephemeral: true
            });
        }
        
        // European roulette numbers with colors
        const redNumbers = [1, 3, 5, 7, 9, 12, 14, 16, 18, 19, 21, 23, 25, 27, 30, 32, 34, 36];
        const blackNumbers = [2, 4, 6, 8, 10, 11, 13, 15, 17, 20, 22, 24, 26, 28, 29, 31, 33, 35];
        
        // Spin the wheel
        const result = Math.floor(Math.random() * 37); // 0-36
        
        // Determine result color
        let resultColor = 'green'; // 0 is green
        if (redNumbers.includes(result)) resultColor = 'red';
        if (blackNumbers.includes(result)) resultColor = 'black';
        
        // Check if bet wins
        let won = false;
        let multiplier = 0;
        let betDescription = '';
        
        switch (betType) {
            case 'number':
                won = result === number;
                multiplier = won ? 35 : 0; // 35:1 payout for straight up
                betDescription = `Sayı ${number}`;
                break;
            case 'red':
                won = resultColor === 'red';
                multiplier = won ? 2 : 0; // 1:1 payout
                betDescription = 'Kırmızı';
                break;
            case 'black':
                won = resultColor === 'black';
                multiplier = won ? 2 : 0; // 1:1 payout
                betDescription = 'Siyah';
                break;
            case 'even':
                won = result !== 0 && result % 2 === 0;
                multiplier = won ? 2 : 0; // 1:1 payout
                betDescription = 'Çift';
                break;
            case 'odd':
                won = result !== 0 && result % 2 === 1;
                multiplier = won ? 2 : 0; // 1:1 payout
                betDescription = 'Tek';
                break;
        }
        
        const winAmount = won ? bet * multiplier - bet : -bet;
        const newCoins = userStats.coins + winAmount;
        
        // Update user coins
        await voiceManager.db.updateUserStats(
            interaction.user.id,
            interaction.guildId,
            userStats.total_xp,
            newCoins,
            userStats.voice_time_minutes
        );
        
        // Get color emoji
        const getColorEmoji = (color) => {
            switch (color) {
                case 'red': return '🔴';
                case 'black': return '⚫';
                case 'green': return '🟢';
                default: return '⚪';
            }
        };
        
        const embed = new EmbedBuilder()
            .setColor(won ? '#FFD700' : '#FF6B00')
            .setTitle('🎰 Rulet Sonucu')
            .setDescription(`**🎯 Sonuç: ${getColorEmoji(resultColor)} ${result}**\n\n🎲 Rulet döndü...`)
            .addFields(
                { name: '🎯 Bahsiniz', value: betDescription, inline: true },
                { name: '🎲 Sonuç', value: `${getColorEmoji(resultColor)} ${result} (${resultColor === 'green' ? 'Yeşil' : resultColor === 'red' ? 'Kırmızı' : 'Siyah'})`, inline: true },
                { name: '💰 Durum', value: won ? `🎉 ${winAmount} coin kazandınız! (${multiplier}x)` : `💸 ${bet} coin kaybettiniz!`, inline: true },
                { name: '💳 Yeni Bakiye', value: `${newCoins.toLocaleString()} coin`, inline: true }
            )
            .setFooter({ 
                text: `${interaction.user.username} • ${won ? 'Büyük Kazanç!' : 'Tekrar şansınızı deneyin!'}`,
                iconURL: interaction.user.displayAvatarURL()
            })
            .setTimestamp();
        
        // Add special message for big wins
        if (won && multiplier >= 10) {
            embed.addFields({
                name: '🎊 BÜYÜK KAZANÇ!',
                value: `Sayı bahsi ile müthiş bir kazanç elde ettiniz!`,
                inline: false
            });
        }
        
        await interaction.reply({ embeds: [embed] });
    },
    
    async playRockPaperScissors(interaction, voiceManager, userStats) {
        const opponent = interaction.options.getUser('rakip');
        const bet = interaction.options.getInteger('bahis');
        
        // Check if user is trying to play against themselves
        if (opponent.id === interaction.user.id) {
            return interaction.reply({
                content: '❌ Kendinizle oynayamazsınız! Başka birini seçin.',
                ephemeral: true
            });
        }
        
        // Check if user has enough coins
        console.log(`🎮 User ${interaction.user.username} has ${userStats.coins} coins, needs ${bet} coins`);
        if (userStats.coins < bet) {
            return interaction.reply({
                content: `💸 Yeterli coininiz yok! ${userStats.coins} coininiz var ama ${bet} coin gerekiyor.`,
                ephemeral: true
            });
        }
        
        // Get opponent stats
        const opponentStats = await voiceManager.getUserStats(opponent.id, interaction.guildId);
        if (!opponentStats) {
            return interaction.reply({
                content: `❌ ${opponent.username} henüz bot sistemine kayıtlı değil! Önce bir ses kanalına katılması gerekiyor.`,
                ephemeral: true
            });
        }
        
        // Check if opponent has enough coins
        if (opponentStats.coins < bet) {
            return interaction.reply({
                content: `❌ ${opponent.username} yeterli coine sahip değil! ${opponentStats.coins} coini var ama ${bet} coin gerekiyor.`,
                ephemeral: true
            });
        }
        
        // Create game invitation
        const embed = new EmbedBuilder()
            .setColor('#FF6B00')
            .setTitle('✂️ Taş Kağıt Makas Daveti')
            .setDescription(`${interaction.user.username} ${opponent.username} ile taş kağıt makas oynamak istiyor!`)
            .addFields(
                { name: '💰 Bahis Miktarı', value: `${bet} coin (her oyuncu için)`, inline: true },
                { name: '🎯 Kazanan', value: 'Tüm bahisleri alır', inline: true },
                { name: '⏰ Süre', value: '30 saniye', inline: true }
            )
            .setFooter({ text: `${opponent.username} kabul etmek için aşağıdaki butonları kullanabilir` })
            .setTimestamp();
        
        const row = new ActionRowBuilder()
            .addComponents(
                new ButtonBuilder()
                    .setCustomId(`rps_accept_${interaction.user.id}_${opponent.id}_${bet}`)
                    .setLabel('✅ Kabul Et')
                    .setStyle(ButtonStyle.Success),
                new ButtonBuilder()
                    .setCustomId(`rps_decline_${interaction.user.id}_${opponent.id}_${bet}`)
                    .setLabel('❌ Reddet')
                    .setStyle(ButtonStyle.Danger)
            );
        
        await interaction.reply({ 
            content: `${opponent}`, 
            embeds: [embed], 
            components: [row] 
        });
        
        // Store game data
        this.storeGameData(`rps_${interaction.user.id}_${opponent.id}`, {
            challenger: interaction.user,
            opponent: opponent,
            bet: bet,
            guildId: interaction.guildId,
            voiceManager: voiceManager,
            startTime: Date.now()
        });
        
        // Auto-decline after 30 seconds
        setTimeout(async () => {
            const gameData = this.getGameData(`rps_${interaction.user.id}_${opponent.id}`);
            if (gameData) {
                try {
                    const timeoutEmbed = new EmbedBuilder()
                        .setColor('#FF0000')
                        .setTitle('⏰ Süre Doldu!')
                        .setDescription(`${opponent.username} daveti kabul etmedi. Oyun iptal edildi.`)
                        .setTimestamp();
                    
                    await interaction.editReply({ embeds: [timeoutEmbed], components: [] });
                } catch (error) {
                    console.error('Error handling RPS timeout:', error);
                }
                this.gameData.delete(`rps_${interaction.user.id}_${opponent.id}`);
            }
        }, 30000);
    },
    
    async handleRPSChoice(interaction, choice) {
        const customId = interaction.customId;
        const [, action, challengerId, opponentId, bet] = customId.split('_');
        
        if (action === 'decline') {
            const embed = new EmbedBuilder()
                .setColor('#FF0000')
                .setTitle('❌ Oyun Reddedildi')
                .setDescription(`${interaction.user.username} oyunu reddetti.`)
                .setTimestamp();
            
            await interaction.update({ embeds: [embed], components: [] });
            this.gameData.delete(`rps_${challengerId}_${opponentId}`);
            return;
        }
        
        if (action === 'accept') {
            // Create choice buttons for both players
            const embed = new EmbedBuilder()
                .setColor('#00FF00')
                .setTitle('✂️ Taş Kağıt Makas - Seçim Zamanı!')
                .setDescription('Her iki oyuncu da seçimini yapmalı!')
                .addFields(
                    { name: '💰 Bahis', value: `${bet} coin`, inline: true },
                    { name: '⏰ Süre', value: '30 saniye', inline: true }
                )
                .setTimestamp();
            
            const row = new ActionRowBuilder()
                .addComponents(
                    new ButtonBuilder()
                        .setCustomId(`rps_choice_${challengerId}_${opponentId}_${bet}_rock`)
                        .setLabel('🪨 Taş')
                        .setStyle(ButtonStyle.Primary),
                    new ButtonBuilder()
                        .setCustomId(`rps_choice_${challengerId}_${opponentId}_${bet}_paper`)
                        .setLabel('📄 Kağıt')
                        .setStyle(ButtonStyle.Primary),
                    new ButtonBuilder()
                        .setCustomId(`rps_choice_${challengerId}_${opponentId}_${bet}_scissors`)
                        .setLabel('✂️ Makas')
                        .setStyle(ButtonStyle.Primary)
                );
            
            await interaction.update({ embeds: [embed], components: [row] });
            
            // Store choices
            this.storeGameData(`rps_choices_${challengerId}_${opponentId}`, {
                challenger: challengerId,
                opponent: opponentId,
                bet: parseInt(bet),
                choices: {},
                guildId: interaction.guildId,
                voiceManager: interaction.client.voiceManager,
                startTime: Date.now()
            });
            
            // Auto-timeout after 30 seconds
            setTimeout(async () => {
                const choicesData = this.getGameData(`rps_choices_${challengerId}_${opponentId}`);
                if (choicesData && Object.keys(choicesData.choices).length < 2) {
                    try {
                        const timeoutEmbed = new EmbedBuilder()
                            .setColor('#FF0000')
                            .setTitle('⏰ Süre Doldu!')
                            .setDescription('Seçim süresi doldu. Oyun iptal edildi.')
                            .setTimestamp();
                        
                        await interaction.editReply({ embeds: [timeoutEmbed], components: [] });
                    } catch (error) {
                        console.error('Error handling RPS choice timeout:', error);
                    }
                    this.gameData.delete(`rps_choices_${challengerId}_${opponentId}`);
                }
            }, 30000);
        }
        
        if (action === 'choice') {
            console.log(`🎮 RPS choice handler called for user ${interaction.user.id}, choice: ${choice}`);
            const choicesData = this.getGameData(`rps_choices_${challengerId}_${opponentId}`);
            console.log(`🎮 RPS game data found:`, choicesData ? 'Yes' : 'No');
            if (!choicesData) {
                return interaction.reply({ content: '❌ Oyun bulunamadı! Lütfen yeni bir oyun başlatın.', ephemeral: true });
            }
            
            // Store the choice
            choicesData.choices[interaction.user.id] = choice;
            
            // Check if both players have made their choices
            if (Object.keys(choicesData.choices).length === 2) {
                // Defer the interaction before resolving the game
                if (!interaction.replied && !interaction.deferred) {
                    await interaction.deferReply();
                }
                await this.resolveRPSGame(interaction, choicesData);
            } else {
                // Acknowledge the choice
                await interaction.reply({ 
                    content: `✅ Seçiminizi yaptınız: ${this.getChoiceEmoji(choice)} ${this.getChoiceName(choice)}`, 
                    ephemeral: true 
                });
            }
        }
    },
    
    async resolveRPSGame(interaction, gameData) {
        const challengerChoice = gameData.choices[gameData.challenger];
        const opponentChoice = gameData.choices[gameData.opponent];
        
        const challenger = interaction.guild.members.cache.get(gameData.challenger);
        const opponent = interaction.guild.members.cache.get(gameData.opponent);
        
        // Determine winner
        let winner = null;
        let result = '';
        
        if (challengerChoice === opponentChoice) {
            result = 'Berabere!';
        } else if (
            (challengerChoice === 'rock' && opponentChoice === 'scissors') ||
            (challengerChoice === 'paper' && opponentChoice === 'rock') ||
            (challengerChoice === 'scissors' && opponentChoice === 'paper')
        ) {
            winner = challenger;
            result = `${challenger.user.username} kazandı!`;
        } else {
            winner = opponent;
            result = `${opponent.user.username} kazandı!`;
        }
        
        // Handle coin transfers
        if (winner) {
            const winnerStats = await gameData.voiceManager.getUserStats(winner.id, gameData.guildId);
            const loserStats = await gameData.voiceManager.getUserStats(
                winner.id === gameData.challenger ? gameData.opponent : gameData.challenger, 
                gameData.guildId
            );
            
            // Transfer coins
            await gameData.voiceManager.db.updateUserStats(
                winner.id, 
                gameData.guildId, 
                winnerStats.total_xp, 
                winnerStats.coins + gameData.bet * 2, 
                winnerStats.voice_time_minutes
            );
            
            await gameData.voiceManager.db.updateUserStats(
                winner.id === gameData.challenger ? gameData.opponent : gameData.challenger, 
                gameData.guildId, 
                loserStats.total_xp, 
                loserStats.coins - gameData.bet, 
                loserStats.voice_time_minutes
            );
        } else {
            // Draw - refund coins to both players (no transfer needed)
            // Both players keep their original coins
        }
        
        // Create result embed
        const embed = new EmbedBuilder()
            .setColor(winner ? '#00FF00' : '#FFD700')
            .setTitle('✂️ Taş Kağıt Makas Sonucu')
            .setDescription(result)
            .addFields(
                { 
                    name: `${challenger.user.username}`, 
                    value: `${this.getChoiceEmoji(challengerChoice)} ${this.getChoiceName(challengerChoice)}`, 
                    inline: true 
                },
                { 
                    name: `${opponent.user.username}`, 
                    value: `${this.getChoiceEmoji(opponentChoice)} ${this.getChoiceName(opponentChoice)}`, 
                    inline: true 
                },
                { name: '💰 Bahis', value: `${gameData.bet} coin`, inline: true }
            )
            .setTimestamp();
        
        if (winner) {
            embed.addFields({
                name: '🎉 Kazanan',
                value: `${winner.user.username} ${gameData.bet * 2} coin kazandı!`,
                inline: false
            });
        } else {
            embed.addFields({
                name: '🤝 Sonuç',
                value: 'Berabere! Herkes kendi bahsini geri alır.',
                inline: false
            });
        }
        
        try {
            if (interaction.replied || interaction.deferred) {
                await interaction.editReply({ embeds: [embed], components: [] });
            } else {
                await interaction.reply({ embeds: [embed], components: [] });
            }
        } catch (error) {
            console.error('Error updating RPS game result:', error);
            // Try to send a follow-up message if edit fails
            try {
                await interaction.followUp({ embeds: [embed], ephemeral: false });
            } catch (followUpError) {
                console.error('Error sending follow-up for RPS game:', followUpError);
            }
        }
        
        // Clean up
        this.gameData.delete(`rps_choices_${gameData.challenger}_${gameData.opponent}`);
    },
    
    getChoiceEmoji(choice) {
        switch (choice) {
            case 'rock': return '🪨';
            case 'paper': return '📄';
            case 'scissors': return '✂️';
            default: return '❓';
        }
    },
    
    getChoiceName(choice) {
        switch (choice) {
            case 'rock': return 'Taş';
            case 'paper': return 'Kağıt';
            case 'scissors': return 'Makas';
            default: return 'Bilinmiyor';
        }
    },
    
    // Helper methods for game data management
    gameData: new Map(),
    
    storeGameData(userId, data) {
        console.log(`🎮 Storing game data for: ${userId}`);
        this.gameData.set(userId, data);
        console.log(`🎮 Game data stored. Total entries: ${this.gameData.size}`);
        // Clean up after 10 minutes to prevent memory leaks
        setTimeout(() => {
            if (this.gameData.has(userId)) {
                console.log(`Cleaning up expired game data for: ${userId}`);
                this.gameData.delete(userId);
            }
        }, 10 * 60 * 1000); // 10 minutes
    },
    
    getGameData(userId) {
        return this.gameData.get(userId);
    },
    
    async getLastDaily(userId, guildId, voiceManager) {
        try {
            const result = await voiceManager.db.dbGet(
                'SELECT claimed_at FROM daily_claims WHERE user_id = ? AND guild_id = ? ORDER BY claimed_at DESC LIMIT 1',
                [userId, guildId]
            );
            return result ? new Date(result.claimed_at).toDateString() : null;
        } catch (error) {
            return null;
        }
    },
    
    async recordDailyClaim(userId, guildId, voiceManager) {
        try {
            await voiceManager.db.dbRun(
                'INSERT INTO daily_claims (user_id, guild_id, claimed_at) VALUES (?, ?, CURRENT_TIMESTAMP)',
                [userId, guildId]
            );
        } catch (error) {
            console.error('Error recording daily claim:', error);
        }
    },
    
    async calculateStreakBonus(userId, guildId, voiceManager) {
        // Simplified streak calculation
        return Math.floor(Math.random() * 50); // 0-50 bonus coins
    }
};