const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('sunucu_bilgi')
        .setDescription('Bu sunucu hakkinda bilgi al'),
    
    async execute(interaction) {
        const { guild } = interaction;
        
        const embed = new EmbedBuilder()
            .setColor('#0099ff')
            .setTitle(`Sunucu Bilgisi: ${guild.name}`)
            .setThumbnail(guild.iconURL({ dynamic: true }))
            .addFields(
                { name: '👑 Sahip', value: `<@${guild.ownerId}>`, inline: true },
                { name: '🆔 Sunucu ID', value: guild.id, inline: true },
                { name: '📅 Oluşturulma', value: `<t:${Math.floor(guild.createdTimestamp / 1000)}:F>`, inline: false },
                { name: '👥 Üyeler', value: guild.memberCount.toString(), inline: true },
                { name: '💬 Kanallar', value: guild.channels.cache.size.toString(), inline: true },
                { name: '🎭 Roller', value: guild.roles.cache.size.toString(), inline: true },
                { name: '😀 Emojiler', value: guild.emojis.cache.size.toString(), inline: true },
                { name: '🚀 Boostlar', value: guild.premiumSubscriptionCount?.toString() || '0', inline: true },
                { name: '📈 Boost Seviyesi', value: guild.premiumTier.toString(), inline: true }
            )
            .setTimestamp();
        
        if (guild.description) {
            embed.setDescription(guild.description);
        }
        
        await interaction.reply({ embeds: [embed] });
    },
};