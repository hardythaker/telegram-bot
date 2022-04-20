//TODO: Time limt for all the messages from the bot
//TODO: Need to provide some fallback mechanism if user verification gets failed multiple times.
//TODO: LOW: Remove the google form data if user lefts the group
//TODO: LOW: Option to set that which verification method to be used.
//TODO: DONE: Let user know that there Request is approved or not. and provide fallback.
//TODO: FIXED: Bot Should not act or read on the messages sent in the group. //Fixed for /start and Photo Event on which bot reacts.
//TODO: Remove await where ever required and test. lets try with the methods which are not using any variables
//TODO: LOW: Error logging to a seprate admin group.
//TODO: TESTING on multiple devices at same time. Working so far with 2 simultanious requests
//TODO: Integrate Winston with Event, UserID, Time format
//TODO: Webpack to min the script
//TODO: PROD - DEV diffrentiate to run express or not
//*******************************************************
//TODO: DONE: Need to clear the session after rejecting the Request
//*******************************************************

//Only for development browser testing
const browserLog = require('./web');
//END

const { Telegraf } = require('telegraf');
const LocalSession = require('telegraf-session-local')
const {google} = require('googleapis');
const {SCOPES, SHEET_NAME, COLUMNS, LINK_EXPIRES_IN, GET_GREETING_TEXT, GROUP_ID,
    IMAGE_TEXT, VARIFICATION_FAILED_TEXT, CHAT_JOIN_REQUEST_TEXT, GET_CAPTION_TEXT} = require('./constants');

const bot = new Telegraf(process.env.BOT_TOKEN);

const localSession = new LocalSession({ 
    database: 'example_db.json',
    getSessionKey : (ctx) => ctx.from.id
})

const emoji = {
    back : "\u{1F519}",
    checkMark : "\u{2705}",
    crossmark : "\u{274C}",
    magnify: "\u{1F50D}"
}

const approveRejectKeyboard = {
    inline_keyboard:[
        [{text:`${emoji.checkMark} Approve`, callback_data: 'approve'}],
        [{text:`${emoji.crossmark} Reject`, callback_data: 'reject'}]
    ]
}

const confirmRejectGoBackKeyboard = {
    inline_keyboard:[
        [
            {text:'Confirm Reject? Yes', callback_data:'confirmReject' }
        ],
        [
            {text: `${emoji.back} Go Back`, callback_data:'goBack' }
        ]
    ]
}

bot.start(async (ctx) => {
    console.log('Start')
    browserLog("Start", ctx)

    //To avoid listening commands or messages in group chat
    if(ctx.chat.type != 'private') return null 
    try {
        const ctxFrom = ctx.from
        const fullname = `${ctxFrom.first_name} ${ctxFrom.last_name || ''}`
        const url = `${process.env.GOOGLE_FORM_URL}${ctxFrom.id}`

        await ctx.reply(GET_GREETING_TEXT(fullname),{
            reply_markup:{
                inline_keyboard:[
                    [{text:'Form', url }],
                    [{text:`${emoji.magnify} Verify`, callback_data:'verify' }]
                ]
            },
            parse_mode: 'HTML',
        })
    } catch (e) {
        console.error(e);
        await ctx.reply(e.response.description)
    }
});

bot.use(localSession.middleware())

//Verify that the user has filled the google form or not.
bot.action('verify',async (ctx)=>{
    console.log('verify')
    browserLog("Verify", ctx)
    try {
        const formData = await verifyAndGetFormData(ctx.callbackQuery.from.id)

        //User's Form data is required while sending out the image in group with the caption
        //That caption will contain the name, userid etc extracted from this formData.
        ctx.session.formData = formData

        if(formData){
            await ctx.editMessageText(IMAGE_TEXT,{parse_mode:'HTML'})
            await ctx.answerCbQuery()
        }
        else{
            await ctx.answerCbQuery(VARIFICATION_FAILED_TEXT,{show_alert: true})
        }
    } catch (e) {
        console.error(e);
        await ctx.reply(e.response.description)
    }
})

//Once Received Photo from the user, send a chat invite link
bot.on('photo',async (ctx)=>{
    //To avoid listening commands or messages in group chat
    if(ctx.chat.type != 'private') return null 
    console.log('photo');
    browserLog("Photo",ctx)
    try{
        //To avoid user uploading the image even if the form fillup and verification is not done.
        if(!ctx.session.formData){
            return ctx.reply("Alert!!!\n\nKindly first fill the form, click on verify button and then upload the image.")
        }
        
        //Contains the photo url uploaded by the client  
        const photos = ctx.message.photo
        //Photo URL will be required later, once user creates a Group Joining Request via bot.
        ctx.session.photoURL = photos[photos.length - 1].file_id;

        const link = await generateChatInviteLink(ctx.from.id, ctx.from.first_name)

        await ctx.reply(CHAT_JOIN_REQUEST_TEXT,{
            reply_markup:{
                inline_keyboard:[
                    [{text:`Join Group`, url:link.invite_link }]
                ]
            },
            parse_mode: 'HTML'
        })
    }
    catch(e){
        console.error(e);
        await ctx.reply(e.response.description)
    }
})

//Once the user click on "Join Group" btn, It will trigger this event.
//Revoke the invite link once user make a 'Join Request'
bot.on('chat_join_request', async(ctx)=>{
    console.log('chat_join_request');
    browserLog("chat_join_request",ctx);

    try{
        //Revoke the link, so that other user cannot make request using same link
        await ctx.revokeChatInviteLink(ctx.chatJoinRequest.invite_link.invite_link);

        //Extract the photoUrl and formData from the users' session so that it can be added into the image's caption
        const session = ctx.session;
        await ctx.replyWithPhoto(
            session.photoURL,
            {
                reply_markup:approveRejectKeyboard,
                caption: GET_CAPTION_TEXT(session.formData),
                protect_content: true
            }
        )
    }
    catch(e){
        console.error(e);
        await ctx.reply(e.response.description)
    }
})

//Check if the 'Approve' and 'Reject' events are indeed performed by admins. Alert others
bot.action(['approve','reject'], async(ctx,next)=>{
    console.log("middleware",ctx.callbackQuery.data);
    try{
        const admins = await ctx.getChatAdministrators()
        //browserLog(`Admins - ${ctx.callbackQuery.data}`,admins)
        
        //If request is from any admin, let it pass to next middleware
        if(admins.some(x=> x.user.id == ctx.callbackQuery.from.id)){
            return next(ctx);
        }

        //If request is not from admins, show the alert.
        ctx.answerCbQuery("Only Admins are allowed to perform this operation!!!",{
            show_alert: true
        })

    }
    catch(e){
        console.error(e);
        await ctx.reply(e.response.description)
    }
})

//Approve the user's joining request
bot.action('approve', async(ctx)=>{
    console.log('Approve');
    browserLog("Approved Request", ctx)
    
    try{
        const cq = ctx.callbackQuery;
        const caption = cq.message.caption;
        const name = `${cq.from.first_name} ${cq.from.last_name || ''}`
        const userId = getUserIdFromCaption(caption);

        if(await ctx.approveChatJoinRequest(userId)){
            await ctx.editMessageCaption(`${caption}\nApproved by ${name}`,{reply_markup:{}})
        }
        else{
            ctx.answerCbQuery('Error: User aprroval failed!!!',{show_alert: true});
        }
    }
    catch(e){
        console.error(e);
        await ctx.reply(e.response.description)
    }
    finally{
        ctx.answerCbQuery();
    }
})

//Show confirmRejectGoBackKeyboard as a confirmation
bot.action('reject', async(ctx)=>{
    console.log('reject');
    browserLog("Reject Request",ctx);
    
    try{
        await ctx.editMessageCaption(`${ctx.callbackQuery.message.caption}`,{
            reply_markup:confirmRejectGoBackKeyboard,
            parse_mode: 'HTML'
        })
    }
    catch(e){
        console.error(e);
        await ctx.reply(e.response.description)
    }
    finally{
        await ctx.answerCbQuery();
    }
})

//Provide back functionality after Reject Confirmation
bot.action('goBack', async (ctx)=>{
    console.log("goback");
    browserLog("Go Back",ctx)

    try{
        await ctx.editMessageCaption(ctx.callbackQuery.message.caption,{reply_markup: approveRejectKeyboard,parse_mode:'HTML'})
    }
    catch(e){
        console.error(e);
        await ctx.reply(e.response.description)
    }
    finally{
        await ctx.answerCbQuery()
    }
})

//Reject the user's Chat Joining Request
bot.action('confirmReject', async(ctx)=>{
    //await ctx.declineChatJoinRequest()
    const cq = ctx.callbackQuery;
    const caption = cq.message.caption;
    const name = `${cq.from.first_name} ${cq.from.last_name}`;
    const userId = getUserIdFromCaption(caption);

    try{
        if(await ctx.declineChatJoinRequest(userId)){
            //Remove the session of the Rejected User
            localSession.DB.get('sessions').removeById(userId).write()
            //Update in the group that who rejected
            await ctx.editMessageCaption(`${caption}\nRejected by ${name}`,{reply_markup:{}})
            //Inform the user
            await ctx.telegram.sendMessage(userId,`Your Request to Join the group has been Rejected!!!
\nYou can again start the verification by sending <code>/start</code> command to this bot.
\nPlease make sure you have filled the Google Form with correct data and you are sending the first page of the agreement, to avoid rejection of Joining Request`)
        }
        else{
            ctx.answerCbQuery('Error: User Rejection failed!!!',{show_alert: true});
        }
    }
    catch(e){
        console.error(e);
        await ctx.reply(e.response.description)
    }
    finally{
        await ctx.answerCbQuery()
    }
})

//Once the user is approved and added to the group, It will trigger this event.
bot.on('new_chat_members', async (ctx) => {
    console.log('new_chat_members');
    browserLog('new_chat_members',ctx)
    
    const formData = ctx.session.formData;
    ctx.telegram.sendMessage(formData[formData.length-1],'Your Request to Join the group has been Approved!!!')
    //Clear the user session since user has joined the group
    ctx.session = null
})

//This will Run on both Join as well as Left Event
// bot.on('chat_member',async (ctx)=>{
//     console.log('chat_member ' + ctx.chatMember.new_chat_member.status);
//     browserLog('chat_member ' + ctx.chatMember.new_chat_member.status,ctx)
// })

// async function setUserChatPermission(chatId, userId, sendPermission){
//     await bot.telegram.restrictChatMember(chatId,userId,{
//         can_send_messages : sendPermission
//     })
// }

//Fecth data from google sheets and verify if the user is exists or not
async function verifyAndGetFormData(user_id){
    const auth = new google.auth.GoogleAuth({
        keyFile: process.env.GOOGLE_APPLICATION_CREDENTIALS,
        scopes: SCOPES,
    })
    auth.fromJSON
    const client = await auth.getClient();
    
    const sheets = google.sheets({version: 'v4', auth: client});

    const data = await sheets.spreadsheets.values.get({
        auth,
        spreadsheetId: process.env.SPREADSHEET_ID,
        range:`${SHEET_NAME}!${COLUMNS}`
    })
    const row = data.data.values.find(x=> x.some(y => y == user_id));
    console.log(row);
    return row;
}

async function generateChatInviteLink(user_id, name){
    return await bot.telegram.createChatInviteLink(GROUP_ID,{
        name: `${user_id} ${name}`,
        creates_join_request: true,
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
    return userId;
}

bot.launch({
    allowedUpdates:['chat_member','callback_query','chat_join_request','message']
});

// if (process.env.NODE_ENV === 'production') {
//     bot = new TelegramBot(token);
//     bot.setWebHook(process.env.HEROKU_URL + bot.token);
// } else {
//     bot = new TelegramBot(token, { polling: true });
// }
// Enable graceful stop
process.once('SIGINT', () => bot.stop('SIGINT'))
process.once('SIGTERM', () => bot.stop('SIGTERM'))

