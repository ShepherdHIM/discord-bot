const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('kullanici_bilgi')
        .setDescription('Bir kullanıcı hakkında bilgi göster')
        .addUserOption(option =>
            option.setName('hedef')
                .setDescription('Hakkında bilgi alınacak kullanıcı')
                .setRequired(false)),
    
    async execute(interaction) {
        const target = interaction.options.getUser('hedef') || interaction.user;
        const member = interaction.guild.members.cache.get(target.id);
        
        const embed = new EmbedBuilder()
            .setColor('#0099ff')
            .setTitle(`Kullanıcı Bilgisi: ${target.tag}`)
            .setThumbnail(target.displayAvatarURL({ dynamic: true }))
            .addFields(
                { name: '👤 Kullanıcı Adı', value: target.tag, inline: true },
                { name: '🆔 Kullanıcı ID', value: target.id, inline: true },
                { name: '📅 Hesap Oluşturuldu', value: `<t:${Math.floor(target.createdTimestamp / 1000)}:F>`, inline: false }
            );
        
        if (member) {
            embed.addFields(
                { name: '📅 Sunucuya Katıldı', value: `<t:${Math.floor(member.joinedTimestamp / 1000)}:F>`, inline: false },
                { name: '🎭 Roller', value: member.roles.cache.map(role => role.toString()).join(' ') || 'Yok', inline: false }
            );
        }
        
        await interaction.reply({ embeds: [embed] });
    },
};