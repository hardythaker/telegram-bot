const SCOPES = ['https://www.googleapis.com/auth/spreadsheets.readonly'];
const SHEET_NAME="Form Responses 2"
const COLUMNS="A:D"
const LINK_EXPIRES_IN=1 //minutes
const GROUP_ID = "-1001769069041"
const LOGS_GROUP_ID = '-786553495'

const EMOJI = {
    back : "\u{1F519}",
    checkMark : "\u{2705}",
    crossmark : "\u{274C}",
    magnify: "\u{1F50D}",
    memo: "\u{1F4DD}",
    smile: "\u{1F60A}"
}

const GET_GREETING_TEXT = (fullname) => `Hi ${fullname}!
Welcome to Runwal Gardens Owners Group!
\nI am a bot that will verify your status as a customer of Runwal Gardens before you can actually be added to the group. This is done to protect members' data shared in the group.
\nKindly follow the steps below: 
1. Fill the registration form below with accurate details. Click the ${EMOJI.memo}<b>Registration</b> Form button.
2. Once form is filled, click on the ${EMOJI.magnify}<b>Verify</b> button to get yourself verifed.`

const IMAGE_TEXT = `Thank you for filling the form.
\nNow, please send a <b>photo of the first page of your agreement copy.</b> This page should include details like your <b>name, tower and flat number.</b> This can be any page of the agreement or even a <b>screenshot of Runwal Customer Portal mentioning your booking details.</b> The name in the agreement must match the name on your Telegram Profile.
\nWe collect this information so that outsiders cannot join our group and the information you share about you and your flat will be safe and only accessible amongst the other owners and admin.
\n<b>Important Note: This image will be further verified by the group admins, if you're sending anything else other than the requested image, your request to join will be rejected!</b>
\nWhy are we asking for this proof?
 - There is no other method to verify if you are a genuine member. If we don't verify this, tomorrow any random person will join the group putting your information at risk.`

const VERIFICATION_FAILED_TEXT = `Verification Failed.\nPlease make sure you have filled the form correctly and try again.
\nIf you are still facing the issues, kindly type /support in this chat.`

const CHAT_JOIN_REQUEST_TEXT= `Thanks for providing the requested information!
\nNow, please click on the button below to request to join the group.
\n<b>Note: The button is valid only for 1 minute.</b>`

const VERIFICATION_SUCCESS_TEXT=`Congrats!!! Your request has been approved and you have been added to the group! ${EMOJI.smile}`

const VERIFICATION_REJECT_TEXT=`Your Request to Join the group has been Rejected!!!
\nYou can again start the verification by sending /start command to this bot.
\nPlease make sure you have filled the Google Form with correct data and you are sending the first page of the agreement, to avoid rejection of Joining Request`

const PHOTO_BEFORE_VERIFICATION_TEXT=`Alert!!!\n\nYou have not filled the form or verified.\nKindly first fill the form, click on verify button and then upload the image.`

const APPROVE_BY_ADMINS_ONLY_TEXT="Only Admins are allowed to perform this operation!!!"

const GET_CAPTION_TEXT = (sessionRow) => `Google Form Data
UserId: ${sessionRow[3]}
Name: ${sessionRow[1]} ${sessionRow[2]}
`

module.exports = { SCOPES, SHEET_NAME, COLUMNS, LINK_EXPIRES_IN, LOGS_GROUP_ID, EMOJI, VERIFICATION_SUCCESS_TEXT,PHOTO_BEFORE_VERIFICATION_TEXT,APPROVE_BY_ADMINS_ONLY_TEXT,
    VERIFICATION_REJECT_TEXT, GET_GREETING_TEXT, GROUP_ID, IMAGE_TEXT, VERIFICATION_FAILED_TEXT, CHAT_JOIN_REQUEST_TEXT, GET_CAPTION_TEXT}