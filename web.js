const express = require('express');
const http = require('http');
const hostname = 'localhost';
const port = 3000;
const app = express();
let LOGS = [];
let DATA;

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

module.exports = browserLog