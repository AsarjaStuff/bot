const { Client, GatewayIntentBits, EmbedBuilder, SlashCommandBuilder, Collection, ButtonBuilder, ButtonStyle, ActionRowBuilder } = require('discord.js');

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

let playerCount = 0;  // To track player clicks

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

    const cohost = interaction.options.getUser('cohost');

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
    const concludedMinutes = parseInt(concludedInput.match(/\d+/)[0]);
    if (isNaN(concludedMinutes)) {
      return interaction.reply({ content: 'Invalid concluded time format. Please use a valid number of minutes (e.g. "3 minutes").', ephemeral: true });
    }
    
    const cohost = interaction.options.getUser('cohost');
    let playerCount = 0;  // Track player clicks

    // Create buttons for "Join Game" and "Conclude"
    const joinGameButton = new ButtonBuilder()
      .setCustomId('join_game')
      .setLabel('Join Game')
      .setStyle(ButtonStyle.Link)
      .setURL(gamelink);

    const concludedButton = new ButtonBuilder()
      .setCustomId('concluded')
      .setLabel('Conclude')
      .setStyle(ButtonStyle.Primary);

    const row = new ActionRowBuilder().addComponents(joinGameButton, concludedButton);

    const embed = new EmbedBuilder()
      .setTitle('🎮 Tryout Session')
      .setThumbnail(interaction.user.displayAvatarURL())
      .addFields(
        { name: 'Host', value: `<@${interaction.user.id}>`, inline: true },
        { name: 'Cohost', value: cohost ? `<@${cohost.id}>` : 'None', inline: true },
        { name: 'Game Rules', value: `\`\`\`${gamerules}\`\`\`` },
        { name: 'Concludes In', value: `${concludedMinutes} minute(s)` }
      )
      .setColor('#000000')
      .setFooter({ text: 'Estimated Players: 0' });

    const message = await interaction.reply({ embeds: [embed], components: [row], fetchReply: true });

    const filter = i => i.customId === 'concluded';
    const collector = message.createMessageComponentCollector({ filter, time: concludedMinutes * 60000 });

    message.createMessageComponentCollector({
      filter: i => i.customId === 'join_game',
      time: concludedMinutes * 60000
    }).on('collect', async i => {
      playerCount++;
      const updatedEmbed = EmbedBuilder.from(embed).setFooter({ text: `Estimated Players: ${playerCount}` });
      await i.update({ embeds: [updatedEmbed], components: [row] });
    });

    collector.on('collect', async i => {
      const disabledRow = new ActionRowBuilder().addComponents(concludedButton.setDisabled(true));
      await i.update({ content: 'Tryout has concluded!', components: [disabledRow] });
      collector.stop();
    });

    collector.on('end', () => console.log('Tryout concluded.'));
  }
});


    collector.on('end', () => {
      console.log('Collector ended');
    });
  }
});

client.once('ready', async () => {
  console.log(`Bot is ready as ${client.user.tag}`);
  const { REST, Routes } = require('discord.js');
  const rest = new REST({ version: '10' }).setToken(TOKEN);

  try {
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
    await command.execute(interaction);
  } catch (error) {
    console.error(`Error executing command ${interaction.commandName}:`, error);
    await interaction.reply({ content: 'There was an error executing that command.', ephemeral: true });
  }
});

client.login(TOKEN);
