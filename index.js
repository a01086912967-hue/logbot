const { Client, GatewayIntentBits, Partials, REST, Routes, SlashCommandBuilder, EmbedBuilder } = require('discord.js');

const client = new Client({ 
    intents: [
        GatewayIntentBits.Guilds, 
        GatewayIntentBits.GuildMessages, 
        GatewayIntentBits.MessageContent, 
        GatewayIntentBits.GuildMessageReactions
    ],
    partials: [Partials.Message, Partials.Channel, Partials.Reaction] 
});

let logChannelId = null;

// 1. 슬래시 명령어 설정
const commands = [
    new SlashCommandBuilder()
        .setName('반응로그')
        .setDescription('반응 로그를 받을 채널을 설정합니다.')
        .addChannelOption(option => option.setName('채널').setDescription('로그를 받을 채널').setRequired(true)),
    new SlashCommandBuilder()
        .setName('로그정지')
        .setDescription('반응 로그 기능을 중단합니다.')
].map(command => command.toJSON());

const rest = new REST({ version: '10' }).setToken(process.env.TOKEN);

(async () => {
    try {
        await rest.put(Routes.applicationCommands(process.env.APP_ID), { body: commands });
        console.log('슬래시 명령어(반응로그, 로그정지) 등록 완료!');
    } catch (error) { console.error('명령어 등록 실패:', error); }
})();

client.once('ready', () => {
    console.log(`${client.user.tag} 봇이 온라인 상태입니다!`);
});

// 2. 명령어 처리
client.on('interactionCreate', async interaction => {
    if (!interaction.isChatInputCommand()) return;

    if (interaction.commandName === '반응로그') {
        const channel = interaction.options.getChannel('채널');
        logChannelId = channel.id;
        await interaction.reply(`✅ 반응 로그 채널이 ${channel}로 설정되었습니다.`);
    } 
    else if (interaction.commandName === '로그정지') {
        logChannelId = null;
        await interaction.reply('🚫 반응 로그 기능이 정지되었습니다.');
    }
});

const getEmojiUrl = (reaction) => {
    return reaction.emoji.id 
        ? `https://cdn.discordapp.com/emojis/${reaction.emoji.id}.${reaction.emoji.animated ? 'gif' : 'png'}` 
        : null;
};

// 3. 반응 추가 로그
client.on('messageReactionAdd', async (reaction, user) => {
    try {
        if (user.bot) return;
        if (reaction.partial) await reaction.fetch();
        if (reaction.message.partial) await reaction.message.fetch(); // 메시지 정보 불러오기
        if (!logChannelId) return;
        
        const channel = await client.channels.fetch(logChannelId).catch(() => null);
        if (!channel) return;

        const emojiUrl = getEmojiUrl(reaction);
        const addEmbed = new EmbedBuilder()
            .setColor(0x00FF00)
            .setTitle('🟢 반응 남김')
            .setThumbnail(emojiUrl)
            .addFields(
                { name: '유저', value: user.tag, inline: true },
                { name: '채널', value: reaction.message.channel.toString(), inline: true },
                { name: '메시지 이동', value: `[바로가기](${reaction.message.url})`, inline: true },
                { name: '내용', value: `${user.tag}님이 ${reaction.emoji.name} 반응을 남겼습니다.` }
            )
            .setTimestamp();

        await channel.send({ embeds: [addEmbed] });
    } catch (err) { console.error('반응 추가 로그 전송 실패:', err); }
});

// 4. 반응 삭제 로그
client.on('messageReactionRemove', async (reaction, user) => {
    try {
        if (user.bot) return;
        if (reaction.partial) await reaction.fetch();
        if (reaction.message.partial) await reaction.message.fetch(); // 메시지 정보 불러오기
        if (!logChannelId) return;
        
        const channel = await client.channels.fetch(logChannelId).catch(() => null);
        if (!channel) return;

        const emojiUrl = getEmojiUrl(reaction);
        const removeEmbed = new EmbedBuilder()
            .setColor(0xFF0000)
            .setTitle('🔴 반응 삭제')
            .setThumbnail(emojiUrl)
            .addFields(
                { name: '유저', value: user.tag, inline: true },
                { name: '채널', value: reaction.message.channel.toString(), inline: true },
                { name: '메시지 이동', value: `[바로가기](${reaction.message.url})`, inline: true },
                { name: '내용', value: `${user.tag}님이 남긴 반응 ‘${reaction.emoji.name}’을(를) 삭제했습니다.` }
            )
            .setTimestamp();

        await channel.send({ embeds: [removeEmbed] });
    } catch (err) { console.error('반응 삭제 로그 전송 실패:', err); }
});

client.login(process.env.TOKEN);
