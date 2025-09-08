const { REST, Routes } = require("discord.js");
const fs = require("fs");
const path = require("path");
require("dotenv").config();

console.log("⚠️  NOTICE: This script is now OPTIONAL!");
console.log("🔄 The bot now automatically deploys commands on startup.");
console.log("📝 Use this script only if you need manual command deployment.");
console.log("");

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
        console.log(`🔄 ${commands.length} komut manuel olarak yenileniyor...`);

        // Clear global commands first to prevent duplicates
        console.log("🧹 Global komutlar temizleniyor...");
        await rest.put(
            Routes.applicationCommands(process.env.CLIENT_ID),
            { body: [] }
        );
        console.log("✅ Global komutlar temizlendi!");

        // Deploy globally to avoid permission issues
        console.log("🌍 Global deploy başlatılıyor (1 saat sürebilir)...");
        const data = await rest.put(
            Routes.applicationCommands(process.env.CLIENT_ID),
            { body: commands }
        );
        console.log(`✅ ${data.length} komut global olarak yüklendi!`);
        console.log("ℹ️  Remember: The bot now auto-deploys on startup!");
    } catch (error) {
        console.error("❌ Komut yükleme hatası:", error);
    }
})();
