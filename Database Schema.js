const sequelize = new Sequelize({
    dialect: 'sqlite',
    storage: './database.sqlite',  // Make sure you're using this for persistent storage
  });  

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
