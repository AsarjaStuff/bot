const { Sequelize, DataTypes } = require('sequelize');
const sequelize = new Sequelize('sqlite::memory:'); // or use PostgreSQL connection string

// Model for tryout sessions
const Tryout = sequelize.define('Tryout', {
  hostId: { type: DataTypes.STRING, allowNull: false },
  gamelink: { type: DataTypes.STRING },
  gamerules: { type: DataTypes.TEXT },
  concludedTime: { type: DataTypes.DATE },
});

// Model for wins tracking
const Wins = sequelize.define('Wins', {
  userId: { type: DataTypes.STRING, allowNull: false, unique: true },
  wins: { type: DataTypes.INTEGER, defaultValue: 0 },
});
