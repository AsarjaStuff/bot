const { SlashCommandBuilder, EmbedBuilder, ButtonBuilder, ButtonStyle, ActionRowBuilder, ComponentType } = require('discord.js');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('standoff')
        .setDescription(`Challenge a friend or foe >:)`)
        .addUserOption(option =>
            option
                .setName("participant")
                .setDescription("Who do you want to challenge?")
                .setRequired(true)
        ),
    async execute(interaction, client) {
        const message = await interaction.deferReply({
            fetchReply: true
        });
        const participant = await interaction.options.getUser("participant");
        //VALIDATION CHECK
        let tembed;
        if (participant.id == interaction.user.id) {
            tembed = new EmbedBuilder()
            .setColor(0xFF0000)
            .setTitle("STANDOFF")
            .setDescription(`You cannot challenge yourself!`)
            .setFooter({ text: `Smh...` })
            .setTimestamp();
            await interaction.editReply({ embeds: [tembed] })
            return
        } else if (participant.bot) {
            tembed = new EmbedBuilder()
            .setColor(0xFF0000)
            .setTitle("STANDOFF")
            .setDescription(`You cannot challenge a bot!`)
            .setFooter({ text: `Smh...` })
            .setTimestamp();
            await interaction.editReply({ embeds: [tembed] })
            return
        }

        //VARIABLES TO EDIT
        const emojiArray = ["🎆", "🔥", "🔫", "💥", "✨", "👀"];
        const maxAttempts = 5;

        //EMBEDS
        const initialEmbed = new EmbedBuilder()
            .setColor("DarkGold")
            .setTitle("STANDOFF")
            .setDescription(`# **${interaction.user.username.toUpperCase()}** versus **${participant.username.toUpperCase()}**.\n\n<@${participant.id}> DO YOU ACCEPT THE CHALLENGE?`)
            .setFooter({ text: `Auto rejection in 60 seconds.` })
            .setTimestamp();

        const initialEmbedDeclined = new EmbedBuilder()
            .setColor(0xFF0000)
            .setTitle("STANDOFF REJECTED")
            .setTimestamp();


        const mainEmbed = new EmbedBuilder()
            .setColor("Gold")
            .setTitle("STANDOFF ACCEPTED")
            .setTimestamp();

        const aftermatchFailureEmbed = new EmbedBuilder()
            .setColor("Orange")
            .setTitle("STANDOFF AFTERMATCH")
            .setTimestamp();

        const aftermatchSuccesEmbed = new EmbedBuilder()
            .setColor("Blue")
            .setTitle("STANDOFF AFTERMATCH")
            .setTimestamp();

        const stalemateEmbed = new EmbedBuilder()
            .setColor("DarkGrey")
            .setTitle("STANDOFF AFTERMATCH")
            .setDescription("### STALEMATE?\nNobody reacted in time.")
        //BUTTONS
        const initialAcceptButton = new ButtonBuilder()
            .setCustomId("initialAcceptButton")
            .setLabel("Accept")
            .setStyle(ButtonStyle.Success);

        const initialDeclineButton = new ButtonBuilder()
            .setCustomId("initialDeclineButton")
            .setLabel("Decline")
            .setStyle(ButtonStyle.Secondary);


        const baitButton = new ButtonBuilder()
            .setCustomId("baitButton")
            .setStyle(ButtonStyle.Danger)
            .setEmoji("🎶");

        const winningButton = new ButtonBuilder()
            .setCustomId("winningButton")
            .setStyle(ButtonStyle.Danger)
            .setEmoji("✅")
        //ACTION ROWS
        const initialActionRow = new ActionRowBuilder()
            .addComponents(initialAcceptButton, initialDeclineButton);


        //MAIN CODE
        const initialMessage = await interaction.editReply({ embeds: [initialEmbed], components: [initialActionRow] });
        const interactionfilter = i => {
            i.deferUpdate();
            if (i.user.id == participant.id) {
                return true;
            } else {
                interaction.followUp({ content: 'This button is not for you.', ephemeral: true });
                return false;
            }
        };
        const initialReply = await initialMessage.awaitMessageComponent({ filter: interactionfilter, componentType: ComponentType.Button, time: 60_000 }).catch(e => { return false });
        if (!initialReply) {
            let initialCancelledByTimeoutEmbed = EmbedBuilder.from(initialEmbedDeclined)
                .setDescription(`<@${participant.id}> did not respond to the challenge within 1 minute.`);
            return await interaction.editReply({ embeds: [initialCancelledByTimeoutEmbed], components: [] });
        } else if (initialReply.customId != "initialAcceptButton") {
            let initialCancelledByRequestEmbed = EmbedBuilder.from(initialEmbedDeclined)
                .setDescription(`<@${participant.id}> declined the challenge.`);
            return await interaction.editReply({ embeds: [initialCancelledByRequestEmbed], components: [] });
        }

        const randomGoalEmojiRNG = Math.floor(Math.random() * emojiArray.length);
        const goalEmoji = emojiArray.splice(randomGoalEmojiRNG, 1)

        await interaction.editReply({
            embeds: [EmbedBuilder.from(mainEmbed)
                .setDescription(`Your goal is to click a button with ${goalEmoji} emoji. First person to do that wins.\nClicking anything else results in instant loss.`)
                .setColor("DarkRed")
                .setTitle("STANDOFF IS ABOUT TO BEGIN")],
            components: []
        });
        await new Promise(r => setTimeout(r, 5_000));

        await interaction.editReply({
            embeds: [EmbedBuilder.from(mainEmbed)
                .setDescription(`Look for ${goalEmoji}`)
                .setColor("Red")
                .setTitle("STANDOFF IN PROGRESS")
            ]
        });
        await new Promise(r => setTimeout(r, 5_000));

        const numOfAttemptsRNG = Math.floor(Math.random() * maxAttempts);

        await interaction.editReply({
            embeds: [EmbedBuilder.from(mainEmbed)
                .setDescription(`Look for ${goalEmoji}`)
                .setColor("Red")
                .setTitle("STANDOFF IN PROGRESS")
            ]
        })

        const filter2 = (i) => {
            i.deferUpdate().catch();
            if (!(i.user.id == interaction.user.id || i.user.id == participant.id)) return false;
            return true;
        }
        let baitPromiseResult = false;
        for (let i = 0; i < numOfAttemptsRNG; i++) {
            if (baitPromiseResult) break;
            const randomEmojiRNG = Math.floor(Math.random() * emojiArray.length);
            let baitButtonEdited = ButtonBuilder.from(baitButton)
                .setEmoji(emojiArray[randomEmojiRNG]);
            const mainActionRow = new ActionRowBuilder()
                .addComponents(baitButtonEdited);

            await interaction.editReply({ components: [mainActionRow] });

            const randomTimeRNG = Math.floor(Math.random() * 5_000 + 1_000);
            baitPromiseResult = await message.awaitMessageComponent({ filter: filter2, componentType: ComponentType.Button, time: randomTimeRNG })
                .then(r => { return r }).catch(e => { return false });
        }
        if (baitPromiseResult) {
            let finalFailureDescription;
            if (baitPromiseResult.user.id == interaction.user.id) {
                finalFailureDescription = `### **${participant} has won**\n${interaction.user} fired too early.`
            } else if (baitPromiseResult.user.id == participant.id) {
                finalFailureDescription = `### **${interaction.user} has won**\n${participant} fired too early.`
            }
            let finalFailureEmbed = EmbedBuilder.from(aftermatchFailureEmbed)
                .setDescription(finalFailureDescription)
            return await interaction.editReply({ embeds: [finalFailureEmbed], components: [] });
        }

        await new Promise((r) => setTimeout(r, Math.floor(Math.random() * 5_000 + 1_000)));

        //FINAL SUCCES EMBEDS
        let winningButtonEdited = ButtonBuilder.from(winningButton)
            .setEmoji(goalEmoji[0]);
        const winnigActionRow = new ActionRowBuilder()
            .addComponents(winningButtonEdited);

        const winningMessage = await interaction.editReply({ components: [winnigActionRow] });
        const winningResult = await winningMessage.awaitMessageComponent({ filter: filter2, componentType: ComponentType.Button, time: 10_000 })
            .then(r => { return r }).catch(e => { return false });

        if (winningResult) {
            let finalSucessDescription;
            if (winningResult.user.id == interaction.user.id) {
                finalSucessDescription = `### **${interaction.user} has won**\n${participant} was shot.`;
            } else if (winningResult.user.id == participant.id) {
                finalSucessDescription = `### **${participant} has won**\n${interaction.user} was shot`;
            }
            let finalSucessEmbed = EmbedBuilder.from(aftermatchSuccesEmbed)
                .setDescription(finalSucessDescription)
            return await interaction.editReply({ embeds: [finalSucessEmbed], components: [] });
        }

        await interaction.editReply({ embeds: [stalemateEmbed], components: [] });
    }
}