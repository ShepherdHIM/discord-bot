// Lightweight in-memory fallback DB to avoid accidental second bot startup.
// If you have a real DB module, replace this class with `require('./database')`
// that EXPORTS a constructor-only database client (no side effects).
class VoiceActivityDB {
    constructor() {
        this.users = new Map(); // key: `${userId}-${guildId}` -> { total_xp, coins, voice_time_minutes, username }
        this.sessions = new Map(); // key: `${userId}-${guildId}` -> { sessionId, start, isMuted, isDeafened }
        this.guildSettings = new Map(); // key: guildId -> settings
        this.levelRoles = new Map(); // key: guildId -> [{level, role_id, role_name}]
        this.rewardRanges = new Map(); // key: guildId -> [{reward_type, min_amount, max_amount}]
        this.nextSessionId = 1;
    }
    async cleanupOldSessions() {}
    async getGuildSettings(guildId) {
        if (!this.guildSettings.has(guildId)) {
            this.guildSettings.set(guildId, {
                xp_per_minute: 2,
                coins_per_minute: 1,
                xp_interval_minutes: 1,
                coin_interval_minutes: 1,
                muted_users_earn: false,
                deafened_users_earn: false,
                exclude_afk_channel: true,
                min_members_required: 1,
                levelup_channel_id: null,
                welcome_channel_id: null
            });
        }
        return this.guildSettings.get(guildId);
    }
    async createOrUpdateUser(userId, guildId, username) {
        const key = `${userId}-${guildId}`;
        if (!this.users.has(key)) {
            this.users.set(key, { total_xp: 0, coins: 0, voice_time_minutes: 0, username });
        } else if (username) {
            const u = this.users.get(key); u.username = username;
        }
    }
    async getUser(userId, guildId) { return this.users.get(`${userId}-${guildId}`) || null; }
    async updateUserStats(userId, guildId, total_xp, coins, voice_time_minutes) {
        const key = `${userId}-${guildId}`;
        const u = this.users.get(key) || { total_xp: 0, coins: 0, voice_time_minutes: 0 };
        u.total_xp = Math.max(0, Math.round(total_xp));
        u.coins = Math.max(0, Math.round(coins));
        u.voice_time_minutes = Math.max(0, Math.round(voice_time_minutes));
        this.users.set(key, u);
    }
    async getUserRank(userId, guildId, type) {
        const entries = [...this.users.entries()].filter(([k]) => k.endsWith(`-${guildId}`)).map(([, v]) => v);
        const sorted = entries.sort((a,b)=> (type==='coins'? b.coins-a.coins : b.total_xp-a.total_xp));
        const idx = sorted.findIndex(v => v === this.users.get(`${userId}-${guildId}`));
        return idx >= 0 ? idx + 1 : null;
    }
    async getActiveSession(userId, guildId) { return this.sessions.get(`${userId}-${guildId}`) || null; }
    async startVoiceSession(userId, guildId, channelId, isMuted, isDeafened) {
        const id = this.nextSessionId++;
        this.sessions.set(`${userId}-${guildId}`,{ sessionId: id, start: Date.now(), channelId, isMuted, isDeafened });
        return id;
    }
    async endVoiceSession(sessionId, durationMinutes, earnedXP, earnedCoins) { /* no-op for memory store */ }
    async updateSessionMuteStatus(sessionId, isMuted, isDeafened) { /* no-op */ }
    async getActiveRewardRanges(guildId) { return this.rewardRanges.get(guildId) || []; }
    async getLevelRoles(guildId) { return this.levelRoles.get(guildId) || []; }
    async getLevelRole(guildId, level) {
        const list = this.levelRoles.get(guildId) || [];
        return list.find(r => r.level === level) || null;
    }
    async addLevelRole(guildId, level, roleId, roleName) {
        const list = this.levelRoles.get(guildId) || [];
        // Remove existing role for this level if it exists
        const filtered = list.filter(r => r.level !== level);
        // Add new role
        filtered.push({ level, role_id: roleId, role_name: roleName });
        this.levelRoles.set(guildId, filtered);
        return true;
    }
    async removeLevelRole(guildId, level) {
        const list = this.levelRoles.get(guildId) || [];
        const filtered = list.filter(r => r.level !== level);
        this.levelRoles.set(guildId, filtered);
        return true;
    }
    async updateGuildSettings(guildId, settings) {
        const updatedSettings = {
            ...settings,
            updated_at: new Date().toISOString()
        };
        this.guildSettings.set(guildId, updatedSettings);
        return true;
    }
    async getXPLeaderboard(guildId, limit) {
        const entries = [...this.users.entries()]
            .filter(([k]) => k.endsWith(`-${guildId}`))
            .map(([k, v]) => ({ ...v, user_id: k.split('-')[0] }))
            .sort((a, b) => b.total_xp - a.total_xp)
            .slice(0, limit);
        return entries;
    }
    async getCoinLeaderboard(guildId, limit) {
        const entries = [...this.users.entries()]
            .filter(([k]) => k.endsWith(`-${guildId}`))
            .map(([k, v]) => ({ ...v, user_id: k.split('-')[0] }))
            .sort((a, b) => b.coins - a.coins)
            .slice(0, limit);
        return entries;
    }
    async dbAll(query, params) {
        // For in-memory database, we'll simulate the query
        const guildId = params[0];
        const limit = params[1] || 10;
        
        if (query.includes('voice_time_minutes')) {
            return [...this.users.entries()]
                .filter(([k]) => k.endsWith(`-${guildId}`))
                .map(([k, v]) => ({ ...v, user_id: k.split('-')[0] }))
                .sort((a, b) => b.voice_time_minutes - a.voice_time_minutes)
                .slice(0, limit);
        }
        
        return [];
    }
    async dbGet(query, params) {
        // For in-memory database, simulate query
        const guildId = params[0];
        const value = params[1];
        
        if (query.includes('voice_time_minutes >')) {
            const count = [...this.users.entries()]
                .filter(([k]) => k.endsWith(`-${guildId}`))
                .map(([k, v]) => v)
                .filter(v => v.voice_time_minutes > value).length;
            return { rank: count + 1 };
        }
        
        return { rank: 1 };
    }
    close() {}
}

class VoiceActivityManager {
    constructor(client) {
        this.client = client;
        this.db = new VoiceActivityDB();
        this.activeSessions = new Map(); // userId -> sessionData
        
        // Cleanup old sessions on startup
        this.db.cleanupOldSessions();
        
        // Set up periodic cleanup (every hour)
        setInterval(() => {
            this.db.cleanupOldSessions();
        }, 60 * 60 * 1000);
        
        // Set up periodic XP/coin awarding (every minute)
        setInterval(() => {
            this.processActiveVoiceSessions();
        }, 60 * 1000);
    }
    
    // Handle user joining voice channel
    async handleVoiceJoin(oldState, newState) {
        const userId = newState.member.id;
        const guildId = newState.guild.id;
        const channelId = newState.channelId;
        
        if (!channelId) return; // User didn't join a channel
        
        // Don't track bot users
        if (newState.member.user.bot) return;
        
        // Get guild settings
        const guildSettings = await this.db.getGuildSettings(guildId);
        
        // Check if AFK channel should be excluded
        if (guildSettings.exclude_afk_channel && channelId === newState.guild.afkChannelId) {
            return;
        }
        
        // Ensure user exists in database
        await this.db.createOrUpdateUser(userId, guildId, newState.member.user.username);
        
        // Check if user already has an active session (cleanup if needed)
        const existingSession = await this.db.getActiveSession(userId, guildId);
        if (existingSession) {
            await this.endVoiceSession(userId, guildId);
        }
        
        // Create new session
        const isMuted = newState.selfMute || newState.serverMute;
        const isDeafened = newState.selfDeaf || newState.serverDeaf;
        
        const sessionId = await this.db.startVoiceSession(userId, guildId, channelId, isMuted, isDeafened);
        
        // Track session locally for faster access
        this.activeSessions.set(`${userId}-${guildId}`, {
            sessionId,
            joinedAt: Date.now(),
            channelId,
            isMuted,
            isDeafened,
            lastReward: Date.now()
        });
        
        console.log(`🎤 ${newState.member.user.username} joined voice channel in ${newState.guild.name}`);
    }
    
    // Handle user leaving voice channel
    async handleVoiceLeave(oldState, newState) {
        const userId = oldState.member.id;
        const guildId = oldState.guild.id;
        
        if (!oldState.channelId) return; // User wasn't in a channel
        if (oldState.member.user.bot) return; // Don't track bots
        
        await this.endVoiceSession(userId, guildId);
        console.log(`🚪 ${oldState.member.user.username} left voice channel in ${oldState.guild.name}`);
    }
    
    // Handle mute/deafen changes
    async handleVoiceUpdate(oldState, newState) {
        const userId = newState.member.id;
        const guildId = newState.guild.id;
        
        if (!newState.channelId || newState.member.user.bot) return;
        
        const sessionKey = `${userId}-${guildId}`;
        const session = this.activeSessions.get(sessionKey);
        
        if (!session) return; // No active session
        
        const wasMuted = oldState.selfMute || oldState.serverMute;
        const wasDeafened = oldState.selfDeaf || oldState.serverDeaf;
        const isMuted = newState.selfMute || newState.serverMute;
        const isDeafened = newState.selfDeaf || newState.serverDeaf;
        
        // Update session data
        session.isMuted = isMuted;
        session.isDeafened = isDeafened;
        
        // Update database
        await this.db.updateSessionMuteStatus(session.sessionId, isMuted, isDeafened);
        
        // Log mute/unmute events
        if (wasMuted !== isMuted) {
            console.log(`🔇 ${newState.member.user.username} ${isMuted ? 'muted' : 'unmuted'} in ${newState.guild.name}`);
        }
        if (wasDeafened !== isDeafened) {
            console.log(`🔇 ${newState.member.user.username} ${isDeafened ? 'deafened' : 'undeafened'} in ${newState.guild.name}`);
        }
    }
    
    // End voice session and calculate rewards
    async endVoiceSession(userId, guildId) {
        const sessionKey = `${userId}-${guildId}`;
        const session = this.activeSessions.get(sessionKey);
        
        if (!session) return;
        
        // Calculate session duration
        const durationMs = Date.now() - session.joinedAt;
        const durationMinutes = Math.floor(durationMs / (1000 * 60));
        
        // Calculate final rewards for the session
        const { earnedXP, earnedCoins } = await this.calculateSessionRewards(userId, guildId, durationMinutes, session);
        
        // Update database
        await this.db.endVoiceSession(session.sessionId, durationMinutes, earnedXP, earnedCoins);
        
        // Update user totals
        const user = await this.db.getUser(userId, guildId);
        if (user) {
            await this.db.updateUserStats(
                userId, 
                guildId, 
                user.total_xp + earnedXP, 
                user.coins + earnedCoins, 
                user.voice_time_minutes + durationMinutes
            );
        }
        
        // Remove from active sessions
        this.activeSessions.delete(sessionKey);
        
        if (earnedXP > 0 || earnedCoins > 0) {
            console.log(`💰 Session ended: +${earnedXP} XP, +${earnedCoins} coins (${durationMinutes} minutes)`);
        }
    }
    
    // Process all active voice sessions and award XP/coins
    async processActiveVoiceSessions() {
        for (const [sessionKey, session] of this.activeSessions.entries()) {
            const [userId, guildId] = sessionKey.split('-');
            
            // Check if user is still in voice channel
            try {
                const guild = this.client.guilds.cache.get(guildId);
                if (!guild) continue;
                
                const member = guild.members.cache.get(userId);
                if (!member || !member.voice.channelId) {
                    // User is no longer in voice, end session
                    await this.endVoiceSession(userId, guildId);
                    continue;
                }
                
                // Award XP and coins if conditions are met
                await this.awardPeriodicRewards(userId, guildId, session);
                
            } catch (error) {
                console.error(`Error processing voice session for ${userId}:`, error);
                // Clean up potentially corrupted session
                this.activeSessions.delete(sessionKey);
            }
        }
    }
    
    // Award XP and coins for active voice participation
    async awardPeriodicRewards(userId, guildId, session) {
        const now = Date.now();
        
        const guild = this.client.guilds.cache.get(guildId);
        if (!guild) return;
        
        const member = guild.members.cache.get(userId);
        if (!member || !member.voice.channelId) return;
        
        const guildSettings = await this.db.getGuildSettings(guildId);
        
        // Check if it's time to award XP based on interval
        const timeSinceLastXPReward = now - (session.lastXPReward || session.lastReward || session.joinedAt);
        const xpIntervalMs = (guildSettings.xp_interval_minutes || 1) * 60 * 1000;
        
        // Check if it's time to award coins based on interval
        const timeSinceLastCoinReward = now - (session.lastCoinReward || session.lastReward || session.joinedAt);
        const coinIntervalMs = (guildSettings.coin_interval_minutes || 1) * 60 * 1000;
        
        let shouldAwardXP = timeSinceLastXPReward >= xpIntervalMs;
        let shouldAwardCoins = timeSinceLastCoinReward >= coinIntervalMs;
        
        // If neither is ready, return early
        if (!shouldAwardXP && !shouldAwardCoins) return;
        
        // Check if user should earn rewards
        if (!this.shouldEarnRewards(member, guildSettings)) return;
        
        let earnedXP = 0;
        let earnedCoins = 0;
        
        // Get active reward ranges for this guild
        const rewardRanges = await this.db.getActiveRewardRanges(guildId);
        const xpRanges = rewardRanges.filter(range => range.reward_type === 'xp');
        const coinRanges = rewardRanges.filter(range => range.reward_type === 'coin');
        
        // Award XP if it's time
        if (shouldAwardXP) {
            if (xpRanges.length > 0) {
                // Use random value from configured XP ranges
                const randomRange = xpRanges[Math.floor(Math.random() * xpRanges.length)];
                earnedXP = Math.floor(Math.random() * (randomRange.max_amount - randomRange.min_amount + 1)) + randomRange.min_amount;
            } else {
                // Fallback to fixed rate if no ranges configured
                earnedXP = guildSettings.xp_per_minute * (guildSettings.xp_interval_minutes || 1);
            }
            session.lastXPReward = now;
        }
        
        // Award coins if it's time
        if (shouldAwardCoins) {
            if (coinRanges.length > 0) {
                // Use random value from configured coin ranges
                const randomRange = coinRanges[Math.floor(Math.random() * coinRanges.length)];
                earnedCoins = Math.floor(Math.random() * (randomRange.max_amount - randomRange.min_amount + 1)) + randomRange.min_amount;
            } else {
                // Fallback to fixed rate if no ranges configured
                earnedCoins = guildSettings.coins_per_minute * (guildSettings.coin_interval_minutes || 1);
            }
            session.lastCoinReward = now;
        }
        
        // For backward compatibility, update lastReward if both are awarded at the same time
        if (shouldAwardXP && shouldAwardCoins) {
            session.lastReward = now;
        }
        
        // Update user stats if we earned anything
        if (earnedXP > 0 || earnedCoins > 0) {
            const user = await this.db.getUser(userId, guildId);
            if (user) {
                const oldLevel = Math.floor(user.total_xp / 100);
                const newTotalXP = user.total_xp + earnedXP;
                const newLevel = Math.floor(newTotalXP / 100);
                
                await this.db.updateUserStats(
                    userId,
                    guildId,
                    newTotalXP,
                    user.coins + earnedCoins,
                    user.voice_time_minutes + Math.floor((shouldAwardXP ? xpIntervalMs : coinIntervalMs) / (60 * 1000))
                );
                
                // Check for level up
                if (newLevel > oldLevel) {
                    console.log(`🎉 User ${userId} leveled up from ${oldLevel} to ${newLevel} through voice activity`);
                    await this.handleLevelUp(member, newLevel);
                }
                
                if (earnedXP > 0 || earnedCoins > 0) {
                    console.log(`💰 Voice reward: +${earnedXP} XP, +${earnedCoins} coins to user ${userId}`);
                }
            }
        }
    }
    
    // Calculate total rewards for a completed session
    async calculateSessionRewards(userId, guildId, durationMinutes, session) {
        const guild = this.client.guilds.cache.get(guildId);
        if (!guild) return { earnedXP: 0, earnedCoins: 0 };
        
        const member = guild.members.cache.get(userId);
        if (!member) return { earnedXP: 0, earnedCoins: 0 };
        
        const guildSettings = await this.db.getGuildSettings(guildId);
        
        // Calculate how many minutes user was eligible for rewards
        // (This is a simplified calculation - in reality you'd track mute changes over time)
        let eligibleMinutes = durationMinutes;
        
        if (session.isMuted && !guildSettings.muted_users_earn) {
            eligibleMinutes = 0;
        }
        if (session.isDeafened && !guildSettings.deafened_users_earn) {
            eligibleMinutes = 0;
        }
        
        return {
            earnedXP: eligibleMinutes * guildSettings.xp_per_minute,
            earnedCoins: eligibleMinutes * guildSettings.coins_per_minute
        };
    }
    
    // Check if user should earn rewards based on current conditions
    shouldEarnRewards(member, guildSettings) {
        const voiceState = member.voice;
        
        // Must be in a voice channel
        if (!voiceState.channelId) return false;
        
        // Check if in AFK channel
        if (guildSettings.exclude_afk_channel && voiceState.channelId === member.guild.afkChannelId) {
            return false;
        }
        
        // Check mute status
        if ((voiceState.selfMute || voiceState.serverMute) && !guildSettings.muted_users_earn) {
            return false;
        }
        
        // Check deafen status
        if ((voiceState.selfDeaf || voiceState.serverDeaf) && !guildSettings.deafened_users_earn) {
            return false;
        }
        
        // Check minimum members in channel
        const channelMemberCount = voiceState.channel.members.filter(m => !m.user.bot).size;
        if (channelMemberCount < guildSettings.min_members_required) {
            return false;
        }
        
        return true;
    }
    
    // Handle level up event - assign roles and announce
    async handleLevelUp(member, newLevel) {
        try {
            console.log(`🎉 Handling level up for ${member.user.username} to level ${newLevel}`);
            // Assign level role if configured
            await this.assignLevelRole(member, newLevel);
            
            // Announce level up
            await this.announceLevelUp(member, newLevel);
        } catch (error) {
            console.error(`Error handling level up for ${member.user.username}:`, error);
        }
    }
    
    // Assign role based on level - milestone system
    async assignLevelRole(member, level) {
        try {
            const guildId = member.guild.id;
            console.log(`🔍 Checking level role assignment for user ${member.user.username} (ID: ${member.user.id}) at level ${level} in guild ${guildId}`);
            
            // If level is 0, remove all level roles
            if (level === 0) {
                const levelRoles = await this.db.getLevelRoles(guildId);
                for (const levelRole of levelRoles) {
                    if (member.roles.cache.has(levelRole.role_id)) {
                        const role = member.guild.roles.cache.get(levelRole.role_id);
                        if (role) {
                            await member.roles.remove(role);
                            console.log(`✅ Removed level role ${role.name} (level ${levelRole.level}) from ${member.user.username} - user at level 0`);
                        }
                    }
                }
                console.log(`ℹ️ User ${member.user.username} is at level 0, removed all level roles`);
                return;
            }
            
            // Get all level roles for this guild
            const levelRoles = await this.db.getLevelRoles(guildId);
            
            // Find the highest role the user should have based on their current level
            let targetRole = null;
            let targetLevel = 0;
            
            // Find the highest defined role level that the user has reached
            for (const levelRole of levelRoles) {
                if (levelRole.level <= level && levelRole.level > targetLevel) {
                    targetRole = levelRole;
                    targetLevel = levelRole.level;
                }
            }
            
            // If no role is defined for this level or any lower level, keep current roles
            if (!targetRole) {
                console.log(`ℹ️ No role configured for level ${level} or any lower level in guild ${guildId} - keeping current roles`);
                return;
            }
            
            console.log(`✅ Target role for level ${level}: ${targetRole.role_name} (level ${targetRole.level})`);
            
            // Check if user already has the correct role
            if (member.roles.cache.has(targetRole.role_id)) {
                console.log(`ℹ️ User ${member.user.username} already has the correct role ${targetRole.role_name}`);
                return;
            }
            
            // Only remove other level roles if we have a target role to assign
            for (const levelRole of levelRoles) {
                if (levelRole.role_id !== targetRole.role_id && member.roles.cache.has(levelRole.role_id)) {
                    const role = member.guild.roles.cache.get(levelRole.role_id);
                    if (role) {
                        await member.roles.remove(role);
                        console.log(`✅ Removed old level role ${role.name} (level ${levelRole.level}) from ${member.user.username}`);
                    }
                }
            }
            
            // Get the role object from Discord
            const role = member.guild.roles.cache.get(targetRole.role_id);
            if (!role) {
                console.log(`❌ Role ${targetRole.role_id} not found in guild ${guildId}`);
                return;
            }
            
            console.log(`✅ Role found in guild: ${role.name} (ID: ${role.id})`);
            
            // Check if bot has permission to manage roles
            if (!member.guild.members.me.permissions.has('ManageRoles')) {
                console.log(`❌ Bot lacks ManageRoles permission in guild ${guildId}`);
                return;
            }
            
            console.log(`✅ Bot has ManageRoles permission`);
            
            // Check if role is higher than bot's highest role
            const botHighestRole = member.guild.members.me.roles.highest;
            if (role.position >= botHighestRole.position) {
                console.log(`❌ Role ${role.name} (position: ${role.position}) is higher than or equal to bot's highest role ${botHighestRole.name} (position: ${botHighestRole.position}) in guild ${guildId}`);
                return;
            }
            
            console.log(`✅ Role position is valid (role: ${role.position}, bot highest: ${botHighestRole.position})`);
            
            // Assign the role to the user
            await member.roles.add(role);
            console.log(`✅ Assigned role ${role.name} to ${member.user.username} for reaching level ${level} (milestone level ${targetLevel})`);
            
        } catch (error) {
            console.error(`❌ Error assigning level role to ${member.user.username}:`, error);
        }
    }
    
    // Announce level up in the configured or automatic channel
    async announceLevelUp(member, newLevel) {
        try {
            // Get guild settings to check for configured channel
            const guildSettings = await this.db.getGuildSettings(member.guild.id);
            let channel = null;
            
            // First, try to use channel settings from /kanal_ayarla command
            const fs = require('fs');
            const path = require('path');
            const settingsPath = path.join(__dirname, 'data', `settings_${member.guild.id}.json`);
            if (fs.existsSync(settingsPath)) {
                try {
                    const channelSettings = JSON.parse(fs.readFileSync(settingsPath, 'utf8'));
                    if (channelSettings.duyuruChannel) {
                        channel = member.guild.channels.cache.get(channelSettings.duyuruChannel);
                        console.log(`📢 Using configured announcement channel for level-up: ${channel?.name || 'NOT FOUND'} (ID: ${channelSettings.duyuruChannel})`);
                    }
                } catch (error) {
                    console.error('Error reading channel settings:', error);
                }
            }
            
            // Fallback to voice manager database settings
            if (!channel && guildSettings.levelup_channel_id) {
                channel = member.guild.channels.cache.get(guildSettings.levelup_channel_id);
            }
            
            // Fallback to automatic channel detection
            if (!channel) {
                channel = member.guild.channels.cache.find(ch => 
                    ch.isTextBased() && 
                    (ch.name.includes('general') || 
                     ch.name.includes('level') || 
                     ch.name.includes('chat') ||
                     ch.name.includes('bot') ||
                     ch.name.includes('announcements'))
                );
            }
            
            if (channel) {
                const embed = {
                    color: 0xFFD700,
                    title: '🎉 Level Up!',
                    description: `Congratulations ${member}! You reached **Level ${newLevel}**!`,
                    thumbnail: {
                        url: member.user.displayAvatarURL({ dynamic: true })
                    },
                    fields: [
                        {
                            name: '🏆 New Level',
                            value: newLevel.toString(),
                            inline: true
                        },
                        {
                            name: '⚡ Total XP',
                            value: (newLevel * 100).toLocaleString(),
                            inline: true
                        }
                    ],
                    footer: {
                        text: 'Keep chatting in voice channels to earn more XP!'
                    },
                    timestamp: new Date().toISOString()
                };
                
                await channel.send({ embeds: [embed] });
            }
        } catch (error) {
            console.error('Error announcing level up:', error);
        }
    }
    
    // Get user stats
    async getUserStats(userId, guildId) {
        const user = await this.db.getUser(userId, guildId);
        if (!user) return null;
        
        const level = Math.floor(user.total_xp / 100);
        const xpToNextLevel = 100 - (user.total_xp % 100);
        const xpRank = await this.db.getUserRank(userId, guildId, 'xp');
        const coinRank = await this.db.getUserRank(userId, guildId, 'coins');
        
        return {
            ...user,
            level,
            xpToNextLevel,
            xpRank,
            coinRank
        };
    }
    
    // Cleanup method
    cleanup() {
        this.db.close();
    }
}

module.exports = VoiceActivityManager;