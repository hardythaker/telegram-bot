//TODO: Instead of user_ID we can store telegram username as well in sheet, but what if user changes its user name
//TODO: Time limt for all the messages from the bot
//TODO: Varification failed message should updated the same greting message.
//TODO: Need to provide some fallback mechanism if user verification gets failed multiple times.
//TODO: LOW: Remove the google form data if user lefts the group
//TODO: Option to set that which verification method to be used.
//TODO: Let user know that there Request is approved or not. and provide fallback

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
const LocalSession = require('telegraf-session-local')
const {google} = require('googleapis');
const {TOKEN, SCOPES, SPREADSHEETID, SHEETNAME, USER_ID_COLUMN, 
    GOOGLE_FORM_ID, LINK_EXPIRES_IN, GET_GREETING_TEXT, GROUP_ID,
    IMAGE_TEXT, VARIFICATION_FAILED_TEXT, CHAT_JOIN_REQUEST_TEXT,
    GET_CAPTION_TEXT} = require('./config');

const bot = new Telegraf(TOKEN);

const localSession = new LocalSession({ 
    database: 'example_db.json',
    getSessionKey : (ctx) => ctx.from.id
})
bot.use(localSession.middleware())

const emoji = {
    back : "\u{1F519}",
    checkMark : "\u{2705}",
    crossmark : "\u{274C}",
    magnify: "\u{1F50D}"
}

const approveRejectKeyboard = {
    inline_keyboard:[
        [
            {text:`${emoji.checkMark} Approve`, callback_data: 'approve'}
        ],
        [
            {text:`${emoji.crossmark} Reject`, callback_data: 'reject'}
        ]
    ]
}

bot.start(async (ctx) => {
    console.log('Start')
    browserLog("start",ctx)

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
                        {text:`${emoji.magnify} Verify`, callback_data:'verify' }
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
    //const name = `${cq.from.first_name} ${cq.from.last_name}`;
    //const chatId = cq.message.chat.id;
    try {
        const googleSheetRow = await getGoogleSheetData(ctx.callbackQuery.from.id)
        ctx.session.formData = googleSheetRow

        if(googleSheetRow){
            await ctx.editMessageText(IMAGE_TEXT,{parse_mode:'HTML'})
            await ctx.answerCbQuery()
            //await bot.telegram.editMessageText(chatId,cq.message.message_id,"",mess)
        }
        else{
            await ctx.answerCbQuery(VARIFICATION_FAILED_TEXT,{show_alert: true})
            //await ctx.answerCbQuery(chatId,)
        }
    } catch (e) {
        console.error(e);
    }
})

bot.on('photo',async (ctx)=>{
    console.log('photo');
    browserLog("Photo",ctx)

    ctx.session.photoURL = ctx.message.photo[ctx.message.photo.length - 1].file_id;
    const link = await generateChatInviteLink(ctx.from.id, ctx.from.first_name)

    browserLog("Link",link)
    await bot.telegram.sendMessage(ctx.chat.id, CHAT_JOIN_REQUEST_TEXT,{
        reply_markup:{
            inline_keyboard:[
                [
                    {text:`Join Group`, url:link.invite_link }
                ]
            ]
        },
        parse_mode: 'HTML'
    })
})

//Once the user click on "Join Group" btn, It will trigger this event.
//Revoke the invite link once user make a 'Join Request'
bot.on('chat_join_request', async(ctx)=>{
    console.log('chat_join_request');
    browserLog("chat_join_request",ctx);

    await ctx.revokeChatInviteLink(ctx.chatJoinRequest.invite_link.invite_link);

    const session = ctx.session;
    await ctx.replyWithPhoto(
        session.photoURL,
        {
            reply_markup:approveRejectKeyboard,
            caption: GET_CAPTION_TEXT(session.formData),
            protect_content: true
        }
    )
})

bot.action(['approve','reject'],async(ctx,next)=>{
    console.log("middleware",ctx.callbackQuery.data);
    const admins = await ctx.getChatAdministrators()
    browserLog(`Admins - ${ctx.callbackQuery.data}`,admins)
    if(admins.some(x=> x.user.id == ctx.callbackQuery.from.id)){
        return next(ctx);
    }
    ctx.answerCbQuery("Only Admins are allowed to perform this operation!!!",{
        show_alert: true
    })
})

bot.action('approve', async(ctx)=>{
    console.log('Approve');
    browserLog("Approved Request", ctx)
    
    const cq = ctx.callbackQuery;
    const caption = cq.message.caption;
    const name = `${cq.from.first_name} ${cq.from.last_name}`
    const userId = getUserIdFromCaption(caption);
    if(await ctx.approveChatJoinRequest(userId)){
        await ctx.editMessageCaption(`${caption}\nApproved by ${name}`,{
            reply_markup:{}
        })
    }
    else{
        ctx.reply('Error: User aprroval failed!!!')
    }
    await bot.telegram.answerCbQuery(cq.id)
})

bot.action('reject', async(ctx)=>{
    console.log('reject');
    browserLog("Reject Request",ctx);
    
    const cq = ctx.callbackQuery;
    const caption = cq.message.caption;
    await ctx.editMessageCaption(`${caption}`,{
        reply_markup:{
            inline_keyboard:[
                [
                    {text:'Confirm Reject? Yes', callback_data:'confirmReject' }
                ],
                [
                    {text: `${emoji.back} Go Back`, callback_data:'goBack' }
                ]
            ]
        },
        parse_mode: 'HTML'
    })
    await ctx.answerCbQuery();
})

bot.action('goBack', async (ctx)=>{
    console.log("goback");
    browserLog("Go Back",ctx)

    await ctx.editMessageCaption(ctx.callbackQuery.message.caption,{reply_markup: approveRejectKeyboard,parse_mode:'HTML'})
    await ctx.answerCbQuery()
})

bot.action('confirmReject', async(ctx)=>{
    //await ctx.declineChatJoinRequest()
    const cq = ctx.callbackQuery;
    const caption = cq.message.caption;
    const name = `${cq.from.first_name} ${cq.from.last_name}`;
    const userId = getUserIdFromCaption(caption);

    if(await ctx.declineChatJoinRequest(userId)){
        console.log(ctx.session)
        await ctx.editMessageCaption(`${caption}\nRejected by ${name}`,{reply_markup:{}})
    }
    else{
        ctx.reply('Error: User aprroval failed!!!')
    }
    await bot.telegram.answerCbQuery(cq.id)
})

//Once the user is approved and added to the group, It will trigger this event.
bot.on('new_chat_members', async (ctx) => {
    console.log('new_chat_members');
    browserLog('new_chat_members',ctx)
    ctx.session = null
})

//This will Run on both Join as well as Left Event
bot.on('chat_member',async (ctx)=>{
    console.log('chat_member ' + ctx.chatMember.new_chat_member.status);
    browserLog('chat_member ' + ctx.chatMember.new_chat_member.status,ctx)
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
        range:`${SHEETNAME}!${USER_ID_COLUMN}`
    })
    const row = data.data.values.find(x=> x.some(y => y == user_id));
    console.log(row);
    return row;
}

async function generateChatInviteLink(user_id, name){
    return await bot.telegram.createChatInviteLink(GROUP_ID,{
        name: `${user_id} ${name}`,
        creates_join_request: true,
        //member_limit: 1,
        expire_date: Math.floor((Date.now()/1000) + (LINK_EXPIRES_IN*60))
    })
}

function getUserIdFromCaption(caption){
    const regex = /UserID:\s*\d*/i;
    let m, userId = null;
    if ((m = regex.exec(caption)) !== null) {
        userId = m[0].split(':')[1].trim()
    }
    else{
        console.log('Error: Unable to find User Id!!!')
    }
    console.log(userId);
    return userId;
}

bot.launch({
    allowedUpdates:['chat_member','callback_query','chat_join_request','message']
});
// Enable graceful stop
process.once('SIGINT', () => bot.stop('SIGINT'))
process.once('SIGTERM', () => bot.stop('SIGTERM'))

//Only for development browser testing
// safely handles circular references
JSON.safeStringify = (obj, indent = 2) => {
    let cache = [];
    const retVal = JSON.stringify(
      obj,
      (key, value) =>
        typeof value === "object" && value !== null
          ? cache.includes(value)
            ? undefined // Duplicate reference found, discard key
            : cache.push(value) && value // Store value in our collection
          : value,
      indent
    );
    cache = null;
    return retVal;
  };


const browserLog = (key, data) => { 
    LOGS.push({[key]: data});
    DATA = JSON.safeStringify(LOGS)
}

app.use((req, res, next) => {
    res.end(DATA);
}); 

const server = http.createServer(app);
server.listen(port, hostname, () => {
  console.log(`Server running at http://${hostname}:${port}/`);
});
//END