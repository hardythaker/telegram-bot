const SCOPES = ['https://www.googleapis.com/auth/spreadsheets.readonly'];
const SHEET_NAME="Form Responses 2"
const COLUMNS="A:D"
const LINK_EXPIRES_IN=1 //minutes
const GROUP_ID = "-1001769069041"
const LOGS_GROUP_ID = '-786553495'

const GET_GREETING_TEXT = (fullname) => `Hi ${fullname}
Welcome to the group!
Kindly fill below google form to get access to groups chat.
Once done, Kindly click on verify button to get yourself verifed.`

const IMAGE_TEXT = `Thank you for filling out the form,
\nKindly Send the photo of the first page of your agrement.
\nPlease note that first page of agreement does not contain any of your personal infomation. We are collecting this information so that outsider cannot join the our group and your information realted to you and your flat will be safe and only accessible amongst the other owners. Please make sure you are only uploading first page of agreement and not other pages.
\n<b>Note:</b> This image will be further verified by the group admins, if you're sending anything else other than first page of the agreement, your request will be rejected!!!
\nBut why only first page of aggreement?
-As of now we dont have any other mechanism to verify the member.`

const VARIFICATION_FAILED_TEXT = `Verification Failed.\nPlease make sure you have filled the form correctly and try again.
\nIf you are still facing the issues, kindly type /help in this chat.`

const CHAT_JOIN_REQUEST_TEXT= `Thanks for providing the image!!!\n\nKindly click on below button to request to join the group
\n<b>Note:</b> Link is valid only for 1 minute`

const GET_CAPTION_TEXT = (sessionRow) => `@admin\nGoogle Form Data
UserId: ${sessionRow[3]}
Name: ${sessionRow[1]} ${sessionRow[2]}
`

module.exports = { SCOPES, SHEET_NAME, COLUMNS, LINK_EXPIRES_IN, LOGS_GROUP_ID,
    GET_GREETING_TEXT, GROUP_ID, IMAGE_TEXT, VARIFICATION_FAILED_TEXT, CHAT_JOIN_REQUEST_TEXT, GET_CAPTION_TEXT}