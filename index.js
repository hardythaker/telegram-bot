//TODO: How to hide all the previous messages from a new joined users and show after verification
//TODO: Instead of user_ID we can store telegram username as well in sheet, but what is user changes its user name
const { Telegraf } = require('telegraf');
const {google} = require('googleapis');
const {TOKEN, SCOPES, SPREADSHEETID, SHEETNAME, USER_ID_COLUMN, GOOGLE_FORM_ID} = require('./config')

const bot = new Telegraf(TOKEN);

// bot.command('/allowedall',(ctx, next)=>{
//     //console.log(ctx.from);
//     bot.telegram.restrictChatMember('-1001769069041','910940623',{
//         can_send_messages : true
//     })
// })

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
        // console.log(ctx)
        // console.log(ctx.from)
        // console.log(ctx.chat)
        // console.log(ctx.message.new_chat_participant)
        // console.log(ctx.message.new_chat_member)
        // console.log(ctx.message.new_chat_members)
        const chatId = ctx.chat.id
        const newMemberId = ctx.message.new_chat_member.id
        const fromId = ctx.from.id
        const newMemberFirstName = ctx.message.new_chat_member.first_name
        const newMemberLastName = ctx.message.new_chat_member.last_name

        await setUserChatPermission(chatId, newMemberId, false);
        const url = `${GOOGLE_FORM_ID}${newMemberId}`
        await bot.telegram.sendMessage(chatId, 
            `Hi ${newMemberFirstName} ${newMemberLastName},\nWelcome to the group!\nKindly fill below google form to get access to groups chat.\nOnce done, Kindly click on verify button to get yourself verifed.`,
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
    
    // const metadata = await sheets.spreadsheets.get({
    //     spreadsheetId: SPREADSHEETID
    // })

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

// const approvedUsers = [];

// bot.on('message',(ctx)=>{
//     console.log(ctx)
//     console.log(ctx.chat.id)
//     const fullName = (ctx.from.first_name + ctx.from.last_name).toLocaleLowerCase()
//     const localFullName = (users[0].first_name + users[0].last_name).toLocaleLowerCase()
//     if(fullName === localFullName && users.findIndex(x=> x.first_name == )){
//         return
//     }
//     //bot.telegram.sendMessage(ctx.chat.id,"You are not authenticed user!!")
// })

// bot.command('link',(ctx, next) => {
//     console.log(ctx.message.chat)
//     bot.telegram.sendMessage(ctx.chat.id, "Kindly click on below button to generate your google form link",{
//         reply_markup:{
//             inline_keyboard:[
//                 [
//                     {text:"Form", callback_data: 'sendGoogleFormLink'}
//                 ],
//             ]
//         }
//     })
//     // bot.telegram.sendPhoto(
//     //     '-1001769069041',
//     //     ctx.message.photo[ctx.message.photo.length - 1].file_id,
//     //     {
//     //         reply_markup:{
//     //             inline_keyboard:[
//     //                 [
//     //                     {text:"Approve", callback_data: 'approve'}
//     //                 ],
//     //                 [
//     //                     {text:"Reject", callback_data: 'reject'}
//     //                 ]
//     //             ]
//     //         }
//     //     }
//     // )
// })

// bot.start((ctx=>{
//     bot.telegram.sendMessage(ctx.chat.id,"Upload your image")
// }))