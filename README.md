# Discord Bot

A feature-rich Discord bot built with Node.js and discord.js v14.

## Features

- **Slash Commands**: Modern Discord slash command support
- **Message Commands**: Simple prefix commands (ping, echo)
- **User Information**: Get detailed info about users and the server
- **Welcome Messages**: Automatically welcome new members
- **Error Handling**: Comprehensive error handling and logging

## Channel Configuration

The bot can be configured to use specific channels for different types of messages, making it perfect for multi-server deployments.

### Available Channel Types

1. **Level-up Channel** - Where level-up announcements are sent
2. **Welcome Channel** - Where new member welcome messages are sent  
3. **Announcements Channel** - Where bot announcements and updates are sent

### Configuration Commands

- **View Configuration**: `/set-channels view`
- **Set Channels**: 
  - `/set-channels levelup #channel` - Set level-up channel
  - `/set-channels welcome #channel` - Set welcome channel  
  - `/set-channels announcements #channel` - Set announcements channel
- **Clear Channels**: Use the same commands without specifying a channel
- **Reset All**: `/set-channels reset all`

### Automatic Fallback

If no channels are configured, the bot will automatically detect suitable channels:
- Looks for channels with names like "general", "welcome", "announcements", "bot", etc.
- Ensures the bot has proper permissions before sending messages
- Falls back gracefully if no suitable channels are found

## Gaming System

The bot includes a comprehensive gaming system that integrates seamlessly with the XP/coin economy!

### 🎮 Available Games

#### **Casino Games** (Coin Betting)
- **🪙 Coinflip** - Simple heads/tails betting
- **🎰 Slot Machine** - Classic 3-reel slots with various symbols
- **🎲 Dice Game** - Bet on dice roll outcomes (2-12)
- **🔢 Number Guess** - Guess numbers 1-100 for big payouts

#### **Skill Games** (Interactive)
- **✂️ Rock Paper Scissors** - Challenge the bot or other users
- **🧠 Trivia** - Knowledge-based questions with categories
  - Categories: General, Gaming, Science, History
  - Difficulties: Easy, Medium, Hard
  - Speed bonuses for quick correct answers

#### **Daily Systems**
- **🎁 Daily Bonus** - Claim daily XP and coins
  - Base bonus increases with level
  - Streak bonuses for consecutive days
  - Level-based multipliers

### 🏆 Game Features

- **Smart Betting Limits** - Prevents users from betting more than they have
- **Interactive Buttons** - Smooth gameplay with Discord buttons
- **Real-time Updates** - Instant coin and XP updates
- **Game Statistics** - Track wins, losses, and performance
- **Achievement Integration** - Games contribute to overall achievements
- **Timeout Protection** - Auto-resolve for inactive games
- **Speed Bonuses** - Extra rewards for quick trivia answers

### 💰 Economic Integration

- All games use the same coin system as voice activities
- XP rewards for participation (even when losing)
- Progressive jackpots and multipliers
- Daily bonuses scale with user level
- Games provide alternative ways to earn beyond voice chat

## Commands

### Slash Commands
- `/ping` - Check bot latency and API response time
- `/userinfo [user]` - Get information about a user (defaults to yourself)
- `/serverinfo` - Get information about the current server
- `/say <message> [channel]` - Make the bot say something
- `/profile [user]` - View XP, coins, level, and ranking information
- `/leaderboard [type] [limit]` - View XP, coin, or voice time leaderboards
- `/voice-config` - Configure voice activity settings (Admin only)
  - `view` - View current voice tracking settings
  - `set-rates` - Set XP and coin earning rates
  - `set-requirements` - Configure earning requirements
- `/voice-status` - View current voice activity and earning status
- `/set-channels` - Configure bot channels (Admin only)
  - `view` - View current channel configurations
  - `levelup` - Set level-up announcement channel
  - `welcome` - Set welcome message channel
  - `announcements` - Set bot announcements channel
  - `reset` - Reset channel configurations
- `/games` - Play fun games to earn XP and coins!
  - `coinflip` - Flip a coin and bet on the outcome
  - `slots` - Play the slot machine
  - `dice` - Roll dice and bet on the outcome
  - `guess` - Number guessing game
  - `daily` - Claim your daily bonus
  - `stats` - View gaming statistics
- `/trivia` - Play trivia to earn XP and coins!
  - Multiple categories (General, Gaming, Science, History)
  - Three difficulty levels (Easy, Medium, Hard)
  - Speed bonuses for quick answers

### Message Commands
- `ping` - Simple ping response
- `!echo <message>` - Echo a message

## Setup Instructions

### 1. Create a Discord Application

1. Go to [Discord Developer Portal](https://discord.com/developers/applications)
2. Click "New Application" and give it a name
3. Go to the "Bot" section and click "Add Bot"
4. Copy the bot token (keep this secret!)
5. Go to the "General Information" section and copy the Application ID (Client ID)

### 2. Configure Environment Variables

1. Open the `.env` file in this project
2. Replace `your_bot_token_here` with your actual bot token
3. Replace `your_client_id_here` with your application's client ID

```env
DISCORD_TOKEN=your_actual_bot_token_here
CLIENT_ID=your_actual_client_id_here
```

### 3. Install Dependencies

```bash
npm install
```

### 4. Register Slash Commands

```bash
node deploy-commands.js
```

**Note**: Global commands can take up to 1 hour to appear. For faster testing during development, you can register commands to a specific guild by modifying the `deploy-commands.js` file.

### 5. Invite the Bot to Your Server

1. Go to the Discord Developer Portal
2. Navigate to your application > OAuth2 > URL Generator
3. Select scopes: `bot` and `applications.commands`
4. Select bot permissions:
   - Send Messages
   - Use Slash Commands
   - Read Message History
   - View Channels
   - Embed Links
   - Add Reactions
5. Copy the generated URL and open it to invite the bot

### 6. Run the Bot

```bash
# Production
npm start

# Development (with auto-restart)
npm run dev
```

## Bot Permissions

The bot requires the following permissions:
- **View Channels**: To see channels and messages
- **Send Messages**: To respond to commands
- **Use Slash Commands**: To use modern Discord commands
- **Embed Links**: To send rich embed messages
- **Read Message History**: To read messages for commands
- **Add Reactions**: To react to messages

## Project Structure

```
discord-bot/
├── commands/           # Slash command files
│   ├── ping.js        # Ping command with latency info
│   ├── userinfo.js    # User information command
│   ├── serverinfo.js  # Server information command
│   └── say.js         # Make bot say something
├── index.js           # Main bot file
├── deploy-commands.js # Command registration script
├── package.json       # Project dependencies
├── .env              # Environment variables (tokens)
└── README.md         # This file
```

## Adding New Commands

To add a new slash command:

1. Create a new file in the `commands/` directory
2. Follow the structure of existing commands:

```javascript
const { SlashCommandBuilder } = require('discord.js');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('commandname')
        .setDescription('Command description'),
    
    async execute(interaction) {
        await interaction.reply('Hello World!');
    },
};
```

3. Run `node deploy-commands.js` to register the new command
4. Restart the bot

## Troubleshooting

### Bot doesn't respond to commands
- Make sure the bot is online and has the necessary permissions
- Check that slash commands are registered (`node deploy-commands.js`)
- Verify the bot token in the `.env` file

### Commands not appearing
- Global commands take up to 1 hour to appear
- Try registering to a specific guild for faster testing
- Make sure the bot has `applications.commands` scope

### Permission errors
- Ensure the bot has the required permissions in your server
- Check the bot's role hierarchy (it needs appropriate permissions)

## Support

If you encounter any issues, check:
1. Console logs for error messages
2. Discord Developer Portal for application status
3. Bot permissions in your Discord server

## License

MIT License - feel free to modify and use this bot as you wish!