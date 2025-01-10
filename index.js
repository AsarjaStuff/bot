const { Client, GatewayIntentBits, SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const fs = require('fs');
const path = require('path');
const db = require('./db'); // Database handler

const client = new Client({
  intents: [GatewayIntentBits.Guilds],
});

client.commands = new Map();

// Create the slash commands
client.on('ready', async () => {
  console.log(`Bot is ready as ${client.user.tag}`);

  // Register slash commands
  const commands = [
    new SlashCommandBuilder()
      .setName('tryout')
      .setDescription('Create a tryout event')
      .addStringOption(option => option.setName('host').setDescription('Host of the tryout').setRequired(true))
      .addStringOption(option => option.setName('cohost').setDescription('Cohost of the tryout').setRequired(false))
      .addStringOption(option => option.setName('gamelink').setDescription('Link to the game'))
      .addStringOption(option => option.setName('gamerules').setDescription('Rules of the game'))
      .addIntegerOption(option => option.setName('concluded_time').setDescription('Time when the event will be concluded')),

    new SlashCommandBuilder()
      .setName('add')
      .setDescription('Add number of wins to a user')
      .addIntegerOption(option => option.setName('wins').setDescription('Number of wins to add').setRequired(true))
      .addUserOption(option => option.setName('user').setDescription('User to add wins to').setRequired(true)),

    new SlashCommandBuilder()
      .setName('unadd')
      .setDescription('Remove number of wins from a user')
      .addIntegerOption(option => option.setName('wins').setDescription('Number of wins to remove').setRequired(true))
      .addUserOption(option => option.setName('user').setDescription('User to remove wins from').setRequired(true)),

    new SlashCommandBuilder()
      .setName('leaderboard')
      .setDescription('Displays the leaderboard of users with the most wins'),

    new SlashCommandBuilder()
      .setName('view')
      .setDescription('View the number of wins a user has')
      .addUserOption(option => option.setName('user').setDescription('User to view wins for').setRequired(true)),
  ];

  // Register commands for specific guild
  await client.guilds.cache.get('YOUR_GUILD_ID').commands.set(commands);
  console.log('Commands Registered!');
});

// Handle interactions
client.on('interactionCreate', async interaction => {
  if (!interaction.isCommand()) return;

  // Permission check: Only users with the roleID "1324028819103023174" can run these commands
  if (!interaction.member.roles.cache.has('1324028819103023174')) {
    return interaction.reply({ content: 'You do not have permission to use this command.', ephemeral: true });
  }

  const { commandName } = interaction;

  if (commandName === 'tryout') {
    const host = interaction.options.getString('host');
    const cohost = interaction.options.getString('cohost');
    const gamelink = interaction.options.getString('gamelink');
    const gamerules = interaction.options.getString('gamerules');
    const concluded_time = interaction.options.getInteger('concluded_time');

    // Save tryout details in database
    const tryout_id = `${interaction.guild.id}-${Date.now()}`;
    db.run('INSERT INTO tryouts (tryout_id, host_id, cohost_id, gamelink, gamerules, concluded_time) VALUES (?, ?, ?, ?, ?, ?)', [
      tryout_id, host, cohost || 'None', gamelink || 'None', gamerules || 'None', concluded_time
    ]);

    // Send the embed message
    const embed = new EmbedBuilder()
      .setTitle('Tryout Event')
      .setDescription(`Host: ${host}\nCohost: ${cohost}\nGame Link: ${gamelink}\nGame Rules: ${gamerules}`)
      .setFooter({ text: 'Concluded at ' + new Date(concluded_time).toLocaleString() });

    await interaction.reply({ embeds: [embed] });
  }

  if (commandName === 'add') {
    const wins = interaction.options.getInteger('wins');
    const user = interaction.options.getUser('user');
    
    db.run('INSERT OR REPLACE INTO users (user_id, wins) VALUES (?, COALESCE((SELECT wins FROM users WHERE user_id = ?), 0) + ?)', [
      user.id, user.id, wins
    ]);

    await interaction.reply(`${wins} wins added to ${user.username}.`);
  }

  if (commandName === 'unadd') {
    const wins = interaction.options.getInteger('wins');
    const user = interaction.options.getUser('user');
    
    db.run('INSERT OR REPLACE INTO users (user_id, wins) VALUES (?, COALESCE((SELECT wins FROM users WHERE user_id = ?), 0) - ?)', [
      user.id, user.id, wins
    ]);

    await interaction.reply(`${wins} wins removed from ${user.username}.`);
  }

  if (commandName === 'leaderboard') {
    db.all('SELECT user_id, wins FROM users ORDER BY wins DESC LIMIT 10', [], (err, rows) => {
      if (err) {
        console.error(err);
        return interaction.reply('Error fetching leaderboard.');
      }

      const embed = new EmbedBuilder().setTitle('Leaderboard');
      rows.forEach((row, index) => {
        embed.addFields({ name: `${index + 1}. ${row.user_id}`, value: `Wins: ${row.wins}` });
      });

      interaction.reply({ embeds: [embed] });
    });
  }

  if (commandName === 'view') {
    const user = interaction.options.getUser('user');
    db.get('SELECT wins FROM users WHERE user_id = ?', [user.id], (err, row) => {
      if (err || !row) {
        return interaction.reply('This user has no wins recorded.');
      }

      interaction.reply(`${user.username} has ${row.wins} wins.`);
    });
  }
});

client.login(process.env.DISCORD_TOKEN);
