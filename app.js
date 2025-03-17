const express = require("express");
const http = require("http"); 

const app = express();  
const server = http.createServer(app);  

const bodyParser = require("body-parser");
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

const handlebars = require("express-handlebars");
app.set("view engine", "hbs");
app.engine(
    "hbs",
    handlebars.engine({
        extname: "hbs",
    })
);


app.use(express.static("public"));
const mongo_uri = 'mongodb+srv://aj:xmCFFM4hhEkgeq1w@signinfast.gu10i.mongodb.net/?retryWrites=true&w=majority&appName=SignInFAST';
const mongoose = require('mongoose');
mongoose.connect(mongo_uri);

const session = require('express-session');
const mongoStore = require('connect-mongodb-session')(session);

app.use(session({
    secret: 'FAST',
    saveUninitialized: true,
    resave: false,
    store: new mongoStore({
        uri: mongo_uri,
        collection: 'sessions',
        expires: 21*24*60*60*1000
    })
}));

const controllers = ['routes'];
for (var i = 0; i < controllers.length; i++) {
    const ctrl = require('./controllers/' + controllers[i]);
    ctrl.add(app, server);
}

function finalClose() {
    mongoose.connection.close();
    process.exit();
}

process.on('SIGTERM', finalClose);
process.on('SIGINT', finalClose);
process.on('SIGQUIT', finalClose);

const port = process.env.PORT | 3000;
server.listen(port, function () {
    console.log("Listening at port " + port);
});