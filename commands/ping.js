const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('ping')
        .setDescription('Pong ile yanıt verir ve bot gecikmesini gösterir!'),
    
    async execute(interaction) {
        const sent = await interaction.reply({ 
            content: 'Pingleniyor...', 
            fetchReply: true 
        });
        
        const latency = sent.createdTimestamp - interaction.createdTimestamp;
        const apiLatency = Math.round(interaction.client.ws.ping);
        
        const embed = new EmbedBuilder()
            .setColor('#0099ff')
            .setTitle('🏓 Pong!')
            .addFields(
                { name: 'Bot Gecikmesi', value: `${latency}ms`, inline: true },
                { name: 'API Gecikmesi', value: `${apiLatency}ms`, inline: true }
            )
            .setTimestamp();
        
        await interaction.editReply({ 
            content: '', 
            embeds: [embed] 
        });
    },
};