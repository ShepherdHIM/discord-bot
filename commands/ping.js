const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('ping')
        .setDescription('Bot\'un gecikme süresini ve durumunu kontrol eder'),
    
    async execute(interaction) {
        // Check if interaction is still valid (not expired)
        const interactionAge = Date.now() - interaction.createdTimestamp;
        if (interactionAge > 3 * 60 * 1000) { // 3 minutes timeout
            console.log('⚠️ Ping interaction expired, ignoring');
            return;
        }
        
        try {
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
        } catch (error) {
            console.error('Error executing ping command:', error);
            
            // Check if this is an interaction timeout error
            if (error.code === 10062 || error.message?.includes('Unknown interaction')) {
                console.log('⚠️ Ping interaction expired during processing, ignoring');
                return;
            }
            
            // Try to send error message if possible
            try {
                if (!interaction.replied && !interaction.deferred) {
                    await interaction.reply({ content: '❌ Ping komutu çalıştırılırken hata oluştu!', flags: 64 });
                } else if (interaction.deferred) {
                    await interaction.editReply({ content: '❌ Ping komutu çalıştırılırken hata oluştu!' });
                } else {
                    await interaction.followUp({ content: '❌ Ping komutu çalıştırılırken hata oluştu!', flags: 64 });
                }
            } catch (replyError) {
                console.error('❌ Failed to send ping error message:', replyError);
            }
        }
    },
};

