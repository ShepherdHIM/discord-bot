const { SlashCommandBuilder, EmbedBuilder, PermissionFlagsBits } = require('discord.js');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('ses-ayarlari')
        .setDescription('Ses aktivitesi izleme ayarlarını yapılandır')
        .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild)
        .addSubcommand(subcommand =>
            subcommand
                .setName('goster')
                .setDescription('Mevcut ses aktivitesi ayarlarını göster'))
        .addSubcommand(subcommand =>
            subcommand
                .setName('xp-orani')
                .setDescription('Dakika başına XP oranını ayarla')
                .addIntegerOption(option =>
                    option.setName('miktar')
                        .setDescription('Dakika başına XP miktarı (1-50)')
                        .setRequired(true)
                        .setMinValue(1)
                        .setMaxValue(50)))
        .addSubcommand(subcommand =>
            subcommand
                .setName('coin-orani')
                .setDescription('Dakika başına coin oranını ayarla')
                .addIntegerOption(option =>
                    option.setName('miktar')
                        .setDescription('Dakika başına coin miktarı (1-25)')
                        .setRequired(true)
                        .setMinValue(1)
                        .setMaxValue(25)))
        .addSubcommand(subcommand =>
            subcommand
                .setName('minimum-uyeler')
                .setDescription('Ödül için minimum kanal üye sayısını ayarla')
                .addIntegerOption(option =>
                    option.setName('sayi')
                        .setDescription('Ödül almak için gereken minimum üye sayısı (1-10)')
                        .setRequired(true)
                        .setMinValue(1)
                        .setMaxValue(10)))
        .addSubcommand(subcommand =>
            subcommand
                .setName('susturulmus-odul')
                .setDescription('Susturulmuş kullanıcıların ödül alıp almayacağını ayarla')
                .addBooleanOption(option =>
                    option.setName('etkin')
                        .setDescription('Susturulmuş kullanıcılar ödül alabilir mi?')
                        .setRequired(true)))
        .addSubcommand(subcommand =>
            subcommand
                .setName('sagirlastirilmis-odul')
                .setDescription('Sağırlaştırılmış kullanıcıların ödül alıp almayacağını ayarla')
                .addBooleanOption(option =>
                    option.setName('etkin')
                        .setDescription('Sağırlaştırılmış kullanıcılar ödül alabilir mi?')
                        .setRequired(true)))
        .addSubcommand(subcommand =>
            subcommand
                .setName('afk-haric')
                .setDescription('AFK kanalını ödül hesaplamasından çıkar')
                .addBooleanOption(option =>
                    option.setName('haric-tut')
                        .setDescription('AFK kanalı ödül hesaplamasından çıkarılsın mı?')
                        .setRequired(true))),
    
    async execute(interaction) {
        // Get voice manager from client
        const voiceManager = interaction.client.voiceManager;
        if (!voiceManager) {
            return interaction.reply({ content: 'Ses takip sistemi başlatılmamış!', ephemeral: true });
        }
        
        const subcommand = interaction.options.getSubcommand();
        
        if (subcommand === 'goster') {
            const settings = await voiceManager.db.getGuildSettings(interaction.guildId);
            
            const embed = new EmbedBuilder()
                .setColor('#0099ff')
                .setTitle('🎤 Ses Aktivitesi Ayarları')
                .setThumbnail(interaction.guild.iconURL())
                .addFields(
                    { name: '⚡ Dakika Başına XP', value: settings.xp_per_minute.toString(), inline: true },
                    { name: '🪙 Dakika Başına Coin', value: settings.coins_per_minute.toString(), inline: true },
                    { name: '👥 Minimum Üye Sayısı', value: settings.min_members_required.toString(), inline: true },
                    { name: '💤 AFK Kanal Hariç', value: settings.exclude_afk_channel ? '✅ Evet' : '❌ Hayır', inline: true },
                    { name: '🔇 Susturulmuşlar Kazanır', value: settings.muted_users_earn ? '✅ Evet' : '❌ Hayır', inline: true },
                    { name: '🔇 Sağırlaştırılmışlar Kazanır', value: settings.deafened_users_earn ? '✅ Evet' : '❌ Hayır', inline: true }
                )
                .setTimestamp();
            
            // Add channel configurations
            const channelFields = [];
            
            if (settings.levelup_channel_id) {
                const channel = interaction.guild.channels.cache.get(settings.levelup_channel_id);
                channelFields.push({
                    name: '🎉 Seviye Atlama Kanalı',
                    value: channel ? channel.toString() : '❌ Kanal bulunamadı',
                    inline: true
                });
            }
            
            if (settings.welcome_channel_id) {
                const channel = interaction.guild.channels.cache.get(settings.welcome_channel_id);
                channelFields.push({
                    name: '👋 Hoşgeldin Kanalı',
                    value: channel ? channel.toString() : '❌ Kanal bulunamadı',
                    inline: true
                });
            }
            
            if (settings.announcement_channel_id) {
                const channel = interaction.guild.channels.cache.get(settings.announcement_channel_id);
                channelFields.push({
                    name: '📢 Duyuru Kanalı',
                    value: channel ? channel.toString() : '❌ Kanal bulunamadı',
                    inline: true
                });
            }
            
            if (channelFields.length > 0) {
                embed.addFields({ name: '\u200b', value: '\u200b', inline: false }); // Spacer
                embed.addFields(channelFields);
            }
            
            embed.setFooter({ 
                text: `Kanalları yapılandırmak için /kanal-ayarla kullanın • Son güncelleme: ${new Date(settings.updated_at).toLocaleString()}` 
            });
            
            await interaction.reply({ embeds: [embed], ephemeral: true });
        }
        
        else if (subcommand === 'xp-orani') {
            const xpPerMinute = interaction.options.getInteger('miktar');
            
            const currentSettings = await voiceManager.db.getGuildSettings(interaction.guildId);
            const newSettings = {
                ...currentSettings,
                xp_per_minute: xpPerMinute
            };
            
            await voiceManager.db.updateGuildSettings(interaction.guildId, newSettings);
            
            const embed = new EmbedBuilder()
                .setColor('#00ff00')
                .setTitle('✅ XP Orani Guncellendi!')
                .addFields(
                    { name: '⚡ Yeni XP Orani', value: `${xpPerMinute} XP dakika basi`, inline: true }
                )
                .setTimestamp();
            
            await interaction.reply({ embeds: [embed], ephemeral: true });
        }
        
        else if (subcommand === 'coin-orani') {
            const coinsPerMinute = interaction.options.getInteger('miktar');
            
            const currentSettings = await voiceManager.db.getGuildSettings(interaction.guildId);
            const newSettings = {
                ...currentSettings,
                coins_per_minute: coinsPerMinute
            };
            
            await voiceManager.db.updateGuildSettings(interaction.guildId, newSettings);
            
            const embed = new EmbedBuilder()
                .setColor('#00ff00')
                .setTitle('✅ Coin Orani Guncellendi!')
                .addFields(
                    { name: '🪙 Yeni Coin Orani', value: `${coinsPerMinute} coin dakika basi`, inline: true }
                )
                .setTimestamp();
            
            await interaction.reply({ embeds: [embed], ephemeral: true });
        }
        
        else if (subcommand === 'minimum-uyeler') {
            const minMembers = interaction.options.getInteger('sayi');
            
            const currentSettings = await voiceManager.db.getGuildSettings(interaction.guildId);
            const newSettings = {
                ...currentSettings,
                min_members_required: minMembers
            };
            
            await voiceManager.db.updateGuildSettings(interaction.guildId, newSettings);
            
            const embed = new EmbedBuilder()
                .setColor('#00ff00')
                .setTitle('✅ Minimum Uye Sayisi Guncellendi!')
                .addFields(
                    { name: '👥 Yeni Minimum', value: `${minMembers} uye`, inline: true }
                )
                .setTimestamp();
            
            await interaction.reply({ embeds: [embed], ephemeral: true });
        }
        
        else if (subcommand === 'susturulmus-odul') {
            const enabled = interaction.options.getBoolean('etkin');
            
            const currentSettings = await voiceManager.db.getGuildSettings(interaction.guildId);
            const newSettings = {
                ...currentSettings,
                muted_users_earn: enabled
            };
            
            await voiceManager.db.updateGuildSettings(interaction.guildId, newSettings);
            
            const embed = new EmbedBuilder()
                .setColor('#00ff00')
                .setTitle('✅ Susturulmus Kullanici Odulu Guncellendi!')
                .addFields(
                    { name: '🔇 Yeni Durum', value: enabled ? 'Etkin' : 'Devre Disi', inline: true }
                )
                .setTimestamp();
            
            await interaction.reply({ embeds: [embed], ephemeral: true });
        }
        
        else if (subcommand === 'sagirlastirilmis-odul') {
            const enabled = interaction.options.getBoolean('etkin');
            
            const currentSettings = await voiceManager.db.getGuildSettings(interaction.guildId);
            const newSettings = {
                ...currentSettings,
                deafened_users_earn: enabled
            };
            
            await voiceManager.db.updateGuildSettings(interaction.guildId, newSettings);
            
            const embed = new EmbedBuilder()
                .setColor('#00ff00')
                .setTitle('✅ Sagirlastirilmis Kullanici Odulu Guncellendi!')
                .addFields(
                    { name: '🔇 Yeni Durum', value: enabled ? 'Etkin' : 'Devre Disi', inline: true }
                )
                .setTimestamp();
            
            await interaction.reply({ embeds: [embed], ephemeral: true });
        }
        
        else if (subcommand === 'afk-haric') {
            const exclude = interaction.options.getBoolean('haric-tut');
            
            const currentSettings = await voiceManager.db.getGuildSettings(interaction.guildId);
            const newSettings = {
                ...currentSettings,
                exclude_afk_channel: exclude
            };
            
            await voiceManager.db.updateGuildSettings(interaction.guildId, newSettings);
            
            const embed = new EmbedBuilder()
                .setColor('#00ff00')
                .setTitle('✅ AFK Kanal Ayari Guncellendi!')
                .addFields(
                    { name: '💤 Yeni Durum', value: exclude ? 'Haric Tutuluyor' : 'Dahil Ediliyor', inline: true }
                )
                .setTimestamp();
            
            await interaction.reply({ embeds: [embed], ephemeral: true });
        }
        
        else if (subcommand === 'set-rates') {
            const xpPerMinute = interaction.options.getInteger('xp-per-minute');
            const coinsPerMinute = interaction.options.getInteger('coins-per-minute');
            
            const currentSettings = await voiceManager.db.getGuildSettings(interaction.guildId);
            const newSettings = {
                ...currentSettings,
                xp_per_minute: xpPerMinute,
                coins_per_minute: coinsPerMinute
            };
            
            await voiceManager.db.updateGuildSettings(interaction.guildId, newSettings);
            
            const embed = new EmbedBuilder()
                .setColor('#00ff00')
                .setTitle('✅ Earning Rates Updated!')
                .addFields(
                    { name: '⚡ New XP Rate', value: `${xpPerMinute} XP per minute`, inline: true },
                    { name: '🪙 New Coin Rate', value: `${coinsPerMinute} coins per minute`, inline: true }
                )
                .setTimestamp();
            
            await interaction.reply({ embeds: [embed], ephemeral: true });
        }
        
        else if (subcommand === 'set-requirements') {
            const minMembers = interaction.options.getInteger('min-members');
            const excludeAFK = interaction.options.getBoolean('exclude-afk');
            const mutedUsersEarn = interaction.options.getBoolean('muted-users-earn');
            const deafenedUsersEarn = interaction.options.getBoolean('deafened-users-earn');
            
            const currentSettings = await voiceManager.db.getGuildSettings(interaction.guildId);
            const newSettings = { ...currentSettings };
            
            if (minMembers !== null) newSettings.min_members_required = minMembers;
            if (excludeAFK !== null) newSettings.exclude_afk_channel = excludeAFK;
            if (mutedUsersEarn !== null) newSettings.muted_users_earn = mutedUsersEarn;
            if (deafenedUsersEarn !== null) newSettings.deafened_users_earn = deafenedUsersEarn;
            
            await voiceManager.db.updateGuildSettings(interaction.guildId, newSettings);
            
            const embed = new EmbedBuilder()
                .setColor('#00ff00')
                .setTitle('✅ Requirements Updated!')
                .setDescription('Voice earning requirements have been updated successfully!');
            
            const fields = [];
            if (minMembers !== null) fields.push({ name: '👥 Min Members', value: minMembers.toString(), inline: true });
            if (excludeAFK !== null) fields.push({ name: '💤 Exclude AFK', value: excludeAFK ? 'Yes' : 'No', inline: true });
            if (mutedUsersEarn !== null) fields.push({ name: '🔇 Muted Earn', value: mutedUsersEarn ? 'Yes' : 'No', inline: true });
            if (deafenedUsersEarn !== null) fields.push({ name: '🔇 Deafened Earn', value: deafenedUsersEarn ? 'Yes' : 'No', inline: true });
            
            if (fields.length > 0) embed.addFields(fields);
            embed.setTimestamp();
            
            await interaction.reply({ embeds: [embed], ephemeral: true });
        }
    },
};