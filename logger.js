const {createLogger, format , transports} = require('winston');

const myFormat = format.printf( ({ level, message, timestamp , ...metadata}) => {
    let msg = `${timestamp} [${level}] : ${message} `  
    if(metadata) {
        msg += JSON.stringify(metadata)
    }
    return msg
});


const logger = createLogger({
    format: format.combine(
        format.colorize(),
        format.timestamp({
            format: 'YYYY-DD-MM HH:mm:ss'
        }),
        format.errors({ stack: true }),
        myFormat
    ),
    transports: [
        new transports.Console(),
        new transports.File({
            name: 'info-file',
            filename: 'info.log',
            level: 'info'
        }),
        new transports.File({
            name: 'error-file',
            filename: 'error.log',
            level: 'error'
        })
    ],
    exitOnError: false
});

module.exports = logger