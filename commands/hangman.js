const { SlashCommandBuilder, EmbedBuilder, ButtonBuilder, ButtonStyle, ActionRowBuilder, ModalBuilder, TextInputBuilder, TextInputStyle, ComponentType } = require('discord.js');

// Temporary data
const wordsArray = ["METRO", "GALAXY", "TUSURUYI", "BANANA", "INTELLIGENT"];
const wordsObject = [
    { category: "Transport", word: "METRO" },
    { category: "Space", word: "GALAXY" },
    { category: "Agency's Amazing Friends", word: "TUSURUYI" },
    { category: "Fruit", word: "BANANA" },
];

module.exports = {
    data: new SlashCommandBuilder()
        .setName('hangman')
        .setDescription('Guess the word. Choose letters wisely'),
    async execute(interaction, client) {
        const message = await interaction.deferReply({ fetchReply: true });
        const dateVerification = Date.now();

        // Get the selected word
        let healthPoints = 6;
        const rng1 = Math.floor(Math.random() * wordsObject.length);
        const originalPassword = wordsObject[rng1].word;

        // Create the base embeds
        const mainEmbedBase = new EmbedBuilder()
            .setTitle("HANGMAN")
            .setColor("White");

        const neglectedGameEmbed = new EmbedBuilder()
            .setTitle("GAME HAS ENDED")
            .setDescription("No activity detected for 15 minutes straight!")
            .setColor("NotQuiteBlack");

        const gameWonEmbed = new EmbedBuilder()
            .setTitle("WON")
            .setDescription("You successfully revealed the keyword! 🥳")
            .setColor('Green');

        const gameLostEmbed = new EmbedBuilder()
            .setTitle("LOST")
            .setDescription("You ran out of lives! Better luck next time.")
            .setColor("DarkRed");

        // Buttons for user actions
        const pickLetterButton = new ButtonBuilder()
            .setCustomId("pickLetter")
            .setStyle(ButtonStyle.Primary)
            .setLabel("Guess a letter");

        const guessWordButton = new ButtonBuilder()
            .setCustomId("guessPassword")
            .setStyle(ButtonStyle.Secondary)
            .setLabel("Guess the password");

        // Modals for user input
        const pickLetterModal = new ModalBuilder()
            .setCustomId("choosenLetterModal" + dateVerification)
            .setTitle("HANGMAN");

        const whatsYourLetterText = new TextInputBuilder()
            .setCustomId("choosenLetter")
            .setStyle(TextInputStyle.Short)
            .setLabel("Pick one letter.")
            .setRequired(true)
            .setMaxLength(1);

        const modalActionRow = new ActionRowBuilder()
            .addComponents(whatsYourLetterText);
        pickLetterModal.addComponents(modalActionRow);

        const guessPasswordModal = new ModalBuilder()
            .setCustomId("guessPasswordModal" + dateVerification)
            .setTitle("HANGMAN");

        const whatsYourKeywordText = new TextInputBuilder()
            .setCustomId("choosenKeyword")
            .setStyle(TextInputStyle.Short)
            .setLabel("Type in the keyword")
            .setRequired(true)
            .setMinLength(originalPassword.length)
            .setMaxLength(originalPassword.length);

        const modalPasswordActionRow = new ActionRowBuilder()
            .addComponents(whatsYourKeywordText);
        guessPasswordModal.addComponents(modalPasswordActionRow);

        // Action Rows
        const mainActionRow = new ActionRowBuilder()
            .setComponents(pickLetterButton, guessWordButton);

        const neglectedActionRow = new ActionRowBuilder()
            .setComponents(ButtonBuilder.from(pickLetterButton).setDisabled(true), ButtonBuilder.from(guessWordButton).setDisabled(true));

        // Game variables
        let revealedPassword = originalPassword;
        let coveredPassword = Array(originalPassword.length).fill("\\_ ");
        let usedLetters = [];

        // Initial embed setup
        let mainEmbed = EmbedBuilder.from(mainEmbedBase)
            .setTitle(`Category: ${wordsObject[rng1].category}`)
            .setDescription(`# ${coveredPassword.join("")}`)
            .addFields(
                { name: "status", value: "`...`", inline: true },
                { name: "health", value: healthPoints.toString(), inline: true },
                { name: "used letters", value: usedLetters.join(", ") || " " }
            )
            .setFooter({ text: "15 minutes inactivity results in neglected game." });

        const message1 = await interaction.editReply({ embeds: [mainEmbed], components: [mainActionRow] });

        const filter = (i) => {
            if (i.user.id != interaction.user.id) {
                i.deferUpdate();
                i.followUp({ content: "This button is not for you.", ephemeral: true });
                return false;
            }
            return i.customId === "pickLetter" || i.customId === "guessPassword";
        };

        const gameFinish = async (verdict) => {
            switch (verdict) {
                case "won":
                    await interaction.editReply({ embeds: [gameWonEmbed], components: [] });
                    break;
                case "lost":
                    await interaction.editReply({ embeds: [gameLostEmbed], components: [] });
                    break;
            }
        };

        // Main gameplay loop
        while (coveredPassword.includes("\\_ ")) {
            if (healthPoints <= 0) return gameFinish("lost");

            const mainLoopCollector = await message1.createMessageComponentCollector({
                filter,
                componentType: ComponentType.Button,
                time: 60_000 * 15,
            });

            let choosenValue = await new Promise((resolve, reject) => {
                mainLoopCollector.on("collect", async (collected) => {
                    if (collected.customId === "pickLetter") {
                        await collected.showModal(pickLetterModal);
                        const modalData = await collected.awaitModalSubmit({
                            filter: (i) => i.customId === "choosenLetterModal" + dateVerification && i.user.id === interaction.user.id,
                            time: 60_000 * 15,
                        }).catch(() => false);
                        if (!modalData) return reject();
                        mainLoopCollector.stop();
                        return resolve(["letter", modalData.fields.getTextInputValue("choosenLetter").toUpperCase()]);
                    } else if (collected.customId === "guessPassword") {
                        await collected.showModal(guessPasswordModal);
                        const modalData = await collected.awaitModalSubmit({
                            filter: (i) => i.customId === "guessPasswordModal" + dateVerification && i.user.id === interaction.user.id,
                            time: 60_000 * 15,
                        }).catch(() => false);
                        if (!modalData) return reject();
                        mainLoopCollector.stop();
                        return resolve(["keyword", modalData.fields.getTextInputValue("choosenKeyword").toUpperCase()]);
                    }
                });

                mainLoopCollector.on("end", async (finalCollection) => {
                    if (finalCollection.size === 0) return reject();
                });
            }).catch(() => false);

            if (!choosenValue) return await interaction.editReply({ embeds: [neglectedGameEmbed], components: [neglectedActionRow] });
            await interaction.editReply({ components: [neglectedActionRow] });

            if (choosenValue[0] === "letter") {
                const choosenLetter = choosenValue[1];
                if (usedLetters.includes(choosenLetter)) {
                    mainEmbed = EmbedBuilder.from(mainEmbed)
                        .setDescription(`# ${coveredPassword.join("")}`)
                        .setFields(
                            { name: "status", value: `\`Letter "${choosenLetter}" was already used!\``, inline: true },
                            { name: "health", value: healthPoints.toString(), inline: true },
                            { name: "used letters", value: usedLetters.join(", ") || " " }
                        );
                    await interaction.editReply({ embeds: [mainEmbed] });
                    await new Promise((r) => setTimeout(r, 3000));
                } else if (revealedPassword.includes(choosenLetter)) {
                    usedLetters.push(choosenLetter);
                    for (let i = 0; i < revealedPassword.length; i++) {
                        if (revealedPassword[i] === choosenLetter) {
                            coveredPassword[i] = choosenLetter + " ";
                        }
                    }
                    mainEmbed = EmbedBuilder.from(mainEmbed)
                        .setDescription(`# ${coveredPassword.join("")}`)
                        .setFields(
                            { name: "status", value: `\`Letter "${choosenLetter}" is correct!\``, inline: true },
                            { name: "health", value: healthPoints.toString(), inline: true },
                            { name: "used letters", value: usedLetters.join(", ") || " " }
                        );
                    await interaction.editReply({ embeds: [mainEmbed] });
                } else {
                    usedLetters.push(choosenLetter);
                    healthPoints -= 1;
                    mainEmbed = EmbedBuilder.from(mainEmbed)
                        .setDescription(`# ${coveredPassword.join("")}`)
                        .setFields(
                            { name: "status", value: `\`No match for "${choosenLetter}" -1HP\``, inline: true },
                            { name: "health", value: healthPoints.toString(), inline: true },
                            { name: "used letters", value: usedLetters.join(", ") || " " }
                        );
                    await interaction.editReply({ embeds: [mainEmbed] });
                    await new Promise((r) => setTimeout(r, 2000));
                }
            } else if (choosenValue[0] === "keyword") {
                const guess = choosenValue[1];
                if (guess === originalPassword) {
                    return gameFinish("won");
                } else {
                    healthPoints -= 2;
                    mainEmbed = EmbedBuilder.from(mainEmbed)
                        .setDescription(`# ${coveredPassword.join("")}`)
                        .setFields(
                            { name: "status", value: `\`Incorrect password "${guess}" -2HP\``, inline: true },
                            { name: "health", value: healthPoints.toString(), inline: true },
                            { name: "used letters", value: usedLetters.join(", ") || " " }
                        );
                    await interaction.editReply({ embeds: [mainEmbed] });
                    await new Promise((r) => setTimeout(r, 2000));
                }
            }

            mainEmbed = EmbedBuilder.from(mainEmbedBase)
                .setDescription(`# ${coveredPassword.join("")}`)
                .setFields(
                    { name: "status", value: "`...`", inline: true },
                    { name: "health", value: healthPoints.toString(), inline: true },
                    { name: "used letters", value: usedLetters.join(", ") || " " }
                );
            await interaction.editReply({ embeds: [mainEmbed], components: [mainActionRow] });
        }

        // Game over with a win
        gameFinish("won");
    }
};
