const { Client, GatewayIntentBits, SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const { Tryout, Wins, sequelize } = require('./db'); // Now importing from db.js (Sequelize models)
require('dotenv').config();

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

    // Create and save tryout details using Sequelize
    const tryout = await Tryout.create({
      hostId: host,
      cohostId: cohost || 'None',
      gamelink: gamelink || 'None',
      gamerules: gamerules || 'None',
      concludedTime: concluded_time ? new Date(concluded_time) : null,
      concluded: false,
    });

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
    
    // Add wins using Sequelize
    const userWins = await Wins.findOne({ where: { userId: user.id } });

    if (userWins) {
      userWins.wins += wins;
      await userWins.save();
    } else {
      await Wins.create({ userId: user.id, wins });
    }

    await interaction.reply(`${wins} wins added to ${user.username}.`);
  }

  if (commandName === 'unadd') {
    const wins = interaction.options.getInteger('wins');
    const user = interaction.options.getUser('user');
    
    // Subtract wins using Sequelize
    const userWins = await Wins.findOne({ where: { userId: user.id } });

    if (userWins) {
      userWins.wins -= wins;
      await userWins.save();
    } else {
      await Wins.create({ userId: user.id, wins: -wins });
    }

    await interaction.reply(`${wins} wins removed from ${user.username}.`);
  }

  if (commandName === 'leaderboard') {
    // Fetch leaderboard with Sequelize
    const topUsers = await Wins.findAll({ order: [['wins', 'DESC']], limit: 10 });
    
    const embed = new EmbedBuilder().setTitle('Leaderboard');
    topUsers.forEach((user, index) => {
      embed.addFields({ name: `${index + 1}. ${user.userId}`, value: `Wins: ${user.wins}` });
    });

    interaction.reply({ embeds: [embed] });
  }

  if (commandName === 'view') {
    const user = interaction.options.getUser('user');
    const userWins = await Wins.findOne({ where: { userId: user.id } });

    if (!userWins) {
      return interaction.reply('This user has no wins recorded.');
    }

    interaction.reply(`${user.username} has ${userWins.wins} wins.`);
  }
});

client.login(process.env.DISCORD_TOKEN);
