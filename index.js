const { Client, GatewayIntentBits, EmbedBuilder, SlashCommandBuilder, Collection } = require('discord.js');
const { Sequelize, DataTypes } = require('sequelize');

// Environment variables (assuming Render environment handles them)
const TOKEN = process.env.TOKEN;
const GUILD_ID = process.env.GUILD_ID;

// Initialize Discord client
const client = new Client({ intents: [GatewayIntentBits.Guilds] });
client.commands = new Collection();

// Initialize database
const sequelize = new Sequelize({
  dialect: 'sqlite',
  storage: './database.sqlite',  // Persistent storage for the database
});

// Database models
const Tryout = sequelize.define('Tryout', {
  hostId: { type: DataTypes.STRING, allowNull: false },
  cohostId: DataTypes.STRING,
  gamelink: { type: DataTypes.STRING, allowNull: false },
  gamerules: { type: DataTypes.TEXT, allowNull: false },
  concludedTime: { type: DataTypes.DATE, allowNull: false }
});

const Wins = sequelize.define('Wins', {
  userId: { type: DataTypes.STRING, allowNull: false, unique: true },
  wins: { type: DataTypes.INTEGER, defaultValue: 0, validate: { min: 0 } }
});

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
    console.log('Executing /tryout command...');
    if (!hasPermission(interaction)) return interaction.reply({ content: 'You do not have permission to use this command.', ephemeral: true });

    const gamelink = interaction.options.getString('gamelink');
    const gamerules = interaction.options.getString('gamerules');
    const concludedTime = new Date(interaction.options.getString('concluded'));
    if (isNaN(concludedTime.getTime())) {
      console.log('Invalid date format received.');
      return interaction.reply({ content: 'Invalid date format. Please use YYYY-MM-DD HH:MM.', ephemeral: true });
    }

    const cohost = interaction.options.getUser('cohost');

    await Tryout.create({
      hostId: interaction.user.id,
      cohostId: cohost ? cohost.id : null,
      gamelink,
      gamerules,
      concludedTime
    });

    console.log(`Created new tryout session: Host - ${interaction.user.id}, Game Link - ${gamelink}`);

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
    console.log('Executing /add command...');
    if (!hasPermission(interaction)) return interaction.reply({ content: 'You do not have permission to use this command.', ephemeral: true });

    const number = interaction.options.getInteger('number');
    const user = interaction.options.getUser('user');
    const [record] = await Wins.findOrCreate({ where: { userId: user.id } });

    record.wins += number;
    await record.save();

    console.log(`Added ${number} wins to user ${user.id}. Total wins: ${record.wins}`);
    await interaction.reply({ content: `Added ${number} wins to <@${user.id}>.`, ephemeral: true });
  }
});

// Command: /unadd
client.commands.set('unadd', {
  data: new SlashCommandBuilder()
    .setName('unadd')
    .setDescription('Remove wins from a user')
    .addIntegerOption(option => option.setName('number').setDescription('Number of wins').setRequired(true))
    .addUserOption(option => option.setName('user').setDescription('User to remove wins from').setRequired(true)),

  async execute(interaction) {
    console.log('Executing /unadd command...');
    if (!hasPermission(interaction)) return interaction.reply({ content: 'You do not have permission to use this command.', ephemeral: true });

    const number = interaction.options.getInteger('number');
    const user = interaction.options.getUser('user');
    const record = await Wins.findOne({ where: { userId: user.id } });

    if (!record || record.wins < number) {
      console.log(`Attempted to remove ${number} wins from user ${user.id}, but insufficient wins.`);
      return interaction.reply({ content: `<@${user.id}> does not have enough wins to remove.`, ephemeral: true });
    }

    record.wins -= number;
    await record.save();

    console.log(`Removed ${number} wins from user ${user.id}. Remaining wins: ${record.wins}`);
    await interaction.reply({ content: `Removed ${number} wins from <@${user.id}>.`, ephemeral: true });
  }
});

// Command: /leaderboard
client.commands.set('leaderboard', {
  data: new SlashCommandBuilder()
    .setName('leaderboard')
    .setDescription('Show the leaderboard for wins'),

  async execute(interaction) {
    console.log('Executing /leaderboard command...');
    const topUsers = await Wins.findAll({ order: [['wins', 'DESC']], limit: 10 });
    const embed = new EmbedBuilder().setTitle('🏆 Wins Leaderboard').setColor('Gold');

    topUsers.forEach((user, index) => {
      embed.addFields({ name: `${index + 1}. <@${user.userId}>`, value: `${user.wins} wins` });
    });

    console.log(`Displayed leaderboard with top ${topUsers.length} users.`);
    await interaction.reply({ embeds: [embed] });
  }
});

// Periodic cleanup for concluded tryouts
setInterval(async () => {
  console.log('Running periodic cleanup for concluded tryouts...');
  const now = new Date();
  const concludedTryouts = await Tryout.findAll({ where: { concludedTime: { [Sequelize.Op.lte]: now } } });

  for (const tryout of concludedTryouts) {
    await Tryout.update({ gamelink: 'Concluded' }, { where: { id: tryout.id } });
    console.log(`Updated tryout session to concluded: ID ${tryout.id}`);
  }
}, 60 * 1000);  // Check every minute

client.once('ready', () => {
  console.log(`Bot is ready as ${client.user.tag}`);
  sequelize.sync();  // Initialize the database
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
