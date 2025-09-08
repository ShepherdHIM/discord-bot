const VoiceActivityDB = require('./database');

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
    
    // Assign role based on level
    async assignLevelRole(member, level) {
        try {
            const guildId = member.guild.id;
            console.log(`🔍 Checking level role assignment for user ${member.user.username} (ID: ${member.user.id}) at level ${level} in guild ${guildId}`);
            
            // Get all level roles for this guild
            const levelRoles = await this.db.getLevelRoles(guildId);
            
            // Remove any existing level roles the user currently has
            for (const levelRole of levelRoles) {
                // If user has this level role, remove it
                if (member.roles.cache.has(levelRole.role_id)) {
                    const role = member.guild.roles.cache.get(levelRole.role_id);
                    if (role) {
                        await member.roles.remove(role);
                        console.log(`✅ Removed existing level role ${role.name} (level ${levelRole.level}) from ${member.user.username}`);
                    }
                }
            }
            
            // If level is 0, we're done (no role to assign)
            if (level === 0) {
                console.log(`ℹ️ User ${member.user.username} is at level 0, no role to assign`);
                return;
            }
            
            // Get the role for this level
            const levelRole = await this.db.getLevelRole(guildId, level);
            if (!levelRole) {
                console.log(`ℹ️ No role configured for level ${level} in guild ${guildId}`);
                return; // No role configured for this level
            }
            
            console.log(`✅ Found level role configuration: ${levelRole.role_name} (ID: ${levelRole.role_id}) for level ${level}`);
            
            // Get the role object from Discord
            const role = member.guild.roles.cache.get(levelRole.role_id);
            if (!role) {
                console.log(`❌ Role ${levelRole.role_id} not found in guild ${guildId}`);
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
            
            // Check if user already has this role
            if (member.roles.cache.has(role.id)) {
                console.log(`ℹ️ User ${member.user.username} already has role ${role.name}`);
                return;
            }
            
            // Assign the role to the user
            await member.roles.add(role);
            console.log(`✅ Assigned role ${role.name} to ${member.user.username} for reaching level ${level}`);
            
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
            
            // Use configured level-up channel if available
            if (guildSettings.levelup_channel_id) {
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