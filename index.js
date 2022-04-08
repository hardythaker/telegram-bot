//TODO: How to hide all the previous messages from a new joined users and show after verification
//TODO: Instead of user_ID we can store telegram username as well in sheet, but what is user changes its user name
//TODO: Time limt for all the messages from the bot
//TODO: Varification failed message should updated the same greting message.
//TODO: Need to provide some fallback mechanism if user verification gets failed multiple times.
//TODO: LOW: Remove the google form data if user lefts the group
//
const { Telegraf } = require('telegraf');
const {google} = require('googleapis');
const {TOKEN, SCOPES, SPREADSHEETID, SHEETNAME, USER_ID_COLUMN, GOOGLE_FORM_ID, GET_GREETING_TEXT} = require('./config')

const bot = new Telegraf(TOKEN);

bot.action('verify',async (ctx)=>{
    //console.log(ctx)
    const cq = ctx.callbackQuery;
    //console.log(cq.from)
    const user_id = cq.from.id;
    //console.log(cq.message)
    const chatId = cq.message.chat.id;
    
    try {
        if(await getGoogleSheetData(user_id)){
            await setUserChatPermission(chatId,user_id, true)
            await bot.telegram.answerCbQuery(cq.id)
            await bot.telegram.editMessageText(chatId,cq.message.message_id,"","You are now verified")
        }
        else{
            await bot.telegram.sendMessage(chatId,"Verification Failed. Please try again..")
        }
    } catch (e) {
        console.error(e);
    }
})

bot.on('new_chat_members', async (ctx) => {
    try {
        const chatId = ctx.chat.id
        const newMemberId = ctx.message.new_chat_member.id
        const newMemberFirstName = ctx.message.new_chat_member.first_name
        const newMemberLastName = ctx.message.new_chat_member.last_name
        const fullname = `${newMemberFirstName} ${newMemberLastName}`
        await setUserChatPermission(chatId, newMemberId, false);
        const url = `${GOOGLE_FORM_ID}${newMemberId}`
        await bot.telegram.sendMessage(chatId, GET_GREETING_TEXT(fullname),
            {
                reply_markup:{
                    inline_keyboard:[
                        [
                            {text:'Form', url }
                        ],
                        [
                            {text:'Verify', callback_data:'verify' }
                        ]
                    ]
                },
                parse_mode: 'HTML',
                reply_to_message_id: ctx.message.message_id,
                allow_sending_without_reply: true
            })
    } catch (e) {
        await bot.telegram.sendMessage(e.on.payload.chat_id, e.response.description)
        console.error(e);
    }
});

async function setUserChatPermission(chatId, userId, sendPermission){
    await bot.telegram.restrictChatMember(chatId,userId,{
        can_send_messages : sendPermission
    })
}

async function getGoogleSheetData(user_id){
    const auth = new google.auth.GoogleAuth({
        keyFile: "credentials.json",
        scopes: SCOPES
    })
    const client = await auth.getClient();
    
    const sheets = google.sheets({version: 'v4', auth: client});

    const data = await sheets.spreadsheets.values.get({
        auth,
        spreadsheetId: SPREADSHEETID,
        range:`${SHEETNAME}!${USER_ID_COLUMN}`,
    })
    console.log(data.data.values);
    return data.data.values.some(x => x == user_id);
}

bot.launch();

// Enable graceful stop
process.once('SIGINT', () => bot.stop('SIGINT'))
process.once('SIGTERM', () => bot.stop('SIGTERM'))