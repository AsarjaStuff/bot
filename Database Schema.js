const { Sequelize, DataTypes } = require('sequelize');
require('dotenv').config();

// Set up Sequelize with SQLite
const sequelize = new Sequelize({
  dialect: 'sqlite',
  storage: './database.sqlite',  // Make sure you're using this for persistent storage
});

// Model for tryout sessions
const Tryout = sequelize.define('Tryout', {
  hostId: { type: DataTypes.STRING, allowNull: false },
  cohostId: { type: DataTypes.STRING, allowNull: true },
  gamelink: { type: DataTypes.STRING, allowNull: true },
  gamerules: { type: DataTypes.TEXT, allowNull: true },
  concludedTime: { type: DataTypes.DATE, allowNull: true },
  concluded: { type: DataTypes.BOOLEAN, defaultValue: false },
}, {
  tableName: 'tryouts', // Ensure the table name matches the old one if you're migrating
});

// Model for wins tracking
const Wins = sequelize.define('Wins', {
  userId: { type: DataTypes.STRING, allowNull: false, unique: true },
  wins: { type: DataTypes.INTEGER, defaultValue: 0 },
}, {
  tableName: 'users', // Ensure the table name matches the old one if you're migrating
});

// Sync the models with the database, creating tables if they don't exist
async function syncDatabase() {
  try {
    await sequelize.sync({ force: false });  // Set force: true to reset the tables for testing
    console.log('Database synced successfully');
  } catch (error) {
    console.error('Error syncing database:', error);
  }
}

// Call the sync function to ensure the tables exist
syncDatabase();

module.exports = { Tryout, Wins, sequelize };
