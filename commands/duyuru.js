const { SlashCommandBuilder, EmbedBuilder, PermissionFlagsBits, ChannelType } = require('discord.js');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('duyuru')
        .setDescription('Sunucuya duyuru gönder')
        .addStringOption(option =>
            option.setName('mesaj')
                .setDescription('Duyuru mesajı')
                .setRequired(true))
        .addChannelOption(option =>
            option.setName('kanal')
                .setDescription('Duyurunun gönderileceği kanal (belirtilmezse mevcut kanal)')
                .addChannelTypes(ChannelType.GuildText))
        .addBooleanOption(option =>
            option.setName('everyone')
                .setDescription('@everyone ile duyuru gönderilsin mi?'))
        .setDefaultMemberPermissions(PermissionFlagsBits.Administrator),

    async execute(interaction) {
        try {
            // Check if user has Administrator permission
            if (!interaction.member.permissions.has(PermissionFlagsBits.Administrator)) {
                return interaction.reply({
                    content: '❌ Bu komutu sadece yöneticiler kullanabilir.',
                    ephemeral: true
                });
            }

            // Get command parameters
            const mesaj = interaction.options.getString('mesaj');
            const kanal = interaction.options.getChannel('kanal') || interaction.channel;
            const everyone = interaction.options.getBoolean('everyone') || false;

            // Create the announcement embed
            const embed = new EmbedBuilder()
                .setTitle('📢 Duyuru')
                .setDescription(mesaj)
                .setColor('#FFD700')
                .setFooter({ text: `Sent by ${interaction.user.username}` })
                .setTimestamp();

            // Prepare the message content
            let messageContent = '';
            if (everyone) {
                messageContent = '@everyone';
            }

            // Send the announcement
            await kanal.send({
                content: messageContent,
                embeds: [embed]
            });

            // Send confirmation to the user
            await interaction.reply({
                content: '✅ Duyuru başarıyla gönderildi.',
                ephemeral: true
            });

        } catch (error) {
            console.error('Error in duyuru command:', error);
            try {
                if (!interaction.replied && !interaction.deferred) {
                    await interaction.reply({
                        content: '❌ Duyuru gönderilirken bir hata oluştu!',
                        ephemeral: true
                    });
                } else {
                    await interaction.editReply({
                        content: '❌ Duyuru gönderilirken bir hata oluştu!',
                        ephemeral: true
                    });
                }
            } catch (replyError) {
                console.error('Error sending error response:', replyError);
            }
        }
    },
};
