var express = require('express');
var path = require('path');
var cookieParser = require('cookie-parser');
var logger = require('morgan');
var mongoose = require('mongoose');
var Client = require('mongodb').MongoClient;
var {sequelize} = require('./models');
var feedRouter = require('./routes/feed');

var app = express();

sequelize.sync();


var db = mongoose.connection;
db.on('error', console.error);
db.once('open',function(){
    console.log('Connect Success');
})
mongoose.connect('mongodb://localhost:27017/Post');

app.use(logger('dev'));
app.use(express.json());
app.use(express.urlencoded({ extended: false }));
app.use(cookieParser());
app.use(express.static(path.join(__dirname, 'public')));

app.use('/feed', feedRouter);

module.exports = app;
