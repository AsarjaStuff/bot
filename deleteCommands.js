const { REST, Routes } = require('discord.js');
const { CLIENT_ID, GUILD_ID, TOKEN } = process.env;

// Initialize REST API client
const rest = new REST({ version: '10' }).setToken(TOKEN);

// Array of the 9 command IDs you want to delete
const commandIds = [
  '1327240868071215135', // Replace with actual command ID 1
  '1241613059194359860', // Replace with actual command ID 2
  '1251251326818451619', // Replace with actual command ID 3
  '1241380865842479255', // Replace with actual command ID 4
  '1251251326042640424', // Replace with actual command ID 5
  '1241380865842479257', // Replace with actual command ID 6
  '1241613057877213246', // Replace with actual command ID 7
  '1241380865842479256'  // Replace with actual command ID 9
];

// Function to delete multiple commands
async function deleteCommands() {
  try {
    for (let commandId of commandIds) {
      // Delete command by ID
      await rest.delete(Routes.applicationGuildCommand(CLIENT_ID, GUILD_ID, commandId));
      console.log(`Successfully deleted command with ID: ${commandId}`);
    }
  } catch (error) {
    console.error('Error deleting commands:', error);
  }
}

// Run the deletion and then add new commands
async function deployCommands() {
  await deleteCommands(); // First, delete the old commands

  // Register new commands (e.g., /tryout, /add, etc.)
  try {
    const newCommands = client.commands.map(command => command.data.toJSON());
    await rest.put(Routes.applicationGuildCommands(CLIENT_ID, GUILD_ID), { body: newCommands });
    console.log('Successfully reloaded application (/) commands.');
  } catch (error) {
    console.error('Error refreshing commands:', error);
  }
}

// Execute the deployment
deployCommands();
