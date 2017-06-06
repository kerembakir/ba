var express = require('express');
var bodyParser = require('body-parser');
var pug = require ('pug');
var sequelize = require('sequelize');
var session = require('express-session');

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

app.set('views', './views');
app.set('view engine', 'pug');


//Sequelize settings (from class rep)

var Sequelize = require('sequelize');
var sequelize = new Sequelize('blogapp', process.env.POSTGRES_USER, null, {
	host: 'localhost',
	dialect: 'postgres',
	define: {
		timestamps: false
	}
});



// Seq. Models

var User = sequelize.define('users', {
	name: {
		type: Sequelize.TEXT,
		allowNull: false,
		unique: true
	},
	email: {
		type: Sequelize.TEXT,
		allowNull: false,
		unique: true
	},
	password: Sequelize.TEXT,
});

var Post = sequelize.define('posts', {
	title: Sequelize.TEXT,
	body: Sequelize.TEXT,
	timeStamp: Sequelize.DATE,
});

var Comment = sequelize.define('comments', {
	body: Sequelize.TEXT,
	timeStamp: Sequelize.DATE,
});

User.hasMany(Post);
Post.belongsTo(User);

Post.hasMany(Comment);
Comment.belongsTo(Post);

User.hasMany(Comment);
Comment.belongsTo(User);


















app.listen(3000);
console.log('BA-App running on port 3000');
