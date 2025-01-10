const {
    SlashCommandBuilder,
    ModalBuilder,
    ActionRowBuilder,
    TextInputBuilder,
    TextInputStyle,
  } = require("discord.js");
  
  const allowedUsersTable = ["489820150758113300"];
  
  
  module.exports = {
    data: new SlashCommandBuilder()
      .setName("msg")
      .setDescription(`Sends a message. (Avaible only for choosen people)`)
      .setDMPermission(false)
      .addStringOption((option) =>
        option
          .setName("mentions")
          .setDescription(
            "Please type here what users/roles should be pinged. (Leave blank if none)"
          )
      )
      .addChannelOption((option) =>
        option
          .setName("channel")
          .setDescription(
            "Channel to send message to. (Leave blank for the same channel)"
          )
      )
      .addStringOption((option) =>
        option
          .setName("message")
          .setDescription("Message to send. (Leave blank for longer messages)")
          .setMaxLength(1950)
      ),
    async execute(interaction, client) {
      if(!allowedUsersTable.includes(interaction.user.id)) {
          await interaction.deferReply({ fetchReply: true, ephemeral: true });
          return await interaction.editReply("❌ You are not permitted to run this command.")
      }
      
      const text = interaction.options.getString("message");
      const channel =
        interaction.options.getChannel("channel") ?? interaction.channel;
      const mentions = interaction.options.getString("mentions") ?? "";
  
      if (text === null) {
        const modal = new ModalBuilder()
          .setCustomId("messageModal")
          .setTitle("Long message (1 hour to type it)");
        const messageInput = new TextInputBuilder()
          .setCustomId("msgInput")
          .setLabel("Please type a message")
          .setStyle(TextInputStyle.Paragraph)
          .setMaxLength(1950);
        const actionRow = new ActionRowBuilder().addComponents(messageInput);
        modal.addComponents(actionRow);
        await interaction.showModal(modal);
  
        const collectorFilter = (i) => {
          return i.user.id === interaction.user.id && i.customId === "messageModal" && i.createdTimestamp > interaction.createdTimestamp;
        };
        const modalResponse = await interaction.awaitModalSubmit({time: 3600000, filter: collectorFilter}).catch(e => {return false});
        if(!modalResponse) return;
        try {
          const longText = modalResponse.fields.getTextInputValue("msgInput");
          await modalResponse.deferReply({ fetchReply: true, ephemeral: true });
          await modalResponse.editReply(`Message sent to ${channel}!`);
          return await channel.send(`${mentions}\n\n${longText}`);;
        } catch (error) {
          let status = await modalResponse.deferReply({ fetchReply: true, ephemeral: true }).catch(e => {return false});
          if(!status) return;
          console.log(error);
          await modalResponse.editReply(
            `Error occured while trying to send a message to ${channel}:\n\`\`\`Status: ${
              error.status ?? "No status."
            }\nMessage: ${
              error.message ?? "No error message. (Contact agency pls)"
            }\`\`\``
          );
      }
      } else {
          await interaction.deferReply({ fetchReply: true, ephemeral: true});
        try {
          await channel.send(`${mentions}\n\n${text}`);
          await interaction.editReply(`Message sent to ${channel}!`);
        } catch (error) {
          console.log(error);
          interaction.editReply(
            `Error occured while trying to send a message to ${channel}:\n\`\`\`Status: ${
              error.status ?? "No status."
            }\nMessage: ${
              error.message ?? "No error message. (Contact agency pls)"
            }\`\`\``
          );
        }
      }
    },
  };
  