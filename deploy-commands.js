const { REST, Routes } = require("discord.js");
const fs = require("fs");
const path = require("path");
require("dotenv").config();

const commands = [];

// 📂 Komut klasörünü tara
const commandsPath = path.join(__dirname, "commands");
const commandFiles = fs.readdirSync(commandsPath).filter(file => file.endsWith(".js"));

// 📌 Slash komutlarını yükle
for (const file of commandFiles) {
    const command = require(`./commands/${file}`);
    if ("data" in command && "execute" in command) {
        commands.push(command.data.toJSON());
        console.log(`✅ Loaded command: ${command.data.name}`);
    } else {
        console.log(`⚠️ Warning: ${file} dosyasında "data" veya "execute" eksik.`);
    }
}

// 🔑 REST başlat
const rest = new REST({ version: "10" }).setToken(process.env.DISCORD_TOKEN);

// 🚀 Komutları deploy et
(async () => {
    try {
        console.log(`🔄 ${commands.length} komut yenileniyor...`);

        if (process.env.GUILD_ID) {
            console.log(`📌 Guild'e yükleniyor: ${process.env.GUILD_ID}`);
            const data = await rest.put(
                Routes.applicationGuildCommands(process.env.CLIENT_ID, process.env.GUILD_ID),
                { body: commands }
            );
            console.log(`✅ ${data.length} komut sunucuya başarıyla yüklendi!`);
        } else {
            console.log("🌍 Global deploy başlatılıyor (1 saat sürebilir)...");
            const data = await rest.put(
                Routes.applicationCommands(process.env.CLIENT_ID),
                { body: commands }
            );
            console.log(`✅ ${data.length} komut global olarak yüklendi!`);
        }
    } catch (error) {
        console.error("❌ Komut yükleme hatası:", error);
    }
})();
