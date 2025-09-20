const { SlashCommandBuilder, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('yardim')
        .setDescription('Tum komutlari ve ozellikleri goruntule')
        .addStringOption(option =>
            option.setName('kategori')
                .setDescription('Belirli bir kategori secin')
                .setRequired(false)
                .addChoices(
                    { name: 'Oyunlar', value: 'oyunlar' },
                    { name: 'Profil & Istatistikler', value: 'profil' },
                    { name: 'Ses Aktivitesi', value: 'ses' },
                    { name: 'Sunucu Yonetimi', value: 'yonetim' },
                    { name: 'Genel', value: 'genel' }
                )),
    
    async execute(interaction) {
        console.log('Help command executed');
        
        try {
            // Respond immediately to avoid timeout
            if (!interaction.replied && !interaction.deferred) {
                const category = interaction.options?.getString('kategori');
                
                if (category) {
                    await this.showCategoryHelp(interaction, category);
                } else {
                    await this.showMainHelp(interaction);
                }
            }
        } catch (error) {
            console.error('Error in help command:', error);
        }
    },
    
    async showMainHelp(interaction) {
        console.log('Showing main help');
        
        const embed = new EmbedBuilder()
            .setColor('#0099ff')
            .setTitle('🤖 Bot Yardim - Tum Komutlar')
            .setDescription('Bu bot Turkce komutlarla calisir! Asagida tum ozellikler ve komutlar bulunmaktadir.')
            .setThumbnail(interaction.client.user.displayAvatarURL())
            .addFields(
                {
                    name: '🎮 Oyun Komutlari', 
                    value: '`/oyunlar` - XP ve coin kazanmak icin eglenceli oyunlar\n**7 farkli oyun**',
                    inline: true
                },
                {
                    name: '👤 Profil & Istatistikler',
                    value: '`/profil` - Profilinizi goruntuleyin\n`/liderlik-tablosu` - Sunucu siralamalari',
                    inline: true
                },
                {
                    name: '🎭 Roller & Seviyeler',
                    value: '`/rolyonetimi` - Seviye rollerini yonetin\nOtomatik rol atamasi',
                    inline: true
                },
                {
                    name: '🎤 Ses Aktivitesi',
                    value: '`/sesdurumu` - Aktif ses kullanicilari\n`/sesayarlari` - Yonetici ayarlari',
                    inline: true
                },
                {
                    name: '⚙️ Sunucu Yonetimi',
                    value: '`/kanalayarla` - Duyuru kanallari\n`/yonetici` - XP/Coin oran yönetimi\n`/sunucubilgi` - Sunucu bilgileri',
                    inline: true
                },
                {
                    name: '🛠️ Genel Komutlar',
                    value: '`/ping` - Bot gecikme testi\n`/bilgiyarismasi` - Bilgi oyunu\n`/destek` - Destek veya hata bildirimi gönder\n`/yardim` - Bu yardim menusu',
                    inline: true
                }
            )
            .addFields({
                name: '💰 XP & Coin Sistemi',
                value: '• Ses kanallarinda her dakika **XP** ve **coin** kazanin\n• Oyunlar oynayarak ekstra coin elde edin\n• Her 100 XP = 1 seviye',
                inline: false
            })
            .setFooter({ 
                text: `${interaction.guild?.name || 'Sunucu'} • Detaylar icin kategori butonlarini kullanin`,
                iconURL: interaction.guild?.iconURL()
            })
            .setTimestamp();
        
        // Create category buttons
        const row1 = new ActionRowBuilder()
            .addComponents(
                new ButtonBuilder()
                    .setCustomId('help_oyunlar')
                    .setLabel('Oyunlar')
                    .setEmoji('🎮')
                    .setStyle(ButtonStyle.Primary),
                new ButtonBuilder()
                    .setCustomId('help_profil')
                    .setLabel('Profil')
                    .setEmoji('👤')
                    .setStyle(ButtonStyle.Primary),
                new ButtonBuilder()
                    .setCustomId('help_ses')
                    .setLabel('Ses')
                    .setEmoji('🎤')
                    .setStyle(ButtonStyle.Primary),
                new ButtonBuilder()
                    .setCustomId('help_yonetim')
                    .setLabel('Yonetim')
                    .setEmoji('⚙️')
                    .setStyle(ButtonStyle.Primary),
                new ButtonBuilder()
                    .setCustomId('help_genel')
                    .setLabel('Genel')
                    .setEmoji('🛠️')
                    .setStyle(ButtonStyle.Secondary)
            );
        
        const row2 = new ActionRowBuilder()
            .addComponents(
                new ButtonBuilder()
                    .setCustomId('help_ozellikler')
                    .setLabel('Ozellikler')
                    .setEmoji('✨')
                    .setStyle(ButtonStyle.Success),
                new ButtonBuilder()
                    .setCustomId('help_kurulum')
                    .setLabel('Ilk Kurulum')
                    .setEmoji('🚀')
                    .setStyle(ButtonStyle.Success)
            );
        
        // Respond immediately
        if (!interaction.replied && !interaction.deferred) {
            await interaction.reply({ embeds: [embed], components: [row1, row2], flags: 64 });
        }
    },
    
    async showCategoryHelp(interaction, category) {
        console.log(`Showing category help: ${category}`);
        let embed;
        
        switch (category) {
            case 'oyunlar':
                embed = this.createGamesHelp();
                break;
            case 'profil':
                embed = this.createProfileHelp();
                break;
            case 'ses':
                embed = this.createVoiceHelp();
                break;
            case 'yonetim':
                embed = this.createManagementHelp();
                break;
            case 'genel':
                embed = this.createGeneralHelp();
                break;
            case 'ozellikler':
                embed = this.createFeaturesHelp();
                break;
            case 'kurulum':
                embed = this.createSetupHelp();
                break;
            case 'back':
                return this.showMainHelp(interaction);
            default:
                return this.showMainHelp(interaction);
        }
        
        const backButton = new ActionRowBuilder()
            .addComponents(
                new ButtonBuilder()
                    .setCustomId('help_back')
                    .setLabel('Ana Menuye Don')
                    .setEmoji('◀️')
                    .setStyle(ButtonStyle.Secondary)
            );
        
        // Respond immediately
        if (!interaction.replied && !interaction.deferred) {
            await interaction.reply({ embeds: [embed], components: [backButton], flags: 64 });
        }
    },
    
    createGamesHelp() {
        return new EmbedBuilder()
            .setColor('#FF1493')
            .setTitle('🎮 Oyun Komutlari')
            .setDescription('Eglenceli oyunlarla XP ve coin kazanin!')
            .addFields(
                {
                    name: '🎯 Sans Oyunlari',
                    value: '`/oyunlar yazi-tura` - Klasik yazi tura\n`/oyunlar slot` - Slot makinesi\n`/oyunlar zar` - Zar atma oyunu\n`/oyunlar rulet` - Rulet oyunu',
                    inline: false
                },
                {
                    name: '🧠 Strateji Oyunlari',
                    value: '`/oyunlar tas-kagit-makas` - Klasik oyun\n`/oyunlar tahmin` - Sayi tahmin oyunu\n`/bilgi-yarismasi` - Bilgi yarismasi',
                    inline: false
                },
                {
                    name: '💰 Oduller & Bonuslar',
                    value: '`/oyunlar gunluk` - Gunluk bonus al\n`/oyunlar istatistikler` - Oyun istatistiklerin',
                    inline: false
                },
                {
                    name: '🏆 Ipuclari',
                    value: '• Gunluk bonusu unutmayin!\n• Yuksek seviyede daha fazla bonus\n• Bahis miktarini akillica secin',
                    inline: false
                }
            );
    },
    
    createProfileHelp() {
        return new EmbedBuilder()
            .setColor('#FFD700')
            .setTitle('👤 Profil & Istatistikler')
            .setDescription('Ilerlemenizi takip edin ve siralamalari gorun!')
            .addFields(
                {
                    name: '📊 Profil Komutlari',
                    value: '`/profil` - Kendi profilinizi gorun\n`/profil [@kullanici]` - Baskasinin profilini gorun',
                    inline: false
                },
                {
                    name: '🏆 Liderlik Tablolari',
                    value: '`/liderlik-tablosu xp` - XP siralamalari\n`/liderlik-tablosu coins` - Coin siralamalari\n`/liderlik-tablosu voice_time` - Ses suresi siralamalari',
                    inline: false
                },
                {
                    name: '📈 Seviye Sistemi',
                    value: '**100 XP = 1 Seviye**\n• Yeni Baslayanlar (0-4)\n• Yukselenler (5-9)\n• Aktif Katilimcilar (10-19)\n• Deneyimli Uye (20-29)\n• Efsanevi Usta (100+)',
                    inline: false
                }
            );
    },
    
    createVoiceHelp() {
        return new EmbedBuilder()
            .setColor('#00FF00')
            .setTitle('🎤 Ses Aktivitesi')
            .setDescription('Ses kanallarinda vakit gecirerek XP ve coin kazanin!')
            .addFields(
                {
                    name: '📊 Durum Komutlari',
                    value: '`/ses-durumu` - Kim ses kanalinda ve kim odul kazaniyor\n`/ses-ayarlari goster` - Mevcut ayarlar',
                    inline: false
                },
                {
                    name: '⚙️ Yonetici Ayarlari',
                    value: '`/ses-ayarlari xp-orani` - Dakika basina XP\n`/ses-ayarlari coin-orani` - Dakika basina coin\n`/ses-ayarlari minimum-uyeler` - Minimum kisi sayisi',
                    inline: false
                },
                {
                    name: '💰 Nasil Odul Kazanilir',
                    value: '• Ses kanalinda olmak\n• Susturulmamis olmak\n• Sagirlastirilmamis olmak\n• Minimum kisi sayisi saglanmali',
                    inline: false
                }
            );
    },
    
    createManagementHelp() {
        return new EmbedBuilder()
            .setColor('#8B00FF')
            .setTitle('⚙️ Sunucu Yonetimi')
            .setDescription('Sunucu ayarlarini yapilandir (Yonetici yetkisi gerekir)')
            .addFields(
                {
                    name: '👑 Admin Komutları',
                    value: '`/yonetici xp-ver` - Kullanıcıya XP ver\n`/yonetici coin-ver` - Kullanıcıya coin ver\n`/yonetici xp-al` - Kullanıcıdan XP al\n`/yonetici coin-al` - Kullanıcıdan coin al\n`/yonetici sifirla` - Tüm istatistikleri sıfırla',
                    inline: false
                },
                {
                    name: '⚙️ **XP & Coin Oran Yönetimi**',
                    value: '`/admin xp-orani [oran]` - **Dakika başına XP oranı ayarla**\n`/admin coin-orani [oran]` - **Dakika başına coin oranı ayarla**\n`/admin oranlar-goster` - Mevcut oranları göster',
                    inline: false
                },
                {
                    name: '🎭 **Seviye Rol Yönetimi**',
                    value: '`/rolyonetimi ekle [seviye] [rol]` - Seviye için rol ayarla\n`/rolyonetimi kaldir [seviye]` - Seviye rolünü kaldır\n`/rolyonetimi liste` - Tüm seviye rollerini göster',
                    inline: false
                },
                {
                    name: '📊 Oran Yönetimi',
                    value: '`/oranyonetimi goster` - Detaylı oran analizi\n`/oranyonetimi hizli-ayar` - Ön tanımlı profiller\n`/oranyonetimi hesaplama` - Kazanç hesaplama\n`/oranyonetimi karsilastir` - Profil karşılaştırma',
                    inline: false
                },
                {
                    name: '📢 Kanal Ayarlari',
                    value: '`/kanalayarla goster` - Mevcut ayarlar\n`/kanalayarla seviye-atlamasi` - Seviye duyuru kanali\n`/kanalayarla hosgeldin` - Hosgeldin kanali\n`/kanalayarla duyurular` - Bot duyuru kanali',
                    inline: false
                },
                {
                    name: '🎤 Ses Aktivitesi',
                    value: '`/sesayarlari goster` - Mevcut ayarlar\n`/sesayarlari minimum-uyeler` - Minimum kişi sayısı\n`/sesdurumu` - Aktif ses durumu',
                    inline: false
                },
                {
                    name: '📋 Bilgi Komutlari',
                    value: '`/sunucubilgi` - Sunucu detaylari\n`/kullanici [@kullanici]` - Kullanici bilgileri',
                    inline: false
                },
                {
                    name: '🛠️ Yardimci Komutlar',
                    value: '`/soyle [mesaj]` - Bot ile mesaj gonder\n`/ping` - Bot performans testi',
                    inline: false
                }
            );
    },
    
    createGeneralHelp() {
        return new EmbedBuilder()
            .setColor('#00BFFF')
            .setTitle('🛠️ Genel Komutlar')
            .setDescription('Temel bot fonksiyonlari')
            .addFields(
                {
                    name: '🏓 Test Komutlari',
                    value: '`/ping` - Bot yanit suresi ve gecikme\n`/yardim` - Bu yardim menusu',
                    inline: false
                },
                {
                    name: '🧠 Egitim & Eglence',
                    value: '`/bilgiyarismasi` - Bilgi sorulari\n`/soyle [mesaj]` - Bot ile mesaj',
                    inline: false
                },
                {
                    name: '📞 Destek & Iletisim',
                    value: '`/destek` - Destek veya hata bildirimi gönder\nSorunuz mu var? /yardim komutu ile yardım alabilirsiniz!',
                    inline: false
                },
                {
                    name: '📊 Bilgi Komutlari',
                    value: '`/kullanici` - Kullanici profili\n`/sunucubilgi` - Sunucu istatistikleri',
                    inline: false
                }
            );
    },
    
    createFeaturesHelp() {
        return new EmbedBuilder()
            .setColor('#32CD32')
            .setTitle('✨ Bot Özellikleri')
            .setDescription('Bu botun sunduğu tüm harika özellikler!')
            .addFields(
                {
                    name: '🎤 Ses Aktivitesi Takibi',
                    value: '• Dakika bazında XP ve coin kazanma\n• Otomatik ses durumu güncelleme\n• Minimum kullanıcı sayısı kontrolü',
                    inline: false
                },
                {
                    name: '🎮 Kapsamlı Oyun Sistemi',
                    value: '• 7 farklı oyun türü\n• Şans ve strateji oyunları\n• Günlük bonus sistemi\n• Detaylı oyun istatistikleri',
                    inline: false
                },
                {
                    name: '📈 Gelişmiş Profil Sistemi',
                    value: '• Seviye tabanlı unvanlar\n• İnteraktif profil butonları\n• Detaylı istatistikler\n• Liderlik tabloları',
                    inline: false
                },
                {
                    name: '⚙️ Yönetici Araçları',
                    value: '• XP/Coin oran yönetimi\n• Kanal yapılandırması\n• Kullanıcı istatistik yönetimi\n• Sunucu analizleri',
                    inline: false
                }
            );
    },
    
    createSetupHelp() {
        return new EmbedBuilder()
            .setColor('#FF4500')
            .setTitle('🚀 İlk Kurulum Rehberi')
            .setDescription('Botu sunucunuzda optimize etmek için adımlar')
            .addFields(
                {
                    name: '1️⃣ Bot İzinleri',
                    value: '• `Manage Messages` - Mesaj yönetimi\n• `Connect` & `Speak` - Ses kanalı erişimi\n• `Embed Links` - Zengin içerik gönderme\n• `Use Slash Commands` - Slash komut kullanımı',
                    inline: false
                },
                {
                    name: '2️⃣ Kanal Yapılandırması',
                    value: '`/kanal-ayarla` komutunu kullanarak:\n• Seviye duyuru kanalı ayarlayın\n• Hoşgeldin mesajı kanalı seçin\n• Bot duyuru kanalı belirleyin',
                    inline: false
                },
                {
                    name: '3️⃣ Ses Ayarları',
                    value: '`/ses-ayarlari` ile:\n• Minimum kullanıcı sayısını ayarlayın\n• XP ve coin oranlarını optimize edin\n• Ses aktivitesi gereksinimlerini belirleyin',
                    inline: false
                },
                {
                    name: '4️⃣ Admin Araçları',
                    value: '`/admin` ve `/oran-yonetimi` komutlarıyla:\n• Sunucu için optimal oranları ayarlayın\n• İlk kullanıcılara hoşgeldin bonusu verin\n• Sistem performansını izleyin',
                    inline: false
                },
                {
                    name: '✅ İlk Test',
                    value: '• `/ping` ile bot performansını test edin\n• `/profil` ile kullanıcı sistemini deneyin\n• Bir ses kanalına girerek ödül sistemini test edin\n• `/oyunlar` ile oyun sistemini deneyin',
                    inline: false
                }
            )
            .setFooter({ text: 'Sorularınız için yardım kanalını kullanın!' });
    }
};