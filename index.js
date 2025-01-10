const { Client, GatewayIntentBits, EmbedBuilder, SlashCommandBuilder, Collection } = require('discord.js');

// Environment variables
const TOKEN = process.env.TOKEN;
const GUILD_ID = process.env.GUILD_ID;
const CLIENT_ID = process.env.CLIENT_ID;

// Initialize Discord client
const client = new Client({ intents: [GatewayIntentBits.Guilds] });
client.commands = new Collection();

// Helper function to check role permissions
function hasPermission(interaction) {
  return interaction.member.roles.cache.has('1324028819103023174');
}

// Command: /tryout
client.commands.set('tryout', {
  data: new SlashCommandBuilder()
    .setName('tryout')
    .setDescription('Create a tryout session')
    .addStringOption(option => option.setName('gamelink').setDescription('Game link').setRequired(true))
    .addStringOption(option => option.setName('gamerules').setDescription('Game rules').setRequired(true))
    .addStringOption(option => option.setName('concluded').setDescription('Concluded time (e.g. "3 minutes")').setRequired(true))
    .addUserOption(option => option.setName('cohost').setDescription('Optional cohost')),

  async execute(interaction) {
    if (!hasPermission(interaction)) return interaction.reply({ content: 'You do not have permission to use this command.', ephemeral: true });

    const gamelink = interaction.options.getString('gamelink');
    const gamerules = interaction.options.getString('gamerules');
    const concludedInput = interaction.options.getString('concluded');
    
    // Parse concluded time in minutes
    const concludedMinutes = parseInt(concludedInput.match(/\d+/)[0]);
    if (isNaN(concludedMinutes)) {
      return interaction.reply({ content: 'Invalid concluded time format. Please use a valid number of minutes (e.g. "3 minutes").', ephemeral: true });
    }

    const concludedTime = new Date(Date.now() + concludedMinutes * 60000); // Adding the concluded time in minutes

    const cohost = interaction.options.getUser('cohost');

    const embed = new EmbedBuilder()
      .setTitle('🎮 Tryout Session')
      .setThumbnail(interaction.user.displayAvatarURL())
      .addFields(
        { name: 'Host', value: `<@${interaction.user.id}>`, inline: true },
        { name: 'Cohost', value: cohost ? `<@${cohost.id}>` : 'None', inline: true },
        { name: 'Game Link', value: `\`\`\`${gamelink}\`\`\`` }, // Code block formatting
        { name: 'Game Rules', value: `\`\`\`${gamerules}\`\`\`` }, // Code block formatting
        { name: 'Concludes At', value: `\`\`\`${concludedTime.toISOString()}\`\`\`` }, // Code block formatting
      )
      .setColor('Green');

    const message = await interaction.reply({ embeds: [embed], fetchReply: true });

    // Start real-time countdown for the concluded time
    const interval = setInterval(async () => {
      const remainingTime = concludedTime - Date.now();
      if (remainingTime <= 0) {
        clearInterval(interval); // Stop the interval once time is up
        return;
      }

      // Calculate remaining minutes and seconds
      const minutesLeft = Math.floor(remainingTime / 60000);
      const secondsLeft = Math.floor((remainingTime % 60000) / 1000);
      const timeString = `${minutesLeft} minutes ${secondsLeft} seconds`;

      // Update the embed with real-time countdown
      const updatedEmbed = new EmbedBuilder(embed)
        .setTitle('🎮 Tryout Session')
        .setThumbnail(interaction.user.displayAvatarURL())
        .addFields(
          { name: 'Host', value: `<@${interaction.user.id}>`, inline: true },
          { name: 'Cohost', value: cohost ? `<@${cohost.id}>` : 'None', inline: true },
          { name: 'Game Link', value: `\`\`\`${gamelink}\`\`\`` }, // Code block formatting
          { name: 'Game Rules', value: `\`\`\`${gamerules}\`\`\`` }, // Code block formatting
          { name: 'Concludes At', value: `\`\`\`${timeString}\`\`\`` }, // Updated countdown time
        )
        .setColor('Green');

      // Edit the message to update the countdown
      await message.edit({ embeds: [updatedEmbed] });
    }, 1000); // Update every second
  }
});

// Command: /add
client.commands.set('add', {
  data: new SlashCommandBuilder()
    .setName('add')
    .setDescription('Add wins to a user')
    .addIntegerOption(option => option.setName('number').setDescription('Number of wins').setRequired(true))
    .addUserOption(option => option.setName('user').setDescription('User to add wins to').setRequired(true)),

  async execute(interaction) {
    if (!hasPermission(interaction)) return interaction.reply({ content: 'You do not have permission to use this command.', ephemeral: true });

    const number = interaction.options.getInteger('number');
    const user = interaction.options.getUser('user');

    // Here, we will simulate the process without database
    console.log(`Added ${number} wins to user ${user.id}.`);

    await interaction.reply({ content: `Added ${number} wins to <@${user.id}>.`, ephemeral: true });
  }
});

// Command: /leaderboard
client.commands.set('leaderboard', {
  data: new SlashCommandBuilder()
    .setName('leaderboard')
    .setDescription('Show the leaderboard for wins'),

  async execute(interaction) {
    // For now, we simulate an empty leaderboard
    const embed = new EmbedBuilder()
      .setTitle('🏆 Wins Leaderboard')
      .setColor('Gold')
      .setDescription('Leaderboard is empty for now.');

    await interaction.reply({ embeds: [embed] });
  }
});

client.once('ready', async () => {
  console.log(`Bot is ready as ${client.user.tag}`);

  const { REST, Routes } = require('discord.js');
  const rest = new REST({ version: '10' }).setToken(TOKEN);

  try {
    console.log('Started refreshing application (/) commands.');

    if (!CLIENT_ID || !GUILD_ID) {
      console.error('CLIENT_ID or GUILD_ID is missing!');
      return;
    }

    // Fetch existing commands and delete old ones
    const commands = await rest.get(Routes.applicationGuildCommands(CLIENT_ID, GUILD_ID));

    // Delete all old commands
    for (const command of commands) {
      await rest.delete(Routes.applicationGuildCommand(CLIENT_ID, GUILD_ID, command.id));
      console.log(`Deleted command: ${command.name}`);
    }

    // Register new commands
    const newCommands = client.commands.map(command => command.data.toJSON());
    await rest.put(Routes.applicationGuildCommands(CLIENT_ID, GUILD_ID), { body: newCommands });

    console.log('Successfully reloaded application (/) commands.');
  } catch (error) {
    console.error('Error refreshing commands:', error);
  }
});

client.on('interactionCreate', async interaction => {
  if (!interaction.isCommand()) return;
  const command = client.commands.get(interaction.commandName);
  if (!command) return;

  try {
    console.log(`Executing command: ${interaction.commandName}`);
    await command.execute(interaction);
  } catch (error) {
    console.error(`Error executing command ${interaction.commandName}:`, error);
    await interaction.reply({ content: 'There was an error executing that command.', ephemeral: true });
  }
});

client.login(TOKEN);
