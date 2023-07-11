const { Client, Events, GatewayIntentBits, ComponentType, EmbedBuilder, InteractionCollector, Collection } = require("discord.js");

const TOKEN = "MTEyNzM0MjExNzY1MjUzMzI0OA.G7DF_t.elIfj_eijiMJ51rLG0sIWyblQ_gMN6acT_Bzhc";
const CLIENT_ID = "1127342117652533248";
const CLIENT_AT_STRING = `<@${CLIENT_ID}>`;

class Transaction
{
    constructor(guildId, userId, messageId, color)
    {
        this.guildId = guildId;
        this.userId = userId;
        this.messageId = messageId;
        this.color = color;
        this.attempts = 0;
    }
}
let pendingTransactions = new Array();

/*
    Bot Setup and Login
*/
const client = new Client({ 
    intents: 
    [
        GatewayIntentBits.Guilds,         //Server info I think. Correct any of these if they're wrong lol
        GatewayIntentBits.GuildMessages,  //Server messages
        GatewayIntentBits.MessageContent, //The content of messages
        GatewayIntentBits.GuildMembers,   //Get member information
    ],
});

client.once(Events.ClientReady, c => {
	console.log(`Logged in as ${c.user.tag}`);
});
client.login(TOKEN);

/*
    Quick and Easy Error
*/
function error(message, errorMessage = "I'm just a silly squid, I don't know what that means!")
{

    message.reply({
        content: errorMessage,
    })
}

/*
    Embed (Color Set Preview)
*/
const colorPreviewEmbed = new EmbedBuilder()
    .setColor("#deadff")
    .setAuthor({name: "Do U Like Color?", iconURL: "http://voidspace.blog/doulikecolor.png"}) //Bold text with any image for icons
    .setThumbnail("https://via.placeholder.com/50/deadff/deadff.png") //I have no idea what this website is, but it generates 50x50 pngs of any hex color given the right URL I think?
    .setFooter({ text: "Squid like color :)" })

function resetEmbed()
{
    colorPreviewEmbed.setAuthor({name: "Do U Like Color?", iconURL: "http://voidspace.blog/doulikecolor.png"});
    colorPreviewEmbed.setFooter({ text: "Squid like color :)" });
}

/*
    Component (Color Set Accept/Deny)
*/
colorPreviewComponent = {
    "type": 1,
    "components": [
        //Yes button
        {
            "type": 2,
            "style": 3,
            "label": "Yes!",
            "custom_id": "color_accept",
        },
        //No button
        {
            "type": 2,
            "style": 4,
            "label": "No",
            "custom_id": "color_reject",
        }
    ]
};

/*
    A single async helper function to create the role
*/
async function createRole(interaction, transaction)
{
    decimalColor = parseInt(transaction.color, 16); //Hex to decimal
    role = await interaction.guild.roles.create({
        name: `Squid ${transaction.userId}`,
        color: decimalColor,
    });
    return role;
}


/*
    Bot Start
*/
client.on("messageCreate", async message => {
    //Are we mentioned, and is our @ the start of the message
    isSquidCommand = (message.mentions.users.find(value => value == CLIENT_ID) != undefined) && (message.content.slice(0, 22) == CLIENT_AT_STRING) && !message.mentions.everyone;

    if(isSquidCommand)
    {
        command = message.content.slice(CLIENT_AT_STRING.length + 1) //Extra space
        console.log(command)
        if(command.slice(0, 9) == "color set")
        {
            if(command.length >= 15)
            {
                color = command[10] == "#" ? command.slice(11, 17) : command.slice(10, 16) //Hex codes with or without the #, with # removed lol
                if(/^[0-9A-F]{6}$/i.test(color)) //Regex for a valid hex color
                {
                    //Update color dependent info
                    colorPreviewEmbed.setColor(`#${color}`);
                    colorPreviewEmbed.setThumbnail(`https://via.placeholder.com/50/${color}/${color}.png`);

                    response = await message.reply({
                        embeds: [ colorPreviewEmbed ],
                        components: [ colorPreviewComponent ],
                    });
                    
                    //console.log(message)

                    transaction = new Transaction(message.guild.id, message.author.id, message.id, color);
                    pendingTransactions[message.id] = transaction;
                }
                else
                {
                    error(message, "Squid doesn't understand that hex color :(");
                }
            }
            else
            {
                error(message, "Please add a hex color!");
            }
        }
        else if(command.slice(0, 12) == "color remove")
        {
            message.reply({
                content: "Okay! Squid take color :)"
            });
            role = message.guild.roles.cache.find(role => role.name === `Squid ${message.author.id}`);
            message.guild.roles.delete(role);
        }
        else
        {
            error(message);
        }
    }
});

/*
    Manage Responses
*/
client.on("interactionCreate", interaction => {
    if(interaction.isButton())
    {
        transaction = pendingTransactions[interaction.message.reference.messageId]
        if(transaction != undefined)
        {
            console.log("Found transaction.")
            if(transaction.userId == interaction.user.id)
            {
                if(interaction.customId == "color_accept") //Accepted color
                {
                    colorPreviewEmbed.setAuthor({ name: "Squid set the color!" });
                    interaction.update({
                        embeds: [colorPreviewEmbed],
                        components: [],
                    });

                    //Create/update our role
                    role = interaction.guild.roles.cache.find(role => role.name === `Squid ${transaction.userId}`);
                    if(role === undefined)
                    {
                        createRole(interaction, transaction).then(function(role) {
                            interaction.member.roles.add(role);
                        });
                    }
                    else
                    {
                        role.edit({
                            color: parseInt(transaction.color, 16),
                        });
                    }
                }
                else //Rejected color
                {
                    colorPreviewEmbed.setAuthor({ name: "Squid wont use this color!" });
                    colorPreviewEmbed.setFooter({ text: "Even though Squid does like it :)" });
                    interaction.update({
                        embeds: [colorPreviewEmbed],
                        components: [],
                    });
                }
                pendingTransactions.splice(pendingTransactions.indexOf(transaction), 1); //Remove the transaction
            }
            else //SHAME them
            {
                transaction.attempts += 1;
                let shameText = "Someone tried to answer for you! Squid stopped them :)";
                if(transaction.attempts > 1)
                    shameText = `${transaction.attempts} people have tried to answer for you! Squid stopped them :)`;

                colorPreviewEmbed.setFooter({ text: shameText });
                interaction.update({
                    embeds: [colorPreviewEmbed]
                });
            }

            resetEmbed();
        }
    }
});