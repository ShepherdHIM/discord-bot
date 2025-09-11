const { SlashCommandBuilder, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('bilgi_yarismasi')
        .setDescription('XP ve coin kazanmak icin bilgi yarismasi oynayin!')
        .addStringOption(option =>
            option.setName('kategori')
                .setDescription('Bilgi yarışması kategorisi seçin')
                .setRequired(false)
                .addChoices(
                    { name: 'Genel Bilgi', value: 'general' },
                    { name: 'Oyun', value: 'gaming' },
                    { name: 'Bilim', value: 'science' },
                    { name: 'Tarih', value: 'history' },
                    { name: 'Rastgele', value: 'random' }
                ))
        .addStringOption(option =>
            option.setName('zorluk')
                .setDescription('Zorluk seviyesi seçin')
                .setRequired(false)
                .addChoices(
                    { name: 'Kolay', value: 'easy' },
                    { name: 'Orta', value: 'medium' },
                    { name: 'Zor', value: 'hard' }
                )),

    async execute(interaction) {
        try {
            // Defer reply immediately to prevent timeout
            if (!interaction.replied && !interaction.deferred) {
                await interaction.deferReply();
            }
            
            const category = interaction.options.getString('kategori') || 'random';
            const difficulty = interaction.options.getString('zorluk') || 'medium';
            
            // Get voice manager for rewards
            const voiceManager = interaction.client.voiceManager;
            if (!voiceManager) {
                return interaction.editReply({ content: 'Bilgi yarışması sistemi mevcut değil!', ephemeral: true });
            }
            
            // Get user stats
            const userStats = await voiceManager.getUserStats(interaction.user.id, interaction.guildId);
            if (!userStats) {
                return interaction.editReply({ 
                    content: '🧠 Önce biraz XP kazanmanız gerekiyor! Yolculuğunuza başlamak için bir ses kanalına katılın!', 
                    ephemeral: true 
                });
            }
            
            // Get a random question
            const question = this.getRandomQuestion(category, difficulty);
            
            // Create answer buttons
            const row = new ActionRowBuilder();
            const shuffledAnswers = this.shuffleArray([...question.incorrect_answers, question.correct_answer]);
            
            shuffledAnswers.forEach((answer, index) => {
                row.addComponents(
                    new ButtonBuilder()
                        .setCustomId(`trivia_${index}_${answer === question.correct_answer ? 'correct' : 'incorrect'}`)
                        .setLabel(answer.length > 80 ? answer.substring(0, 77) + '...' : answer)
                        .setStyle(ButtonStyle.Primary)
                );
            });
            
            // Calculate potential rewards based on difficulty and reward ranges
            let xpReward, coinReward;
            const rewardRanges = await voiceManager.getActiveRewardRanges(interaction.guildId);
            const xpRanges = rewardRanges.filter(range => range.reward_type === 'xp');
            const coinRanges = rewardRanges.filter(range => range.reward_type === 'coin');
            
            // Calculate base rewards based on difficulty
            const rewardMultiplier = { easy: 1, medium: 1.5, hard: 2 }[difficulty];
            const baseXPReward = Math.floor(20 * rewardMultiplier);
            const baseCoinReward = Math.floor(15 * rewardMultiplier);
            
            // Use reward ranges if available, otherwise use base rewards
            if (xpRanges.length > 0) {
                const randomRange = xpRanges[Math.floor(Math.random() * xpRanges.length)];
                xpReward = Math.floor(Math.random() * (randomRange.max_amount - randomRange.min_amount + 1)) + randomRange.min_amount;
            } else {
                xpReward = baseXPReward;
            }
            
            if (coinRanges.length > 0) {
                const randomRange = coinRanges[Math.floor(Math.random() * coinRanges.length)];
                coinReward = Math.floor(Math.random() * (randomRange.max_amount - randomRange.min_amount + 1)) + randomRange.min_amount;
            } else {
                coinReward = baseCoinReward;
            }
            
            const embed = new EmbedBuilder()
                .setColor('#4169E1')
                .setTitle(`🧠 ${this.getCategoryDisplayName(category)} Bilgi Yarışması`)
                .setDescription(`**${this.getDifficultyDisplayName(difficulty)} Seviye Soru**\n\n${question.question}`)
                .addFields(
                    { name: '🏆 Doğru Cevap Ödülü', value: `+${xpReward} XP, +${coinReward} coin`, inline: true },
                    { name: '🎯 Yanlış Cevap Ödülü', value: `+5 XP (katılım)`, inline: true },
                    { name: '⏰ Zaman Sınırı', value: '30 saniye', inline: true }
                )
                .setFooter({ 
                    text: `${interaction.user.username} • ${userStats.coins} coin • Seviye ${userStats.level}`,
                    iconURL: interaction.user.displayAvatarURL()
                })
                .setTimestamp();
            
            await interaction.editReply({ embeds: [embed], components: [row] });
            
            // Store trivia data for answer handling
            this.storeTriviaData(interaction.user.id, {
                question,
                difficulty,
                category,
                xpReward,
                coinReward,
                userStats,
                voiceManager,
                startTime: Date.now()
            });
            
            // Auto-timeout after 60 seconds
            setTimeout(async () => {
                const triviaData = this.getTriviaData(interaction.user.id);
                if (triviaData && !triviaData.answered) {
                    try {
                        const timeoutEmbed = new EmbedBuilder()
                            .setColor('#FF6B00')
                            .setTitle('⏰ Süre Doldu!')
                            .setDescription(`Doğru cevap: **${question.correct_answer}** idi`)
                            .addFields({ name: 'Ödül', value: '+2 XP (zaman aşımı bonusu)', inline: false })
                            .setFooter({ text: 'Başka bir soru deneyiniz!' });
                        
                        await interaction.editReply({ embeds: [timeoutEmbed], components: [] });
                        
                        // Give small consolation XP
                        await triviaData.voiceManager.updateUserStats(
                            interaction.user.id,
                            interaction.guildId,
                            triviaData.userStats.total_xp + 2,
                            triviaData.userStats.coins,
                            triviaData.userStats.voice_time_minutes
                        );
                    } catch (error) {
                        console.error('Error handling trivia timeout:', error);
                    }
                    this.triviaData.delete(interaction.user.id);
                }
            }, 60000);
            
        } catch (error) {
            console.error('Error in trivia command:', error);
            
            try {
                if (!interaction.replied && !interaction.deferred) {
                    await interaction.reply({ 
                        content: '❌ Bilgi yarışması başlatılırken bir hata oluştu!', 
                        ephemeral: true 
                    });
                } else {
                    await interaction.editReply({ 
                        content: '❌ Bilgi yarışması başlatılırken bir hata oluştu!', 
                        ephemeral: true 
                    });
                }
            } catch (replyError) {
                console.error('Error sending error response:', replyError);
            }
        }
    },
    
    getRandomQuestion(category, difficulty) {
        const questions = this.getQuestionBank();
        const categoryQuestions = category === 'random' ? 
            Object.values(questions).flat() : 
            questions[category] || questions.general;
        
        const difficultyQuestions = categoryQuestions.filter(q => q.difficulty === difficulty);
        const availableQuestions = difficultyQuestions.length > 0 ? difficultyQuestions : categoryQuestions;
        
        return availableQuestions[Math.floor(Math.random() * availableQuestions.length)];
    },
    
    getQuestionBank() {
        return {
            general: [
                {
                    question: "Türkiye'nin başkenti neresidir?",
                    correct_answer: "Ankara",
                    incorrect_answers: ["İstanbul", "İzmir", "Bursa"],
                    difficulty: "easy"
                },
                {
                    question: "Dünya'nın en büyük gezegeni hangisidir?",
                    correct_answer: "Jüpiter",
                    incorrect_answers: ["Satürn", "Neptün", "Dünya"],
                    difficulty: "easy"
                },
                {
                    question: "144'ün karekökü kaçtır?",
                    correct_answer: "12",
                    incorrect_answers: ["14", "16", "10"],
                    difficulty: "easy"
                },
                {
                    question: "Hangi elementin kimyasal sembolü 'Au'dur?",
                    correct_answer: "Altın",
                    incorrect_answers: ["Gümüş", "Alüminyum", "Argon"],
                    difficulty: "medium"
                },
                {
                    question: "İnsan vücudunda kaç kemik vardır?",
                    correct_answer: "206",
                    incorrect_answers: ["205", "208", "210"],
                    difficulty: "medium"
                },
                {
                    question: "Hangi vitamin güneş ışığından elde edilir?",
                    correct_answer: "D Vitamini",
                    incorrect_answers: ["C Vitamini", "A Vitamini", "B12 Vitamini"],
                    difficulty: "hard"
                }
            ],
            gaming: [
                {
                    question: "Minecraft oyununu hangi şirket yaratmıştır?",
                    correct_answer: "Mojang",
                    incorrect_answers: ["Microsoft", "Sony", "Nintendo"],
                    difficulty: "easy"
                },
                {
                    question: "İlk Pokemon oyunu hangi yıl çıkmıştır?",
                    correct_answer: "1996",
                    incorrect_answers: ["1994", "1998", "1995"],
                    difficulty: "medium"
                },
                {
                    question: "Counter-Strike oyununda bomb defuse süresi kaç saniyedir?",
                    correct_answer: "10 saniye",
                    incorrect_answers: ["5 saniye", "15 saniye", "7 saniye"],
                    difficulty: "medium"
                },
                {
                    question: "League of Legends'ta kaç şampiyon vardır? (2024 itibariyle)",
                    correct_answer: "160+",
                    incorrect_answers: ["150+", "140+", "170+"],
                    difficulty: "hard"
                },
                {
                    question: "Hangi oyun türü 'FPS' olarak kısaltılır?",
                    correct_answer: "First Person Shooter",
                    incorrect_answers: ["Fast Paced Strategy", "Fighting Player System", "Fantasy Role Playing"],
                    difficulty: "easy"
                }
            ],
            science: [
                {
                    question: "Bitkiler atmosferden hangi gazı emerler?",
                    correct_answer: "Karbondioksit",
                    incorrect_answers: ["Oksijen", "Azot", "Hidrojen"],
                    difficulty: "easy"
                },
                {
                    question: "Işığın boşluktaki hızı nedir?",
                    correct_answer: "299,792,458 m/s",
                    incorrect_answers: ["300,000,000 m/s", "299,000,000 m/s", "298,792,458 m/s"],
                    difficulty: "hard"
                },
                {
                    question: "Periyodik tabloda kaç element vardır?",
                    correct_answer: "118",
                    incorrect_answers: ["116", "120", "115"],
                    difficulty: "medium"
                },
                {
                    question: "DNA'nın açılımı nedir?",
                    correct_answer: "Deoksiribonükleik Asit",
                    incorrect_answers: ["Deoxi Riboz Asit", "Deoksi Ribonükleik Amino", "Deoksi Riboz Nükleik Asit"],
                    difficulty: "hard"
                },
                {
                    question: "Su kaç derecede kaynar?",
                    correct_answer: "100°C",
                    incorrect_answers: ["90°C", "110°C", "95°C"],
                    difficulty: "easy"
                }
            ],
            history: [
                {
                    question: "İkinci Dünya Savaşı hangi yıl sona ermiştir?",
                    correct_answer: "1945",
                    incorrect_answers: ["1944", "1946", "1943"],
                    difficulty: "easy"
                },
                {
                    question: "Aya ayak basan ilk insan kimdir?",
                    correct_answer: "Neil Armstrong",
                    incorrect_answers: ["Buzz Aldrin", "John Glenn", "Alan Shepard"],
                    difficulty: "medium"
                },
                {
                    question: "Osmanlı İmparatorluğu hangi yıl kurulmuştur?",
                    correct_answer: "1299",
                    incorrect_answers: ["1300", "1298", "1301"],
                    difficulty: "medium"
                },
                {
                    question: "Türkiye Cumhuriyeti hangi yıl kurulmuştur?",
                    correct_answer: "1923",
                    incorrect_answers: ["1922", "1924", "1920"],
                    difficulty: "easy"
                },
                {
                    question: "İstanbul'un fethi hangi yıl gerçekleşmiştir?",
                    correct_answer: "1453",
                    incorrect_answers: ["1452", "1454", "1451"],
                    difficulty: "medium"
                },
                {
                    question: "Atatürk hangi şehirde doğmuştur?",
                    correct_answer: "Selanik",
                    incorrect_answers: ["İstanbul", "Ankara", "İzmir"],
                    difficulty: "hard"
                }
            ]
        };
    },
    
    shuffleArray(array) {
        const shuffled = [...array];
        for (let i = shuffled.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
        }
        return shuffled;
    },
    
    // Trivia data management
    triviaData: new Map(),
    
    storeTriviaData(userId, data) {
        this.triviaData.set(userId, data);
    },
    
    getTriviaData(userId) {
        return this.triviaData.get(userId);
    },
    
    clearTriviaData(userId) {
        this.triviaData.delete(userId);
    },
    
    async handleTriviaAnswer(interaction, isCorrect) {
        console.log(`🎯 Trivia answer handler called for user ${interaction.user.id}, isCorrect: ${isCorrect}`);
        const triviaData = this.getTriviaData(interaction.user.id);
        console.log(`🎯 Trivia data found:`, triviaData ? 'Yes' : 'No');
        if (!triviaData) {
            return interaction.reply({ content: '❌ Oyun bulunamadı! Lütfen yeni bir soru başlatın.', ephemeral: true });
        }
        
        // Check if already answered
        if (triviaData.answered) {
            return interaction.reply({ content: '❌ Bu soruyu zaten cevapladınız!', ephemeral: true });
        }
        
        triviaData.answered = true;
        
        let rewardText = '';
        let newXP = triviaData.userStats.total_xp;
        let newCoins = triviaData.userStats.coins;
        
        if (isCorrect) {
            // Give full rewards for correct answer
            newXP += triviaData.xpReward;
            newCoins += triviaData.coinReward;
            rewardText = `🎉 Doğru cevap! +${triviaData.xpReward} XP, +${triviaData.coinReward} coin kazandınız!`;
        } else {
            // Give participation reward for wrong answer
            newXP += 5;
            rewardText = `❌ Yanlış cevap! Doğru cevap: **${triviaData.question.correct_answer}**\n+5 XP (katılım ödülü)`;
        }
        
        // Update user stats
        await triviaData.voiceManager.updateUserStats(
            interaction.user.id,
            interaction.guildId,
            newXP,
            newCoins,
            triviaData.userStats.voice_time_minutes
        );
        
        // Check for level up
        const oldLevel = Math.floor(triviaData.userStats.total_xp / 100);
        const newLevel = Math.floor(newXP / 100);
        
        if (newLevel > oldLevel) {
            const member = interaction.guild.members.cache.get(interaction.user.id);
            if (member) {
                console.log(`🎉 User ${interaction.user.username} leveled up from ${oldLevel} to ${newLevel} through trivia`);
                await triviaData.voiceManager.handleLevelUp(member, newLevel);
            }
        }
        
        // Create result embed
        const resultEmbed = new EmbedBuilder()
            .setColor(isCorrect ? '#00FF00' : '#FF6B00')
            .setTitle(isCorrect ? '🎉 Doğru Cevap!' : '❌ Yanlış Cevap!')
            .setDescription(rewardText)
            .addFields(
                { name: '💰 Yeni Bakiye', value: `${newCoins} coin`, inline: true },
                { name: '📈 Toplam XP', value: `${newXP} XP`, inline: true },
                { name: '⭐ Seviye', value: `Seviye ${newLevel}`, inline: true }
            )
            .setFooter({ text: 'Başka bir soru deneyiniz!' })
            .setTimestamp();
        
        await interaction.update({ embeds: [resultEmbed], components: [] });
        
        // Clean up
        this.triviaData.delete(interaction.user.id);
    },
    
    triviaData: new Map(),
    
    storeTriviaData(userId, data) {
        console.log(`🎯 Storing trivia data for user ${userId}`);
        this.triviaData.set(userId, data);
        console.log(`🎯 Trivia data stored. Total entries: ${this.triviaData.size}`);
        // Clean up after 10 minutes to prevent memory leaks
        setTimeout(() => {
            if (this.triviaData.has(userId)) {
                console.log(`🎯 Cleaning up expired trivia data for user ${userId}`);
                this.triviaData.delete(userId);
            }
        }, 10 * 60 * 1000);
    },
    
    getCategoryDisplayName(category) {
        const names = {
            'general': 'Genel Bilgi',
            'gaming': 'Oyun',
            'science': 'Bilim',
            'history': 'Tarih',
            'random': 'Rastgele'
        };
        return names[category] || category;
    },
    
    getDifficultyDisplayName(difficulty) {
        const names = {
            'easy': 'Kolay',
            'medium': 'Orta',
            'hard': 'Zor'
        };
        return names[difficulty] || difficulty;
    }
};