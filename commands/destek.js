const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('destek')
        .setDescription('Geliştiriciye destek mesajı gönder')
        .addStringOption(option =>
            option.setName('mesaj')
                .setDescription('Göndermek istediğiniz destek mesajı')
                .setRequired(true)
                .setMaxLength(1000)), // Limit message length to prevent spam

    async execute(interaction) {
        try {
            const mesaj = interaction.options.getString('mesaj');
            const developerId = '414434115182657537';
            
            // Create the support message embed
            const embed = new EmbedBuilder()
                .setTitle('📩 Yeni Destek Mesajı')
                .setColor('#00FF00')
                .addFields(
                    { 
                        name: '👤 Kullanıcı', 
                        value: `${interaction.user.username} (${interaction.user.id})`, 
                        inline: true 
                    },
                    { 
                        name: '🏠 Sunucu', 
                        value: interaction.guild ? interaction.guild.name : 'DM', 
                        inline: true 
                    },
                    { 
                        name: '📝 Mesaj', 
                        value: mesaj, 
                        inline: false 
                    }
                )
                .setTimestamp()
                .setFooter({ text: `Destek mesajı ID: ${interaction.id}` });

            // Try to send DM to developer
            try {
                const developer = await interaction.client.users.fetch(developerId);
                await developer.send({ embeds: [embed] });
                
                // Send confirmation to user
                await interaction.reply({
                    content: '✅ Destek mesajınız geliştiriciye iletildi.',
                    ephemeral: true
                });
                
            } catch (dmError) {
                console.error('Error sending DM to developer:', dmError);
                
                // If DM fails, send error message to user
                await interaction.reply({
                    content: '❌ Destek mesajı gönderilemedi. Lütfen daha sonra tekrar deneyin.',
                    ephemeral: true
                });
            }

        } catch (error) {
            console.error('Error in destek command:', error);
            try {
                if (!interaction.replied && !interaction.deferred) {
                    await interaction.reply({
                        content: '❌ Destek mesajı gönderilirken bir hata oluştu!',
                        ephemeral: true
                    });
                } else {
                    await interaction.editReply({
                        content: '❌ Destek mesajı gönderilirken bir hata oluştu!',
                        ephemeral: true
                    });
                }
            } catch (replyError) {
                console.error('Error sending error response:', replyError);
            }
        }
    },
};
