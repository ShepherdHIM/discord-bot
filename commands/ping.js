const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('ping')
        .setDescription('Bot\'un gecikme süresini ve durumunu kontrol eder'),
    
    async execute(interaction) {
        const sent = await interaction.reply({ 
            content: '🏓 Pong! Gecikme süresi hesaplanıyor...', 
            fetchReply: true 
        });
        
        const roundtripLatency = sent.createdTimestamp - interaction.createdTimestamp;
        const websocketLatency = Math.round(interaction.client.ws.ping);
        
        const embed = new EmbedBuilder()
            .setColor('#00ff00')
            .setTitle('🏓 Pong!')
            .setDescription('Bot durumu ve gecikme bilgileri')
            .addFields(
                { 
                    name: '📡 WebSocket Gecikmesi', 
                    value: `${websocketLatency}ms`, 
                    inline: true 
                },
                { 
                    name: '🔄 Roundtrip Gecikmesi', 
                    value: `${roundtripLatency}ms`, 
                    inline: true 
                },
                { 
                    name: '📊 Bot Durumu', 
                    value: websocketLatency < 100 ? '🟢 Mükemmel' : 
                           websocketLatency < 200 ? '🟡 İyi' : 
                           websocketLatency < 300 ? '🟠 Orta' : '🔴 Yavaş', 
                    inline: true 
                }
            )
            .setTimestamp()
            .setFooter({ 
                text: `${interaction.client.user.username} • Ping Komutu`,
                iconURL: interaction.client.user.displayAvatarURL()
            });
        
        await interaction.editReply({ 
            content: '', 
            embeds: [embed] 
        });
    },
};
