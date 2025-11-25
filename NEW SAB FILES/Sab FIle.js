const { 
    Client, 
    MessageAttachment,
    Collection         
} = require('discord.js-selfbot-v13');
const axios = require('axios');
const fs = require('fs');
const path = require('path');

const PREFIX = '+';
const DELETE_COOLDOWN = 1.0;
const TOKEN = 'ADD YOUR TOKEN HERE MFS HEHEHEHHEHEHEHHE NEW SHI READY';

const client = new Client({ 
    intents: 32767,
    partials: [1] 
});

const spamTasks = new Map();
const deletedMessages = new Map();
let lastDeleteTime = 0;

async function selfDeleteMessage(message) {
    const currentTime = Date.now() / 1000;
    const timeSinceLastDelete = currentTime - lastDeleteTime;
    
    if (timeSinceLastDelete < DELETE_COOLDOWN) {
        await new Promise(resolve => setTimeout(resolve, (DELETE_COOLDOWN - timeSinceLastDelete) * 1000));
    }
    
    try {
        await message.delete();
        lastDeleteTime = Date.now() / 1000;
    } catch (error) {
        if (error.code !== 10008) { 
             console.error("Error during message deletion:", error.message);
        }
    }
}

client.on('ready', () => {
    console.log(`Logged in as ${client.user.tag} (ID: ${client.user.id})`);
    console.log('------');

    try {
        client.user.setStatus('online');
    } catch (err) {
        console.error("Failed to set status:", err);
    }
});

client.on('messageDelete', message => {
    if (!message.partial) {
        const channelId = message.channel.id;
        if (!deletedMessages.has(channelId)) {
            deletedMessages.set(channelId, []);
        }
        
        const channelDeletes = deletedMessages.get(channelId);

        if (channelDeletes.length >= 10) {
            channelDeletes.shift(); 
        }

        channelDeletes.push({
            content: message.content,
            author: message.author,
            timestamp: new Date(),
            attachments: message.attachments.map(att => att.url)
        });
    }
});

client.on('messageCreate', async message => {
    if (message.author.id !== client.user.id || !message.content.startsWith(PREFIX)) return;

    const args = message.content.slice(PREFIX.length).trim().split(/\s+/);
    const commandName = args.shift().toLowerCase();
    
    if (commandName === 'help') {
        const helpText = `
**MADE BY SLAYERSON NIGGA!**
\`${PREFIX}help\` 

**Messaging Commands:**
• \`${PREFIX}spam <message>\`
• \`${PREFIX}stopspam\`
• \`${PREFIX}an <message>\`
• \`${PREFIX}stopan\`
• \`${PREFIX}snipe <amount?>\`
• \`${PREFIX}delete <amount>\`
• \`${PREFIX}cleanconv @user\`
• \`${PREFIX}cn @user\`

**User Commands:**
• \`${PREFIX}userinfo @user\`
• \`${PREFIX}jtbz\`

**Webhook Commands:**
• \`${PREFIX}checkwebhook <webhookURL>\`
• \`${PREFIX}spamwebhook <webhookURL> <webhookName> <message> <amount?>\`

**Other Commands:**
• \`${PREFIX}account status|profile|logout\`
• \`${PREFIX}serverinfo\`
• \`${PREFIX}joke\`
• \`${PREFIX}choose <option1> <option2> ...\`
• \`${PREFIX}config prefix|settings\`
`;
        const helpMsg = await message.channel.send(helpText);
        setTimeout(() => selfDeleteMessage(helpMsg), 5000);
    }

    if (commandName === 'spam') {
        const spamMessage = args.join(' ');
        if (!spamMessage) return message.channel.send('Please provide a message to spam.');

        if (spamTasks.has(message.channel.id)) {
            return message.channel.send('A spam task is already running in this channel. Use `+stopspam` first.');
        }
        
        await selfDeleteMessage(message);

        const spamTask = setInterval(() => {
            message.channel.send(spamMessage).catch(err => {
                console.error("Spam send failed:", err.message);
                clearInterval(spamTasks.get(message.channel.id));
                spamTasks.delete(message.channel.id);
            }); 
        }, 100); 

        spamTasks.set(message.channel.id, spamTask);
    }

    if (commandName === 'stopspam') {
        await selfDeleteMessage(message); 
        if (spamTasks.has(message.channel.id)) {
            clearInterval(spamTasks.get(message.channel.id));
            spamTasks.delete(message.channel.id);
            const tempMsg = await message.channel.send('Spam stopped.');
            setTimeout(() => selfDeleteMessage(tempMsg), 5000);
        } else {
            const tempMsg = await message.channel.send('No spam task is currently running.');
            setTimeout(() => selfDeleteMessage(tempMsg), 5000);
        }
    }

    if (commandName === 'delete') {
        let amount = parseInt(args[0]) || 10;
        if (amount > 100) amount = 100;

        await selfDeleteMessage(message); 

        let deletedCount = 0;
        const messages = await message.channel.messages.fetch({ limit: amount + 10 });

        for (const msg of messages.values()) {
            if (deletedCount >= amount) break;
            if (msg.author.id === client.user.id) {
                await selfDeleteMessage(msg);
                deletedCount++;
            }
        }
    }

    if (commandName === 'an') {
        const anonymousMessage = args.join(' ');
        if (!anonymousMessage) return message.channel.send('Provide a message.');

        await selfDeleteMessage(message);
        await new Promise(resolve => setTimeout(resolve, 500));
        await message.channel.send(`Anonymous Message: **${anonymousMessage}**`);
    }

    if (commandName === 'snipe') {
        await selfDeleteMessage(message);
        let amount = parseInt(args[0]) || 1;

        const channelId = message.channel.id;
        const channelDeletes = deletedMessages.get(channelId);

        if (!channelDeletes || channelDeletes.length === 0) {
            const tempMsg = await message.channel.send("No message to snipe.");
            return setTimeout(() => selfDeleteMessage(tempMsg), 5000);
        }
        
        amount = Math.min(amount, channelDeletes.length);
        const messagesToSnipe = channelDeletes.slice(-amount).reverse();

        for (const msgData of messagesToSnipe) {
            const timeDiff = new Date() - msgData.timestamp;
            const secondsAgo = Math.floor(timeDiff / 1000);

            const attachments = msgData.attachments || [];
            const attachmentUrls = attachments.length > 0 ? `\nAttachments: ${attachments.join(', ')}` : "";

            const snipeText = `
**SNIPE**
Author: ${msgData.author.tag}
Time: ${secondsAgo} seconds ago
Message: ${msgData.content || "*Empty*"}
${attachmentUrls}
`;
            const snipeMsg = await message.channel.send(snipeText);
            setTimeout(() => selfDeleteMessage(snipeMsg), 10000);
            await new Promise(resolve => setTimeout(resolve, 300));
        }
    }

    if (commandName === 'cleanconv' || commandName === 'cn') {
        await selfDeleteMessage(message);
        const user = message.mentions.users.first();
        if (!user) {
            const tempMsg = await message.channel.send("Please mention a user.");
            return setTimeout(() => selfDeleteMessage(tempMsg), 5000);
        }

        const limit = commandName === 'cn' ? parseInt(args[1]) || 50 : 200;

        const messages = await message.channel.messages.fetch({ limit: 200 }); 
        let messagesToDelete = [];

        for (const msg of messages.values()) {
            const isTarget = commandName === 'cleanconv' 
                ? (msg.author.id === user.id || msg.author.id === client.user.id)
                : msg.author.id === user.id;
            
            if (isTarget) messagesToDelete.push(msg);
        }
        
        messagesToDelete.splice(limit);

        let successCount = 0;
        for (const msg of messagesToDelete) {
            await selfDeleteMessage(msg);
            successCount++;
            await new Promise(resolve => setTimeout(resolve, 300));
        }

        const tempMsg = await message.channel.send(`Deleted ${successCount} messages for ${user.tag}.`);
        setTimeout(() => selfDeleteMessage(tempMsg), 5000);
    }

    if (commandName === 'userinfo') {
        await selfDeleteMessage(message);
        const user = message.mentions.users.first() || message.author;
        
        const infoText = `
**User Info for ${user.tag}**
ID: ${user.id}
Created: ${user.createdAt.toLocaleDateString()}
Bot: ${user.bot ? "Yes" : "No"}
Status: ${user.presence?.status || "Unknown"}
`;
        const tempMsg = await message.channel.send(infoText);
        setTimeout(() => selfDeleteMessage(tempMsg), 10000);
    }

    if (commandName === 'jtbz') {
        await selfDeleteMessage(message);
        await message.channel.send(" **Just Too Based!** ");
    }

    if (commandName === 'checkwebhook') {
        const webhookUrl = args[0];
        if (!webhookUrl) return message.channel.send("Provide a webhook URL.");

        await selfDeleteMessage(message);

        try {
            const response = await axios.get(webhookUrl);
            if (response.status === 200 && response.data.id) {
                const tempMsg = await message.channel.send(`Webhook: Valid | Name: ${response.data.name}`);
                setTimeout(() => selfDeleteMessage(tempMsg), 10000);
            }
        } catch {
            const tempMsg = await message.channel.send("Invalid webhook URL.");
            setTimeout(() => selfDeleteMessage(tempMsg), 10000);
        }
    }

    if (commandName === 'spamwebhook') {
        const [webhookUrl, webhookName, ...restArgs] = args;

        let amount = 5;
        let spamMessage = restArgs.join(' ');

        const lastArg = restArgs[restArgs.length - 1];
        if (lastArg && !isNaN(parseInt(lastArg))) {
            amount = parseInt(lastArg);
            spamMessage = restArgs.slice(0, -1).join(' ');
        }

        if (!webhookUrl || !webhookName || !spamMessage) {
            await selfDeleteMessage(message);
            const tempMsg = await message.channel.send("Usage: +spamwebhook <url> <name> <message> <amount?>");
            return setTimeout(() => selfDeleteMessage(tempMsg), 7000);
        }

        await selfDeleteMessage(message);

        if (amount > 10) amount = 10;

        let success = 0;
        for (let i = 0; i < amount; i++) {
            try {
                await axios.post(webhookUrl, {
                    content: spamMessage,
                    username: webhookName
                });
                success++;
                await new Promise(r => setTimeout(r, 1000));
            } catch {
                break;
            }
        }

        const tempMsg = await message.channel.send(`Sent ${success} webhook messages.`);
        setTimeout(() => selfDeleteMessage(tempMsg), 5000);
    }

    if (commandName === 'serverinfo') {
        await selfDeleteMessage(message);
        if (!message.guild) return message.channel.send("Server only.");

        const guild = message.guild;
        const roles = guild.roles.cache.filter(r => r.name !== '@everyone').size;

        const infoText = `
**Server Info — ${guild.name}**
Owner: <@${guild.ownerId}>
ID: ${guild.id}
Created: ${guild.createdAt.toLocaleDateString()}
Members: ${guild.memberCount}
Roles: ${roles}
Channels: ${guild.channels.cache.size}
Boost Level: ${guild.premiumTier}
`;
        const tempMsg = await message.channel.send(infoText);
        setTimeout(() => selfDeleteMessage(tempMsg), 10000);
    }

    if (commandName === 'joke') {
        await selfDeleteMessage(message);
        const jokes = [
            "Why don't scientists trust atoms? They make up everything!",
            "Why did the scarecrow win an award? He was outstanding in his field!",
            "What do you call a fake noodle? An impasta!",
            "How does a penguin build its house? Igloos it together!",
            "I told my wife she drew her eyebrows too high. She looked surprised."
        ];
        const joke = jokes[Math.floor(Math.random() * jokes.length)];
        const tempMsg = await message.channel.send(joke);
        setTimeout(() => selfDeleteMessage(tempMsg), 10000);
    }

    if (commandName === 'choose') {
        await selfDeleteMessage(message);
        if (args.length === 0) return message.channel.send("Give me options.");

        const options = args.join(' ').split(',').map(s => s.trim()).filter(Boolean);
        if (options.length === 0) return message.channel.send("Give me valid options.");

        const choice = options[Math.floor(Math.random() * options.length)];
        const tempMsg = await message.channel.send(`🎲 I choose: **${choice}**`);
        setTimeout(() => selfDeleteMessage(tempMsg), 10000);
    }

    if (commandName === 'account') {
        await selfDeleteMessage(message);
        const subCommand = args[0]?.toLowerCase();

        if (subCommand === 'status') {
            const statusType = args[1]?.toLowerCase();
            const allowed = ['online', 'idle', 'dnd', 'invisible'];

            if (!statusType || !allowed.includes(statusType)) {
                const tempMsg = await message.channel.send("Status must be: online, idle, dnd, invisible");
                return setTimeout(() => selfDeleteMessage(tempMsg), 5000);
            }

            try {
                client.user.setStatus(statusType);
                const tempMsg = await message.channel.send(`Status set to **${statusType}**.`);
                setTimeout(() => selfDeleteMessage(tempMsg), 5000);
            } catch (e) {
                const tempMsg = await message.channel.send("Failed to change status.");
                setTimeout(() => selfDeleteMessage(tempMsg), 5000);
            }
        }
    }
});

client.login(TOKEN).catch(err => {
    console.error("Invalid token or selfbot library issue.");
    console.error(err);
});
