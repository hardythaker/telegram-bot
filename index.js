//TODO: How to hide all the previous messages from a new joined users and show after verification
//TODO: Instead of user_ID we can store telegram username as well in sheet, but what is user changes its user name
//TODO: Time limt for all the messages from the bot
//TODO: Varification failed message should updated the same greting message.
//TODO: Need to provide some fallback mechanism if user verification gets failed multiple times.
//TODO: LOW: Remove the google form data if user lefts the group
//OR
//TODO: Initiate first user interaction with bot. This will slove the 1st TODO issue.
//TODO: Bot will send the Invite user link to the verified user.
//TODO: Verification can be of two types: Only GForm and GForm & Photo. Where, the former, will be verified by the bot.
//TODO: Option to set that which verification method to be used.
//TODO: BOT Initial Welcome message. Even before start cmd.
//


//Only for development browser testing
const express = require('express');
const http = require('http');
const hostname = 'localhost';
const port = 3000;
const app = express();
let LOGS = [];
let DATA;
//END

const { Telegraf } = require('telegraf');
const {google} = require('googleapis');
const {TOKEN, SCOPES, SPREADSHEETID, SHEETNAME, USER_ID_COLUMN, GOOGLE_FORM_ID, LINK_EXPIRES_IN, GET_GREETING_TEXT} = require('./config');

const bot = new Telegraf(TOKEN);

bot.start(async (ctx) => {
    console.log('Start')
    browserLog(ctx)

    try {
        const chatId = ctx.chat.id
        const newMemberId = ctx.from.id
        const newMemberFirstName = ctx.from.first_name
        const newMemberLastName = ctx.from.last_name || ''
        const fullname = `${newMemberFirstName} ${newMemberLastName}`
        const url = `${GOOGLE_FORM_ID}${newMemberId}`

        //await setUserChatPermission(chatId, newMemberId, false);
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
            // reply_to_message_id: ctx.message.message_id,
            // allow_sending_without_reply: true
        })
    } catch (e) {
        await bot.telegram.sendMessage(e.on.payload.chat_id, e.response.description)
        console.error(e);
    }
});

//This fn is to verify that the user has filled the google form or not.
bot.action('verify',async (ctx)=>{
    console.log('verify')
    const cq = ctx.callbackQuery;
    //console.log(cq.from)
    const user_id = cq.from.id;
    const name = `${cq.from.first_name} ${cq.from.last_name}`;
    //console.log(cq.message)
    const chatId = cq.message.chat.id;
    try {
        if(await getGoogleSheetData(user_id)){
            //await setUserChatPermission(chatId,user_id, true)
            await bot.telegram.answerCbQuery(cq.id)
            const link = await bot.telegram.createChatInviteLink('-1001769069041',{
                name: `Link for ${user_id}-${name}`,
                creates_join_request: true,
                //member_limit: 1,
                expire_date: Math.floor((Date.now()/1000) + (LINK_EXPIRES_IN*60))
            })
            //console.log(inviteLink);
            await bot.telegram.editMessageText(chatId,cq.message.message_id,"",`You are now verified,\nKindly join the group using below link\n\nNOTE: Link is valid for only one minute`,
            {
                reply_markup:{
                    inline_keyboard:[
                        [
                            {text:'Join Group', url:link.invite_link }
                        ]
                    ]
                },
            })
        }
        else{
            await bot.telegram.sendMessage(chatId,"Verification Failed. Please try again..")
        }
    } catch (e) {
        console.error(e);
    }
})

//Once the user click on "Join Group" btn, It will trigger this event.
bot.on('chat_join_request', async(ctx)=>{
    console.log('chat_join_request');
    browserLog(ctx);


    const revokedlink = await ctx.revokeChatInviteLink(ctx.chatJoinRequest.invite_link.invite_link);

    browserLog(revokedlink);
})

//Once the user is approved and added to the group, It will trigger this event.
bot.on('new_chat_members', async (ctx) => {
    console.log('new_chat_members');
    browserLog(ctx)
    //log(ctx)
    //console.log(ctx);
    //const update = await bot.telegram.getUpdates('','',''['chat_member']);
    // bot.telegram.getUpdates(50,1,1,['chat_member']).then((res)=>{
    //     console.log(res)
    //     log(res)
    // })
    //console.log(update);
    //log(update)
})

//This will Run on both Join as well as Left Event
bot.on('chat_member',async (ctx)=>{
    console.log('chat_member ' + ctx.chatMember.new_chat_member.status);
    browserLog(ctx)
})

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

bot.launch({
    allowedUpdates:['chat_member','callback_query','chat_join_request','message']
});
// Enable graceful stop
process.once('SIGINT', () => bot.stop('SIGINT'))
process.once('SIGTERM', () => bot.stop('SIGTERM'))


//Only for development browser testing
const browserLog = (data) => { 
    LOGS.push(data);
    DATA = JSON.stringify(LOGS)
}

app.use((req, res, next) => {
    res.end(DATA);
}); 

const server = http.createServer(app);
server.listen(port, hostname, () => {
  console.log(`Server running at http://${hostname}:${port}/`);
});
//END