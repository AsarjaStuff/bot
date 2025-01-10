const { Client, GatewayIntentBits, EmbedBuilder, SlashCommandBuilder, Collection, ButtonBuilder, ButtonStyle, ActionRowBuilder } = require('discord.js');
const { REST, Routes } = require('discord.js');  // Importing REST and Routes for command registration
const deleteCommands = require('./deleteCommands');  // Import the function to delete old commands

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

// Define commands
client.commands.set('tryout', {
  data: new SlashCommandBuilder()
    .setName('tryout')
    .setDescription('Create a tryout session')
    .addStringOption(option => option.setName('gamelink').setDescription('Game link').setRequired(true))
    .addStringOption(option => option.setName('gamerules').setDescription('Game rules').setRequired(true))
    .addStringOption(option => option.setName('concluded').setDescription('Concluded time (e.g. "3 minutes")').setRequired(true))
    .addUserOption(option => option.setName('cohost').setDescription('Optional cohost')),

  async execute(interaction) {
    if (!hasPermission(interaction)) {
      return interaction.reply({ content: 'You do not have permission to use this command.', ephemeral: true });
    }

    const gamelink = interaction.options.getString('gamelink');
    const gamerules = interaction.options.getString('gamerules');
    const concludedInput = interaction.options.getString('concluded');
    const concludedMinutes = parseInt(concludedInput.match(/\d+/)[0]);

    if (isNaN(concludedMinutes)) {
      return interaction.reply({ content: 'Invalid concluded time format. Please use a valid number of minutes (e.g. "3 minutes").', ephemeral: true });
    }

    const concludedTime = new Date(Date.now() + concludedMinutes * 60000);
    const cohost = interaction.options.getUser('cohost');

    const gameLinkButton = new ButtonBuilder()
      .setLabel('Game Link')
      .setStyle(ButtonStyle.Link)
      .setURL(gamelink);

    const concludedButton = new ButtonBuilder()
      .setCustomId('concluded')
      .setLabel('Conclude')
      .setStyle(ButtonStyle.Primary);

    const row = new ActionRowBuilder().addComponents(gameLinkButton, concludedButton);

    const embed = new EmbedBuilder()
      .setTitle('🎮 Tryout Session')
      .setThumbnail(interaction.user.displayAvatarURL())
      .addFields(
        { name: 'Host', value: `<@${interaction.user.id}>`, inline: true },
        { name: 'Cohost', value: cohost ? `<@${cohost.id}>` : 'None', inline: true },
        { name: 'Game Rules', value: `\`\`\`${gamerules}\`\`\`` },
        { name: 'Concludes At', value: `\`\`\`${concludedTime.toISOString()}\`\`\`` },
      )
      .setColor('#000000');

    const message = await interaction.reply({ embeds: [embed], components: [row], fetchReply: true });
    const filter = i => i.user.id === interaction.user.id;

    try {
      const collected = await message.awaitMessageComponent({ filter, time: concludedMinutes * 60000 });
      if (collected.customId === 'concluded') {
        const updatedRow = new ActionRowBuilder().addComponents(concludedButton.setDisabled(true));
        await collected.update({ content: 'Tryout has concluded!', components: [updatedRow] });
      }
    } catch (error) {
      console.error('Error collecting button interaction:', error);
      await interaction.editReply({ content: 'Timeout: No response received in time.', components: [] });
    }
  }
});

// Additional command definitions
client.commands.set('add', {
  data: new SlashCommandBuilder()
    .setName('add')
    .setDescription('Add wins to a user')
    .addIntegerOption(option => option.setName('number').setDescription('Number of wins').setRequired(true))
    .addUserOption(option => option.setName('user').setDescription('User to add wins to').setRequired(true)),

  async execute(interaction) {
    if (!hasPermission(interaction)) {
      return interaction.reply({ content: 'You do not have permission to use this command.', ephemeral: true });
    }

    const number = interaction.options.getInteger('number');
    const user = interaction.options.getUser('user');
    console.log(`Added ${number} wins to user ${user.id}.`);
    await interaction.reply({ content: `Added ${number} wins to <@${user.id}>.`, ephemeral: true });
  }
});

client.once('ready', async () => {
  console.log(`Bot is ready as ${client.user.tag}`);

  try {
    await deleteCommands();  // Deleting old commands
    console.log('Started refreshing application (/) commands.');

    if (!CLIENT_ID || !GUILD_ID) {
      console.error('CLIENT_ID or GUILD_ID is missing!');
      return;
    }

    const rest = new REST({ version: '10' }).setToken(TOKEN);
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
