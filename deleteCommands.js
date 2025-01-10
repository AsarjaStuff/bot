const { REST, Routes } = require('discord.js');
const { CLIENT_ID, GUILD_ID, TOKEN } = process.env;

const rest = new REST({ version: '10' }).setToken(TOKEN);

const commandIds = [
  '1327240868071215135',
  '1241613059194359860',
  '1251251326818451619',
  '1241380865842479255',
  '1251251326042640424',
  '1241380865842479257',
  '1241613057877213246',
  '1241380865842479256'
];

async function deleteCommands() {
  try {
    for (const commandId of commandIds) {
      await rest.delete(Routes.applicationGuildCommand(CLIENT_ID, GUILD_ID, commandId));
      console.log(`Successfully deleted command with ID: ${commandId}`);
    }
  } catch (error) {
    console.error('Error deleting commands:', error);
  }
}

module.exports = deleteCommands;
