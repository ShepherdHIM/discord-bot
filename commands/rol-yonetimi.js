const { SlashCommandBuilder, EmbedBuilder, PermissionFlagsBits } = require('discord.js');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('rolyonetimi')
        .setDescription('Seviye bazlı rolleri yönetin')
        .setDefaultMemberPermissions(PermissionFlagsBits.Administrator)
        .addSubcommand(subcommand =>
            subcommand
                .setName('ekle')
                .setDescription('Bir seviye için rol ayarla')
                .addIntegerOption(option =>
                    option.setName('seviye')
                        .setDescription('Rolün atanacağı seviye')
                        .setRequired(true)
                        .setMinValue(1)
                        .setMaxValue(1000))
                .addRoleOption(option =>
                    option.setName('rol')
                        .setDescription('Atanacak rol')
                        .setRequired(true)))
        .addSubcommand(subcommand =>
            subcommand
                .setName('kaldir')
                .setDescription('Bir seviye için rolü kaldır')
                .addIntegerOption(option =>
                    option.setName('seviye')
                        .setDescription('Rolü kaldırılacak seviye')
                        .setRequired(true)
                        .setMinValue(1)
                        .setMaxValue(1000)))
        .addSubcommand(subcommand =>
            subcommand
                .setName('liste')
                .setDescription('Tüm seviye rollerini listele')),
    
    async execute(interaction) {
        // Defer reply early for admin commands
        try {
            if (!interaction.replied && !interaction.deferred) {
                await interaction.deferReply({ ephemeral: true });
            }
        } catch (error) {
            console.log('Could not defer admin interaction:', error);
            return;
        }
        
        // Get voice manager from client
        const voiceManager = interaction.client.voiceManager;
        if (!voiceManager) {
            return interaction.editReply({ content: 'Ses takip sistemi başlatılmamış!' });
        }
        
        const subcommand = interaction.options.getSubcommand();
        
        if (subcommand === 'ekle') {
            const level = interaction.options.getInteger('seviye');
            const role = interaction.options.getRole('rol');
            
            // Check if bot has permission to manage roles
            if (!interaction.guild.members.me.permissions.has('ManageRoles')) {
                return interaction.editReply({ 
                    content: '❌ Botun rolleri yönetme izni yok! Lütfen botun "Rolleri Yönet" iznine sahip olduğundan emin olun.' 
                });
            }
            
            // Check if role is higher than bot's highest role
            const botHighestRole = interaction.guild.members.me.roles.highest;
            if (role.position >= botHighestRole.position) {
                return interaction.editReply({ 
                    content: `❌ Seçilen rol botun en yüksek rolünden daha yüksek veya eşit konumda! Bot sadece kendi rolünden daha düşük rolleri atayabilir.` 
                });
            }
            
            // Add level role to database
            const success = await voiceManager.addLevelRole(
                interaction.guildId, 
                level, 
                role.id, 
                role.name
            );
            
            if (success) {
                const embed = new EmbedBuilder()
                    .setColor('#00ff00')
                    .setTitle('✅ Seviye Rolü Eklendi!')
                    .setDescription(`**${level}. seviye** için **${role.name}** rolü başarıyla ayarlandı!`)
                    .addFields(
                        { name: '📊 Seviye', value: level.toString(), inline: true },
                        { name: '🏷️ Rol', value: role.toString(), inline: true },
                        { name: '👑 Yönetici', value: interaction.user.toString(), inline: true }
                    )
                    .setTimestamp();
                
                return interaction.editReply({ embeds: [embed] });
            } else {
                return interaction.editReply({ content: '❌ Seviye rolü eklenirken bir hata oluştu!' });
            }
        }
        
        if (subcommand === 'kaldir') {
            const level = interaction.options.getInteger('seviye');
            
            // Remove level role from database
            const success = await voiceManager.removeLevelRole(interaction.guildId, level);
            
            if (success) {
                const embed = new EmbedBuilder()
                    .setColor('#00ff00')
                    .setTitle('✅ Seviye Rolü Kaldırıldı!')
                    .setDescription(`**${level}. seviye** için ayarlanmış rol başarıyla kaldırıldı!`)
                    .addFields(
                        { name: '📊 Seviye', value: level.toString(), inline: true },
                        { name: '👑 Yönetici', value: interaction.user.toString(), inline: true }
                    )
                    .setTimestamp();
                
                return interaction.editReply({ embeds: [embed] });
            } else {
                return interaction.editReply({ content: '❌ Seviye rolü kaldırılırken bir hata oluştu!' });
            }
        }
        
        if (subcommand === 'liste') {
            // Get all level roles for this guild
            const levelRoles = await voiceManager.getLevelRoles(interaction.guildId);
            
            if (levelRoles.length === 0) {
                return interaction.editReply({ 
                    content: '❌ Bu sunucuda henüz seviye rolü ayarlanmamış!' 
                });
            }
            
            // Create a formatted list
            let description = '';
            for (const levelRole of levelRoles) {
                const role = interaction.guild.roles.cache.get(levelRole.role_id);
                const roleMention = role ? role.toString() : `@${levelRole.role_name} (Rol bulunamadı)`;
                description += `**${levelRole.level}. Seviye:** ${roleMention}\n`;
            }
            
            const embed = new EmbedBuilder()
                .setColor('#0099ff')
                .setTitle('📋 Seviye Rol Listesi')
                .setDescription(description)
                .setFooter({ 
                    text: `${interaction.guild.name} • Toplam ${levelRoles.length} seviye rolü`,
                    iconURL: interaction.guild.iconURL()
                })
                .setTimestamp();
            
            return interaction.editReply({ embeds: [embed] });
        }
    },
};