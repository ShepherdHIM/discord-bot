require('dotenv').config();
const fs = require('fs');
const path = require('path');
const { Client, Collection, GatewayIntentBits } = require('discord.js');

// Botu başlat
const client = new Client({
    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildVoiceStates,
        GatewayIntentBits.GuildMessages
    ]
});

// Komutları yükle
client.commands = new Collection();
const commandsPath = path.join(__dirname, 'commands');
const commandFiles = fs.readdirSync(commandsPath).filter(file => file.endsWith('.js'));

for (const file of commandFiles) {
    const command = require(`./commands/${file}`);
    if ('data' in command && 'execute' in command) {
        client.commands.set(command.data.name, command);
        console.log(`✅ Loaded command: ${command.data.name}`);
    } else {
        console.log(`⚠️ Warning: ${file} eksik "data" veya "execute" içeriyor.`);
    }
}

// Bot hazır olduğunda
client.once('clientReady', async () => {
    console.log(`🎉 Bot is online as ${client.user.tag}`);
});

// Slash komutları dinle
client.on('interactionCreate', async interaction => {
    if (!interaction.isChatInputCommand()) return;

    const command = client.commands.get(interaction.commandName);
    if (!command) {
        console.error(`❌ Komut bulunamadı: ${interaction.commandName}`);
        return;
    }

    try {
        await command.execute(interaction);
    } catch (error) {
        console.error(`❌ Komut hatası: ${interaction.commandName}`, error);

        if (interaction.replied || interaction.deferred) {
            await interaction.followUp({ content: '⚠️ Komut çalıştırılırken hata oluştu!', flags: 64 });
        } else {
            await interaction.reply({ content: '⚠️ Komut çalıştırılırken hata oluştu!', flags: 64 });
        }
    }
});

// Botu çalıştır
client.login(process.env.DISCORD_TOKEN);
