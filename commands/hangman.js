const { SlashCommandBuilder, EmbedBuilder, ButtonBuilder, ButtonStyle, ActionRowBuilder, ModalBuilder, TextInputBuilder, TextInputStyle, ComponentType } = require('discord.js');

//temporary
const wordsArray = ["METRO", "GALAXY", "TUSURUYI", "BANANA", "INTELLIGENT"];
const wordsObject = [
    {
        category: "transport",
        word: "METRO"
    },
    {
        category: "space",
        word: "GALAXY"
    },
    {
        category: "Agency's amazing friends",
        word: "TUSURUYI"
    },
    {
        category: "Fruit",
        word: "BANANA"
    },
]

module.exports = {
    data: new SlashCommandBuilder()
        .setName('hangman')
        .setDescription(`Guess the word. Choose letters wisely`),
    async execute(interaction, client) {
        const message = await interaction.deferReply({
            fetchReply: true
        });
        const dateVerification = Date.now()

        //GET THE MAIN PASSWORD

        let healthPoints = 6;
        const rng1 = Math.floor(Math.random() * wordsObject.length);
        const orginalPassword = wordsObject[rng1].word;

        // EMBEDS
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
            .setDescription("You ran out of lifes! Better luck next time.")
            .setColor("DarkRed");
        // BUTTONS
        const pickLetterButton = new ButtonBuilder()
            .setDisabled(false)
            .setCustomId("pickLetter")
            .setStyle(ButtonStyle.Primary)
            .setLabel("Guess a letter");
        const guessWordButton = new ButtonBuilder()
            .setDisabled(false)
            .setCustomId("guessPassword")
            .setStyle(ButtonStyle.Secondary)
            .setLabel("Guess the password");
        // MODAL RELATED
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
            .setTitle("HANGMAN")
        const whatsYourKeywordText = new TextInputBuilder()
            .setCustomId("choosenKeyword")
            .setStyle(TextInputStyle.Short)
            .setLabel("Type in the keyword")
            .setRequired(true)
            .setMinLength(orginalPassword.length)
            .setMaxLength(orginalPassword.length);
        const modalPasswordActionRow = new ActionRowBuilder()
            .addComponents(whatsYourKeywordText);
        guessPasswordModal.addComponents(modalPasswordActionRow);
        // ACTION ROWS
        const mainActionRow = new ActionRowBuilder()
            .setComponents(pickLetterButton, guessWordButton);

        const neglectedActionRow = new ActionRowBuilder()
            .setComponents(ButtonBuilder.from(pickLetterButton).setDisabled(true), ButtonBuilder.from(guessWordButton).setDisabled(true));
        //MAIN CODE

        let revealedPassword = wordsArray[rng1];
        let coveredPassword = [];
        let usedLetters = [];

        for (let i = 0; i < orginalPassword.length; i++) {
            coveredPassword.push("\\_ ")
        }

        let mainEmbed = EmbedBuilder.from(mainEmbedBase)
            .setTitle(`Category: ${wordsObject[rng1].category}`)
            .setDescription(
                `# ${coveredPassword.join("")}`
            )
            .addFields(
                { name: "status", value: "`...`", inline: true },
                { name: "health", value: healthPoints.toString(), inline: true },
                { name: "used letters", value: usedLetters.join(", ") || " "}
            )
            .setFooter(
                { text: "15 minutes inactivity results in neglected game." }
            )

        const message1 = await interaction.editReply({ embeds: [mainEmbed], components: [mainActionRow] });

        const filter = async (i) => {
            console.trace(i.customId);
            if (i.user.id != interaction.user.id) {
                await i.deferUpdate();
                await i.followUp({ content: "This button is not for you.", ephemeral: true });
                return false
            }
            else if (!(i.customId == "pickLetter" || i.customId == "guessPassword")) {
                await i.deferUpdate();
                return false
            }
            else return true
        }

        // game finished function
        const gameFinish = async (verdict) => {
            switch (verdict) {
                case "won":
                    await interaction.editReply({ embeds: [gameWonEmbed], components: [] });
                    break;
                case "lost":
                    await interaction.editReply({ embeds: [gameLostEmbed], components: [] });
                    break;
                default:
                    break;
            }
        }
        //Main gameplay loop:
        while (coveredPassword.indexOf("\\_ ") != -1) {
            if (healthPoints <= 0) return gameFinish("lost");
            const mainLoopCollector = await message1.createMessageComponentCollector({ filter: filter, componentType: ComponentType.Button, time: 60_000 * 15 })

            let choosenValue = await new Promise((resolve, reject) => {
                mainLoopCollector.on("collect", async collected => {
                    if (collected.customId == "pickLetter") {
                        await collected.showModal(pickLetterModal);
                        const modalData = await collected.awaitModalSubmit({
                            filter:
                                i => i.customId == "choosenLetterModal" + dateVerification && i.user.id == interaction.user.id,
                            time: 60_000 * 15
                        }).then(i => { return i }).catch(() => { return false });
                        if (!modalData) return reject();
                        mainLoopCollector.stop();
                        await modalData.deferUpdate().catch(err => { return });
                        return resolve(["letter", modalData.fields.getTextInputValue("choosenLetter").toUpperCase()]);
                    }
                    else if (collected.customId == "guessPassword") {
                        await collected.showModal(guessPasswordModal);
                        const modalData = await collected.awaitModalSubmit({
                            filter:
                                i => i.customId == "guessPasswordModal" + dateVerification && i.user.id == interaction.user.id,
                            time: 60_000 * 15
                        }).then(i => { return i }).catch(() => { return false });
                        if (!modalData) return reject();
                        mainLoopCollector.stop();
                        await modalData.deferUpdate().catch(() => { return });
                        return resolve(["keyword", modalData.fields.getTextInputValue("choosenKeyword").toUpperCase()]);
                    }
                })
                mainLoopCollector.on("end", async finalCollection => {
                    console.log(finalCollection)
                    if (finalCollection.size == 0) return reject();
                })
            }).catch(() => { return false });
            if (!choosenValue) return await interaction.editReply({ embeds: [neglectedGameEmbed], components: [neglectedActionRow] });
            await interaction.editReply({ components: [neglectedActionRow] });
            console.log(`CHOOSEN LETTER: ${choosenValue}`);

            if (choosenValue[0] === "letter") {
                choosenValue = choosenValue[1].toUpperCase();
                let matchesCounter = 0;

                if (usedLetters.includes(choosenValue)) {
                    mainEmbed = EmbedBuilder.from(mainEmbed)
                        .setDescription(
                            `# ${coveredPassword.join("")}`
                        )
                        .setFields(
                            { name: "status", value: `\`Letter "${choosenValue} was already used!"\``, inline: true },
                            { name: "health", value: healthPoints.toString(), inline: true },
                            { name: "used letters", value: usedLetters.join(", ") || "\n"}
                        )
                        await interaction.editReply({ embeds: [mainEmbed] });
                        await new Promise((r) => setTimeout(r, 3000));
                }
                else if (revealedPassword.indexOf(choosenValue) != -1) {
                    usedLetters.push(choosenValue);
                    while (revealedPassword.indexOf(choosenValue) != -1) {
                        if (matchesCounter !== 0) await new Promise((r) => setTimeout(r, 700));
                        matchesCounter++;
                        const position = revealedPassword.indexOf(choosenValue);
                        coveredPassword[position] = choosenValue + " ";
                        revealedPassword = revealedPassword.replace(choosenValue, "-")

                        let word = " match found"
                        if (matchesCounter != 1) word = " matches found"

                        mainEmbed = EmbedBuilder.from(mainEmbed)
                            .setDescription(
                                `# ${coveredPassword.join("")}`
                            )
                            .setFields(
                                { name: "status", value: `\`${matchesCounter + word}\``, inline: true },
                                { name: "health", value: healthPoints.toString(), inline: true },
                                { name: "used letters", value: usedLetters.join(", ") || " "}
                            )
                        await interaction.editReply({ embeds: [mainEmbed] });
                    }
                    await new Promise((r) => setTimeout(r, 700));
                } else {
                    usedLetters.push(choosenValue);
                    healthPoints -= 1;
                    mainEmbed = EmbedBuilder.from(mainEmbed)
                        .setDescription(
                            `# ${coveredPassword.join("")}`
                        )
                        .setFields(
                            { name: "status", value: `\`This word doesn't contain "${choosenValue}". -1HP\``, inline: true },
                            { name: "health", value: healthPoints.toString(), inline: true },
                            { name: "used letters", value: usedLetters.join(", ") || " "}
                        )
                    await interaction.editReply({ embeds: [mainEmbed] });
                    await new Promise((r) => setTimeout(r, 2000));
                }
                mainEmbed = EmbedBuilder.from(mainEmbedBase)
                    .setDescription(
                        `# ${coveredPassword.join("")}`
                    )
                    .setFields(
                        { name: "status", value: `\`...\``, inline: true },
                        { name: "health", value: healthPoints.toString(), inline: true },
                        { name: "used letters", value: usedLetters.join(", ") || " "}
                    )
                await new Promise((r) => setTimeout(r, 500));
                await interaction.editReply({ embeds: [mainEmbed], components: [mainActionRow] });
            }
            else if (choosenValue[0] === "keyword") {
                choosenValue = choosenValue[1];
                if (choosenValue.toUpperCase() === orginalPassword.toUpperCase()) break;
                healthPoints -= 2;
                mainEmbed = EmbedBuilder.from(mainEmbed)
                    .setFields(
                        { name: "status", value: `\`"${choosenValue.toUpperCase()}" is not correct! -2HP.\``, inline: true },
                        { name: "health", value: healthPoints.toString(), inline: true },
                        { name: "used letters", value: usedLetters.join(", ") || " "}
                    )
                await interaction.editReply({ embeds: [mainEmbed], components: [neglectedActionRow] });
                await new Promise((r) => setTimeout(r, 2000));
                mainEmbed = EmbedBuilder.from(mainEmbed)
                    .setFields(
                        { name: "status", value: `\`...\``, inline: true },
                        { name: "health", value: healthPoints.toString(), inline: true },
                        { name: "used letters", value: usedLetters.join(", ") || " "}
                    )
                await interaction.editReply({ embeds: [mainEmbed], components: [mainActionRow] });
            }
        }
        //IMPLEMENT CHECK FOR HEALTH TO DETERMINE IF SOMEONE WON OR NOT!!!
        gameFinish("won");

    }
}