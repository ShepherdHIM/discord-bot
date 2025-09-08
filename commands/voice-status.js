const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('ses-durumu')
        .setDescription('Mevcut ses aktivitesi ve kazanc durumunu goruntule'),
    
    async execute(interaction) {
        // Get voice manager from client
        const voiceManager = interaction.client.voiceManager;
        if (!voiceManager) {
            return interaction.reply({ content: 'Ses takip sistemi başlatılmamış!', ephemeral: true });
        }
        
        const guild = interaction.guild;
        const voiceChannels = guild.channels.cache.filter(c => c.type === 2 && c.members.size > 0); // Type 2 is voice channel
        
        if (voiceChannels.size === 0) {
            return interaction.reply({ 
                content: '🔇 Şu anda ses kanallarında kimse yok!', 
                ephemeral: true 
            });
        }
        
        const embed = new EmbedBuilder()
            .setColor('#0099ff')
            .setTitle('🎤 Mevcut Ses Aktivitesi')
            .setThumbnail(guild.iconURL())
            .setTimestamp();
        
        const guildSettings = await voiceManager.db.getGuildSettings(interaction.guildId);
        let totalEarning = 0;
        let totalMembers = 0;
        
        const channelInfo = [];
        
        voiceChannels.forEach(channel => {
            const members = channel.members.filter(m => !m.user.bot);
            if (members.size === 0) return;
            
            totalMembers += members.size;
            
            const memberList = members.map(member => {
                const isEarning = voiceManager.shouldEarnRewards(member, guildSettings);
                const status = this.getMemberStatus(member, guildSettings);
                
                if (isEarning) totalEarning++;
                
                return `${isEarning ? '✅' : '❌'} ${member.displayName} ${status}`;
            }).join('\n');
            
            const isAFK = channel.id === guild.afkChannelId;
            const channelName = isAFK ? `${channel.name} (AFK)` : channel.name;
            
            channelInfo.push({
                name: `🔊 ${channelName} (${members.size})`,
                value: memberList,
                inline: false
            });
        });
        
        embed.addFields(channelInfo);
        
        // Add summary
        embed.addFields({
            name: '📊 Özet',
            value: `**${totalMembers}** toplam ses kanalında üye\n**${totalEarning}** üye ödül kazanıyor\n\n**Oranlar:** Dakikada ${guildSettings.xp_per_minute} XP & ${guildSettings.coins_per_minute} coin`,
            inline: false
        });
        
        // Add requirements info
        const requirements = [];
        if (guildSettings.min_members_required > 1) {
            requirements.push(`Kanalda minimum ${guildSettings.min_members_required} üye`);
        }
        if (!guildSettings.muted_users_earn) {
            requirements.push('Mikrofon açık olmalı');
        }
        if (!guildSettings.deafened_users_earn) {
            requirements.push('Kulaklık açık olmalı');
        }
        if (guildSettings.exclude_afk_channel) {
            requirements.push('AFK kanalında olmamalı');
        }
        
        if (requirements.length > 0) {
            embed.addFields({
                name: '📋 Ödül Kazanma Koşulları',
                value: requirements.map(req => `• ${req}`).join('\n'),
                inline: false
            });
        }
        
        await interaction.reply({ embeds: [embed] });
    },
    
    getMemberStatus(member, guildSettings) {
        const status = [];
        
        if (member.voice.selfMute || member.voice.serverMute) {
            status.push('🔇');
        }
        if (member.voice.selfDeaf || member.voice.serverDeaf) {
            status.push('🔇');
        }
        if (member.voice.streaming) {
            status.push('📹');
        }
        if (member.voice.selfVideo) {
            status.push('📷');
        }
        
        const channelMemberCount = member.voice.channel.members.filter(m => !m.user.bot).size;
        if (channelMemberCount < guildSettings.min_members_required) {
            status.push('👥❌');
        }
        
        return status.join(' ');
    },
};