const { Telegraf } = require('telegraf');
const bot = new Telegraf('5263981534:AAE7p1XMQSSJGwDPGAZ9NBggZ8bM_OTZfrE');

const users = [
    {first_name: 'Rithu', last_name: 'Dhanki', user_id: 910940623},
    {first_name: 'Hardik', last_name: 'Thaker', user_id: 839771850}
]

bot.command('/allowedall',(ctx, next)=>{
    console.log(ctx.from);
    bot.telegram.restrictChatMember('-1001769069041','910940623',{
        can_send_messages : true
    })
})

bot.action('verify',async (ctx)=>{
    console.log(ctx)
    const cq = ctx.callbackQuery;
    console.log(cq.from)
    const user_id = cq.from.id;
    console.log(cq.message)
    const chatId = cq.message.chat.id;
    try {
        if(users[0].user_id == user_id){
            await setUserChatPermission(chatId,user_id, true)
            await bot.telegram.answerCbQuery(cq.id)
            await bot.telegram.editMessageText(chatId,cq.message.message_id,"","You are now verified")
        }
        else{
            await setUserChatPermission(chatId,user_id, false)
        }
    } catch (e) {
        console.error(e);
    }
})

bot.command('googlelink', async (ctx) => {
    try {
        // Logic goes here...
        await setUserChatPermission(ctx.chat.id, ctx.from.id, false);
        const url = `https://docs.google.com/forms/d/e/1FAIpQLSeXAzhaoknOqxzVFPfynjtqARjZnooPw1NjR82ENxEJyBWXDg/viewform?entry.1312478144=${ctx.from.id}`
        await bot.telegram.sendMessage(ctx.chat.id, "Kindly fill below google form link",{
            reply_markup:{
                inline_keyboard:[
                    [
                        {text:'Google form', url }
                    ],
                    [
                        {text:'Verify', callback_data:'verify' }
                    ]
                ]
            }
        })
    } catch (e) {
        console.error(e);
    }
});

async function setUserChatPermission(chatId, userId, sendPermission){
    await bot.telegram.restrictChatMember(chatId,userId,{
        can_send_messages : sendPermission
    })
}

bot.launch();


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