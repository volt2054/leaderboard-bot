const { EmbedBuilder } = require('discord.js');
const { Client, GatewayIntentBits } = require('discord.js');
const fs = require('fs');
const { start } = require('repl');

require('dotenv').config();

const client = new Client({
    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.MessageContent,
        GatewayIntentBits.GuildMembers,
        GatewayIntentBits.GuildVoiceStates,
    ]
});

const startDate = Date.now();


client.on('ready', () => {
    console.log(`Logged in as ${client.user.tag}!`);
});

function formatTime(milliseconds) {
    const totalSeconds = Math.floor(milliseconds / 1000);
    const hours = Math.floor(totalSeconds / 3600);
    const minutes = Math.floor((totalSeconds % 3600) / 60);
    const seconds = totalSeconds % 60;

    const formattedTime = `${pad(hours)}:${pad(minutes)}:${pad(seconds)}`;
    return formattedTime;
}

function pad(number) {
    return String(number).padStart(2, '0');
}

// Function to save the map to a file
function saveDataToFile(data, filePath) {
    const jsonData = JSON.stringify([...data]); // Convert the map to JSON
    fs.writeFileSync(filePath, jsonData); // Write the JSON data to the file
}

// Function to load data from the file
function loadDataFromFile(filePath) {
    try {
        const jsonData = fs.readFileSync(filePath, 'utf-8'); // Read the file
        const data = new Map(JSON.parse(jsonData)); // Parse the JSON and create a map
        return data;
    } catch (error) {
        // Handle file read errors or invalid JSON
        console.error('Error loading data from file:', error);
        return new Map();
    }
}

const saveFilePath = 'data.json';
let voiceChannelTime = loadDataFromFile(saveFilePath); // Load the data from the file

// Save the data every 5 minutes
setInterval(() => {
    saveDataToFile(voiceChannelTime, saveFilePath);
}, 1 * 20 * 1000); // 5 minutes * 60 seconds * 1000 milliseconds

const voiceChannelTempTime = new Map();

client.on('voiceStateUpdate', (oldState, newState) => {
    const userId = newState.member.id;
    const oldChannel = oldState.channel;
    const newChannel = newState.channel;

    if (!oldChannel && newChannel) {
        // User joined a voice channel
        voiceChannelTempTime.set(userId, Date.now());

        if (!voiceChannelTime.has(userId)) {
            voiceChannelTime.set(userId, 0)
        }

    } else if (oldChannel && !newChannel) {
        // User left a voice channel
        const currentTime = Date.now();
        let startTime = voiceChannelTempTime.get(userId);

        let time = voiceChannelTime.get(userId)


        if (startTime == undefined) {
            startTime = startDate;
        }
        if (time == undefined) {
            time = 0;
        }

        const elapsedTime = currentTime - startTime;
        console.log(elapsedTime)


        voiceChannelTime.set(userId, time + elapsedTime);

        // Update the user's total voice channel time

        voiceChannelTempTime.set(userId, 0);
    }
});

// Function to sort the map by value (total time)
function sortMapByValue(map) {
    const sortedEntries = [...map.entries()].sort((a, b) => b[1] - a[1]);
    return new Map(sortedEntries);
}

// Command to display the leaderboard
client.on('messageCreate', (message) => {
    if (message.content === '!leaderboard' && !message.author.bot) {

        const sortedLeaderboard = sortMapByValue(voiceChannelTime);

        let leaderboardMessage = 'Leaderboard:\n';
        let position = 1;

        const embed = new EmbedBuilder()
        .setTitle('Voice Channel Leaderboard')
        .setColor('#00ff00');

        let count = 0;

        sortedLeaderboard.forEach((totalTime, userId) => {
            count++;
            if (count <= 25) {
                const member = message.guild.members.cache.get(userId);
                if (member) {
                  const username = member.user.username;
                  const formattedTime = formatTime(totalTime)
                  embed.addFields({name: '\u200B', value:`${position}. ${username}: ${formattedTime}`});
                  position++;
                }
            }
          });

        message.channel.send( {embeds: [embed] });
    }
});
 

client.login(process.env.TOKEN);
