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
    .addStringOption(option => option.setName('concluded').setDescription('Concluded time (YYYY-MM-DD HH:MM)').setRequired(true))
    .addUserOption(option => option.setName('cohost').setDescription('Optional cohost')),

  async execute(interaction) {
    if (!hasPermission(interaction)) return interaction.reply({ content: 'You do not have permission to use this command.', ephemeral: true });

    const gamelink = interaction.options.getString('gamelink');
    const gamerules = interaction.options.getString('gamerules');
    const concludedTime = new Date(interaction.options.getString('concluded'));
    if (isNaN(concludedTime.getTime())) {
      return interaction.reply({ content: 'Invalid date format. Please use YYYY-MM-DD HH:MM.', ephemeral: true });
    }

    const cohost = interaction.options.getUser('cohost');

    const embed = new EmbedBuilder()
      .setTitle('🎮 Tryout Session')
      .setThumbnail(interaction.user.displayAvatarURL())
      .addFields(
        { name: 'Host', value: `<@${interaction.user.id}>`, inline: true },
        { name: 'Cohost', value: cohost ? `<@${cohost.id}>` : 'None', inline: true },
        { name: 'Game Link', value: gamelink },
        { name: 'Game Rules', value: gamerules },
        { name: 'Concludes At', value: concludedTime.toISOString() }
      )
      .setColor('Green');

    await interaction.reply({ embeds: [embed] });
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

  // Register commands with Discord API (this can be done on bot start)
  const { REST, Routes } = require('discord.js');
  const rest = new REST({ version: '10' }).setToken(TOKEN);

  const commands = client.commands.map(command => command.data.toJSON());

  try {
    console.log('Started refreshing application (/) commands.');

    if (!CLIENT_ID || !GUILD_ID) {
      console.error('CLIENT_ID or GUILD_ID is missing!');
      return;
    }

    await rest.put(Routes.applicationGuildCommands(CLIENT_ID, GUILD_ID), { body: commands });

    console.log('Successfully reloaded application (/) commands.');
  } catch (error) {
    console.error('Error reloading commands:', error);
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
