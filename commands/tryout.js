const { SlashCommandBuilder } = require('discord.js');
const db = require('../database/db');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('tryout')
    .setDescription('Create a tryout event')
    .addStringOption(option => option.setName('host').setDescription('Host of the tryout').setRequired(true))
    .addStringOption(option => option.setName('cohost').setDescription('Cohost of the tryout').setRequired(false))
    .addStringOption(option => option.setName('gamelink').setDescription('Link to the game'))
    .addStringOption(option => option.setName('gamerules').setDescription('Rules of the game'))
    .addIntegerOption(option => option.setName('concluded_time').setDescription('Time when the event will be concluded')),

  async execute(interaction) {
    const host = interaction.options.getString('host');
    const cohost = interaction.options.getString('cohost');
    const gamelink = interaction.options.getString('gamelink');
    const gamerules = interaction.options.getString('gamerules');
    const concluded_time = interaction.options.getInteger('concluded_time');

    // Save tryout details in the database
    const tryout_id = `${interaction.guild.id}-${Date.now()}`;
    await db.run('INSERT INTO tryouts (tryout_id, host_id, cohost_id, gamelink, gamerules, concluded_time) VALUES (?, ?, ?, ?, ?, ?)', [
      tryout_id, host, cohost || 'None', gamelink || 'None', gamerules || 'None', concluded_time
    ]);

    const embed = {
      title: 'Tryout Event',
      description: `Host: ${host}\nCohost: ${cohost}\nGame Link: ${gamelink}\nGame Rules: ${gamerules}`,
      footer: { text: 'Concluded at ' + new Date(concluded_time).toLocaleString() }
    };

    await interaction.reply({ embeds: [embed] });
  }
};
