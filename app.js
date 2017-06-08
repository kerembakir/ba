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
app.set('views', './views');
app.set('view engine', 'pug');



//De welbefaamde body-parser, welkom!
app.use(bodyParser.urlencoded({
	extended: true
}));



//Vraagt static files op
app.use(express.static(__dirname + '../public'));



// Sequelize Models Defining
var User = sequelize.define('user', {
  name: Sequelize.STRING,
  email: Sequelize.STRING,
  password: Sequelize.STRING
});



var Post = sequelize.define('post', {
	title: Sequelize.STRING,
	body: Sequelize.STRING,
	timeStamp: Sequelize.DATE,
});

var Comment = sequelize.define('comment', {
	body: Sequelize.STRING,
	timeStamp: Sequelize.DATE,
});



//Relation between tables
User.hasMany(Post);
Post.belongsTo(User);
Post.hasMany(Comment);
Comment.belongsTo(Post);
User.hasMany(Comment);
Comment.belongsTo(User);



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
        message: request.query.message,
        user: request.session.user
    });
});


// app.get('/', function(request, response) {
//   var userId = req.session.userId

//   res.render('/', {userId})
// })



//Register an account
app.get('/register', function(request, response){
  response.render('register')
});



//Store login data in database
// app.post('/register', bodyParser.urlencoded({extended: true}), function (request, response) {
//   bcrypt.hash(request.body.password, 10, function (err, hash) {
//     if(err) {
//       console.log(err)
//     }
//     console.log(hash);
//     User.create({
//       name:request.body.name,
//       email: request.body.email,
//       password:hash
//     }).then (function () {
//       response.redirect('/')
//     });
//   });
// });

app.post('/register', function(request, response){
  var name = request.body.name
  var email = request.body.email
  var password = request.body.password
  var checkPassword = request.body.checkPassword

  if(password != checkPassword) {
    response.send("Error: Password doesn't match!")
  }
  else {
    User.create( {
      name: name,
      email: email,
      password: password
    })
    .then(function(newUser) {
      console.log('New User created: ' + newUser.get({
        plain: true
      }))
      response.redirect('login')
    })
    .catch(function(error) {
      console.log('Error!')
    })
  }
})









//Login page
app.get('/login', function (request, response) {
  response.render('login', {
    Message: request.query.message,
    User: request.query.user
  });
});

app.get('/profile', function (request, response) {
    var user = request.session.user;
    if (user === undefined) {
        response.redirect('/?message=' + encodeURIComponent("Please log in to view your profile."));
    } else {
        response.render('profile', {
            user: user
        });
    }
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
        if (user !== null && request.body.password === user.password) {
            request.session.user = user;
            response.redirect('/profile');
        } else {
            response.redirect('/?message=' + encodeURIComponent("Invalid email or password."));
        }
    }, function (error) {
        response.redirect('/?message=' + encodeURIComponent("Invalid email or password."));
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

Post.findAll(
    {
      where: {userId: userId},
      include: [User,
        {
          model: Comment,
          include: [
            User
          ]
        }
      ]}
  )
  .then(function(posts){
    res.render("allposts", {posts, userId})
  })
})









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




sequelize.sync({force: true}).then(function () {
    User.create({
        name: "stabbins",
        email: "yes@no",
        password: "not_password"
    }).then(function () {
        var server = app.listen(3000, function () {
            console.log('Example app listening on port: ' + server.address().port);
        });
    });
}, function (error) {
    console.log('sync failed: ');
    console.log(error);
});

// var server = app.listen(3000);
// console.log('BA-App running on port 3000');
