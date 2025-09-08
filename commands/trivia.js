const { SlashCommandBuilder, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('bilgi-yarismasi')
        .setDescription('XP ve coin kazanmak icin bilgi yarismasi oynayin!')
        .addStringOption(option =>
            option.setName('category')
                .setDescription('Bilgi yarismasi kategorisi secin')
                .setRequired(false)
                .addChoices(
                    { name: 'Genel Bilgi', value: 'general' },
                    { name: 'Oyun', value: 'gaming' },
                    { name: 'Bilim', value: 'science' },
                    { name: 'Tarih', value: 'history' },
                    { name: 'Rastgele', value: 'random' }
                ))
        .addStringOption(option =>
            option.setName('difficulty')
                .setDescription('Zorluk seviyesi secin')
                .setRequired(false)
                .addChoices(
                    { name: 'Kolay', value: 'easy' },
                    { name: 'Orta', value: 'medium' },
                    { name: 'Zor', value: 'hard' }
                )),

    async execute(interaction) {
        const category = interaction.options.getString('category') || 'random';
        const difficulty = interaction.options.getString('difficulty') || 'medium';
        
        // Get voice manager for rewards
        const voiceManager = interaction.client.voiceManager;
        if (!voiceManager) {
            return interaction.reply({ content: 'Bilgi yarışması sistemi mevcut değil!', ephemeral: true });
        }
        
        // Get user stats
        const userStats = await voiceManager.getUserStats(interaction.user.id, interaction.guildId);
        if (!userStats) {
            return interaction.reply({ 
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
                    .setLabel(answer)
                    .setStyle(ButtonStyle.Primary)
            );
        });
        
        // Calculate potential rewards based on difficulty and reward ranges
        let xpReward, coinReward;
        const rewardRanges = await voiceManager.db.getActiveRewardRanges(interaction.guildId);
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
            .setTitle(`🧠 ${category.charAt(0).toUpperCase() + category.slice(1)} Bilgi Yarışması`)
            .setDescription(`**${difficulty.charAt(0).toUpperCase() + difficulty.slice(1)} Soru**\n\n${question.question}`)
            .addFields(
                { name: '🏆 Doğru Cevap', value: `+${xpReward} XP, +${coinReward} coin`, inline: true },
                { name: '🎯 Yanlış Cevap', value: `+5 XP (katılım)`, inline: true },
                { name: '⏰ Zaman Sınırı', value: '30 saniye', inline: true }
            )
            .setFooter({ 
                text: `${interaction.user.username} • ${userStats.coins} coin • Seviye ${userStats.level}`,
                iconURL: interaction.user.displayAvatarURL()
            })
            .setTimestamp();
        
        await interaction.reply({ embeds: [embed], components: [row] });
        
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
        
        // Auto-timeout after 30 seconds
        setTimeout(async () => {
            const triviaData = this.getTriviaData(interaction.user.id);
            if (triviaData) {
                try {
                    const timeoutEmbed = new EmbedBuilder()
                        .setColor('#FF6B00')
                        .setTitle('⏰ Süre Doldu!')
                        .setDescription(`Doğru cevap: **${question.correct_answer}** idi`)
                        .addFields({ name: 'Ödül', value: '+2 XP (zaman aşımı bonusu)', inline: false })
                        .setFooter({ text: 'Başka bir soru deneyiniz!' });
                    
                    await interaction.editReply({ embeds: [timeoutEmbed], components: [] });
                    
                    // Give small consolation XP
                    await triviaData.voiceManager.db.updateUserStats(
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
        }, 30000);
    },
    
    getRandomQuestion(category, difficulty) {
        const questions = this.getQuestionBank();
        const categoryQuestions = category === 'random' ? 
            questions.flat() : 
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
    }
};