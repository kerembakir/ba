var express = require('express');
var bodyParser = require('body-parser');
var sequelize = require('sequelize');
var session = require('express-session');
var bcrypt = require('bcrypt');

var app = express();

app.use(express.static(__dirname + '/public'));

app.use(bodyParser.urlencoded({
	extended: true
}));

app.use(session({
	secret: 'extremely secret stuff here',
	resave: true,
	saveUninitialized: false
}));

app.set('views', './src/views');
app.set('view engine', 'pug');


app.listen(3000);
console.log('BB-App running on port 3000');
