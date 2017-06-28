//modules
var express = require('express');
var bcrypt = require('bcrypt-nodejs');
var bodyParser = require('body-parser');
var pg = require('pg');
var pug = require ('pug');
var sequelize = require('sequelize');
var session = require('express-session');


var app = express();



//Sequelize connect
var Sequelize = require('sequelize');
var sequelize = new Sequelize('blogapp', process.env.POSTGRES_USER, process.env.POSTGRES_PASSWORD, {
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
  password: Sequelize.STRING // replace with hash?
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
    saveUninitialized: true
}));



//Routes

//Index page
app.get('/', function (request, response) {
    response.render('index', {
        message: request.query.message,
        user: request.session.user
    });
});



//Register an account
app.get('/register', function(request, response){
  response.render('register')
});



//Store login data in database
app.post('/register', bodyParser.urlencoded({extended:true}), (request,response) => {
  User.sync()
    .then(function(){
      User.findOne({
        where: {
          email: request.body.email
        }
      })
      .then(function(user){
      if(user !== null && request.body.email=== user.email) {
            response.redirect('/?message=' + encodeURIComponent("Email is in use!"));
        return;
      }

//hieronder bcrypt.hash(req.body.password, null, null, (err, hash)=>{

      else {
        User.sync()
          .then(function(){
            return User.create({
              name: request.body.name,
              email: request.body.email,
              password: request.body.password //replace with hash?
            })
          })
          .then(function(){
            response.render('login')
          })
          .then().catch(error => console.log(error))
      }
    })
    .then().catch(error => console.log(error))
    })
  .then().catch(error => console.log(error))
})



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



//Login page
app.get('/login', function (request, response) {
  response.render('login', {
    Message: request.query.message,
    User: request.query.user
  });
});


app.post('/login', (request, response)=>{
  if(request.body.email.length ===0) {
    response.redirect('/?message=' + encodeURIComponent("Please fill out your email address."));
    return;
  }
  if(request.body.password.length===0) {
    response.redirect('/?message=' + encodeURIComponent("Please fill out your password."));
    return;
  }
  User.findOne({
    where: {
      email:request.body.email
    }
  }).then((user) => {
    if(user !== null && request.body.password === user.password) {
      request.session.user = user;
      response.redirect('/');
    } else {
      response.redirect('/?message=' + encodeURIComponent("Invalid email or password."));
    }
  }, (error)=> {
    response.redirect('/?message=' + encodeURIComponent("Invalid email or password."));
  });
});



//Logout
app.get('/logout', (request, response)=> {
    request.session.destroy(function(error) {
        if(error) {
            throw error;
        }
        response.redirect('/?message=' + encodeURIComponent("Successfully logged out."));
    })
});


//Create Post (store post)
app.get('/post', (request,response) =>{
  var user = request.session.user;
  if (user === undefined) {
    response.redirect('/?message=' + encodeURIComponent("Please log in first"));
  }
  Post.sync()
  .then(function(){
    User.findAll()
    .then((users)=>{
      Post.findAll({include: [{
        model: Comment,
        as: 'comments'
      }]
    })
    .then((posts)=>{
      response.render('post', {
        posts: posts,
        users: users
      })
    })
  })
})
.then().catch(error=> console.log(error))
});

app.post('/post', (request,response) => {
  if(request.body.message.length===0 || request.body.title.length===0) {
    response.end('Please insert message');
    return
  }
  else {
    Post.sync()
      .then()
        User.findOne({
          where: {
            email: request.session.user.email
          }
        }).then((user)=>{
          return Post.create({
            title: request.body.title,
            body: request.body.message,
            userId: user.id
          })
        }).then().catch(error=> console.log(error))
      .then(function() {
        response.redirect('/post');
      })
      .then().catch(error => console.log(error));
  }
})




//View a list of their own posts
app.get('/myposts', (request,response) =>{
  var user = request.session.user;
  if (user === undefined) {
        response.redirect('/?message=' + encodeURIComponent("Log in first!"));
    }
  Post.findAll({
    where: {
      userId: user.id
    },
    include:[{
      model: Comment,
      as: 'comments'
    }]
  })
  .then((posts)=>{
    User.findAll().then((users)=>{
      response.render('post', {
        posts: posts,
        users: users
      })
    })
  })
  .then().catch(error => console.log(error))
});



//View a list of everyone's posts
// app.get('/allposts', function (request, response) {
//
//   Post.findAll({
//     include: [
//       {model: User},
//       {model: Comment,
//         include: {model: User}}
//       ]
//     }).then(function (posts) {
//       response.render('allposts', {
//         allPosts: posts
//       });
//       // response.send(posts)
//     });
//   });
//
// Post.findAll(
//     {
//       where: {userId: userId},
//       include: [User,
//         {
//           model: Comment,
//           include: [
//             User
//           ]
//         }
//       ]}
//   )
//   .then(function(posts){
//     res.render("allposts", {posts, userId})
//   })
// })




//Make comments
  app.post('/comment', (request,response)=>{
    if(request.body.comment.length===0) {
      response.end('You forgot your comment!')
    }
    else {
      Comment.sync()
        .then()
          User.findOne({
            where: {
              email: request.session.user.email
            }
          }).then(user => {
            return Comment.create({
              body: request.body.comment,
              postId: request.body.messageId,
              userId: user.id
            })
          }).then(function(){
            response.redirect('/post')
          }).then().catch(error => console.log(error));
    }
  })





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
