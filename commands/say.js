const { SlashCommandBuilder } = require('discord.js');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('soyle')
        .setDescription('Botun bir sey soylemesini saglar')
        .addStringOption(option =>
            option.setName('message')
                .setDescription('Botun soyleyecegi mesaj')
                .setRequired(true))
        .addChannelOption(option =>
            option.setName('channel')
                .setDescription('Mesajin gonderilecegi kanal')
                .setRequired(false)),
    
    async execute(interaction) {
        // Check if user has admin permissions
        if (!interaction.member.permissions.has('Administrator')) {
            return interaction.reply({ 
                content: '❌ Bu komutu sadece yöneticiler kullanabilir!', 
                ephemeral: true 
            });
        }
        
        const message = interaction.options.getString('message');
        const channel = interaction.options.getChannel('channel') || interaction.channel;
        
        if (!channel.isTextBased()) {
            return interaction.reply({ 
                content: 'Sadece metin kanallarına mesaj gönderebilirim!', 
                ephemeral: true 
            });
        }
        
        try {
            await channel.send(message);
            await interaction.reply({ 
                content: `✅ Mesaj ${channel}'a gönderildi!`, 
                ephemeral: true 
            });
        } catch (error) {
            console.error('Error sending message:', error);
            await interaction.reply({ 
                content: '❌ Bu kanala mesaj gönderemedim!', 
                ephemeral: true 
            });
        }
    },
};