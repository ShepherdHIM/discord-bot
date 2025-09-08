require('dotenv').config();

const token = process.env.DISCORD_TOKEN;
if (!token) {
    console.log('❌ No token found');
    process.exit(1);
}

console.log('🔍 Token Analysis:');
console.log('Total length:', token.length);

const parts = token.split('.');
console.log('Number of parts:', parts.length);
parts.forEach((part, i) => {
    console.log(`Part ${i+1}: ${part.length} characters`);
});

// Check if token format looks correct
if (parts.length === 3) {
    console.log('✅ Token has correct 3-part structure');
} else {
    console.log('❌ Token should have 3 parts separated by dots');
}

// Check if first part (bot ID) matches CLIENT_ID
console.log('Client ID from env:', process.env.CLIENT_ID);
if (parts[0]) {
    try {
        const botIdFromToken = Buffer.from(parts[0], 'base64').toString();
        console.log('Bot ID from token:', botIdFromToken);
    } catch (e) {
        console.log('Could not decode bot ID from token');
    }
}