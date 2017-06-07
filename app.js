//modules
var express = require('express');
var bodyParser = require('body-parser');
var pg = require('pg');
var pug = require ('pug');
var sequelize = require('sequelize');
var session = require('express-session');

var app = express();



//Sequelize connect
var Sequelize = require('sequelize');
var sequelize = new Sequelize('blogapp', process.env.POSTGRES_USER, null, {
	host: 'localhost',
	dialect: 'postgres',
	define: {
		timestamps: false
	}
});



//Pug connect
app.set('views', '/views');
app.set('view engine', 'pug');



//De welbefaamde body-parser, welkom!
app.use(bodyParser.urlencoded({
	extended: true
}));



//Vraagt static files op
app.use(express.static(__dirname + '/public'));



// Sequelize Models
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



//Relation between tables
User.hasMany(Post);
Post.belongsTo(User);
Post.hasMany(Comment);
Comment.belongsTo(Post);
User.hasMany(Comment);
Comment.belongsTo(User);



//Sync database, create users
sequelize.sync({force: true}).then( function() {
  console.log('sync done')
  User.create({
    name: 'kerem',
    email: 'bak@plakzak.io',
    password: 'bakkiebak'
  }).then(function(eersteNaam){
    console.log('bakkie hoi!');
    eersteNaam.createPost({
      title: 'Hey bak',
      body: 'Hallo, ik ben bakkie'
    })
  })
  User.create({
    name: 'Kir',
    email: 'kir@kierewiet.nl',
    password: 'kirkir'
  }).then(function(tweedeNaam){
    console.log('Hoi kir');
    tweedeNaam.createPost({
      title: 'Hey kir',
      body: 'Hallo, ik ben kir'
    })
  })
});



//Activate session
app.use(session({
  secret: 'oh wow very secret much security',
  resave: true,
  saveUninitialized: false
}));



//Routes

//Index page
app.get('/', function (request, response) {
  response.render('index', {
    user: request.session.user
  });
});



//Register an account
app.get('/register', function(request, response){
  response.render('register')
});



//Store login data in database
app.post('/register', bodyParser.urlencoded({extended: true}), function (request, response) {
  bcrypt.hash(request.body.password, 10, function (err, hash) {
    if(err) {
      console.log(err)
    }
    console.log(hash);
    User.create({
      name:request.body.name,
      email: request.body.email,
      password:hash
    }).then (function () {
      response.redirect('/')
    });
  });
});



//Login page
app.get('/login', function (request, response) {
  response.render('login', {
    Message: request.query.message,
    User: request.query.user
  });
});

app.get('/users/:id', function (request, response) {
  var user = request.session.user;
  if (user === undefined) {
    response.redirect('/?message=' + encodeURIComponent("Please log in to view your profile."));
  } else {
    response.render('users/profile', {
      user: user,
    });
  };
});

app.post('/login', bodyParser.urlencoded({extended: true}), function (request, response) {
  if(request.body.email.length === 0) {
    response.redirect('/?message=' + encodeURIComponent("Please fill out your email address."));
    return;
  }

  if(request.body.password.length === 0) {
    response.redirect('/?message=' + encodeURIComponent("Please fill out your password."));
    return;
  }

  User.findOne({
    where: {
      email: request.body.email
    }
  }).then(function (user) {
    var hash = user.password;
    console.log(hash)
    bcrypt.compare (request.body.password, hash, function (err, result) {
      if (err !== undefined) {
        response.redirect('/?message=' + encodeURIComponent("Invalid email or password."));
      } else {
        console.log(result)
        if(user !== null && result === true){
          request.session.user = user;
          response.redirect('/');
        } else {
          response.redirect('/?message=' + encodeURIComponent("Invalid email or password."));
        }
      }
    });
  });
});



//Logout
app.get('/logout', function (request, response) {
  request.session.destroy(function(error) {
    if(error) {
      throw error;
    }
    response.redirect('/?message=' + encodeURIComponent("Successfully logged out."));
  })
});



//Create Post (load post)
app.get('/createpost', function (request, response) {
  response.render('createpost', {
  });
});



//Create Post (store post)
app.post('/createpost', bodyParser.urlencoded({extended: true}), function (request, response) {
  User.findOne({
    where: {
      id: request.session.user.id
    }
  }).then(function (theUser){
    theUser.createPost({
      title: request.body.title,
      body: request.body.message
    }).then (function () {
      response.redirect('/posts')
    });
  });
});



//View a list of their own posts
app.get('/posts', function (request, response) {

  User.findOne({
    where: {
      id: request.session.user.id
    }
  }).then(function (theUser){
    theUser.getPosts({
      include:[Comment]
    }).then(function (results) {
      // response.send(results)
      response.render('posts', {
        allOwnPosts:results
      });
    });
  });
});



//View a list of everyone's posts
app.get('/allposts', function (request, response) {

  Post.findAll({
    include: [
      {model: User},
      {model: Comment,
        include: {model: User}}
      ]
    }).then(function (posts) {
      response.render('allposts', {
        allPosts: posts
      });
      // response.send(posts)
    });
  });



  //Make comments, lists
  app.post('/comments', bodyParser.urlencoded({extended: true}), function (request, response) {
    Promise.all([
      Post.findOne({ where: { id: request.body.id } }),
      User.findOne({ where: { id: request.session.user.id } })
    ]).then(function(theData){
      theData[1].createComment ({ body: request.body.comment }).then(function(theComment){
        theComment.setPost(theData[0]).then(function(){
          response.redirect('/allposts')
        });
      });
    });
  });




  //look for specific post
  app.get('/post/:id', function (request, response) {
    var postid = request.params.id
    Post.findAll({
      where: {
        id:postid
      },
      include: [User, Comment]
    }).then(function(posts) {
      response.render('onepost', {
        posts:posts
      });
    });
  });


app.listen(3000);
console.log('BA-App running on port 3000');
