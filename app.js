const express = require('express');
const app = express();
const bcrypt = require('bcrypt');
const userModel = require('./models/user');
const jwt = require('jsonwebtoken');
const cookieParser = require('cookie-parser');
const postModel =require('./models/post');

app.use(cookieParser());

app.set("view engine", 'ejs');
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.get("/", function (req, res) {
    res.render("index.ejs");
});
app.get("/login", function (req, res) {
    res.render("login.ejs");
});

app.post("/register", async function (req, res) {
  
    //Extract user details from form
    let{username , name , email, password} = req.body;

    //cheak for unique users or cheak if user already exists
    let user = await userModel.findOne({email});
    if(user) return res.status(500).send("User already registered");
    bcrypt.genSalt(10, (err, salt) => {

       //creating new user in DB with hashed password
      bcrypt.hash(password , salt , async(err,hash) =>{
       let user = await userModel.create({
         username,
         name,
         email,
         password: hash
        });
        let token = jwt.sign({email:email , userid: user._id } , "shh");
        res.cookie("token" ,token);
        res.redirect("/profile");
      })
    });


});
app.post("/login" , async (req,res) => {
      let {email , password} = req.body;
      let user = await userModel.findOne({email});
      if (!user) return res.status(500).send("Something went wrong");

      bcrypt.compare(password , user.password , (err, result) => {
        if (result) {
        let token = jwt.sign({email:email , userid: user._id } , "shh");
        res.cookie("token" ,token);
        res.status(200).redirect("/profile");
        } 
        else res.redirect("/login");
      })
})
//Protected profile route only for loggeg in users
app.get("/profile" , isLoggedIn, async (req,res) => {
    let user = await userModel.findOne({email: req.user.email});
    await user.populate("posts");
    res.render("profile.ejs" ,{user} )
})
app.post("/post" , isLoggedIn, async (req,res) => {
    let user = await userModel.findOne({email: req.user.email});
    //console.log(req.body);
    let {content} = req.body;
    let post = await postModel.create({
      user: user._id,
      content
    });
    user.posts.push(post._id);
    await user.save();
    res.redirect("/profile");
})
app.get("/logout" , (req,res) => {
  res.cookie("token" , "");
  res.redirect("/login");
})
app.get("/like/:id" ,isLoggedIn, async function(req,res){
 let post = await postModel.findOne({_id:req.params.id}).populate("user");
 post.likes.push(req.user.userid);
 await post.save();
 res.redirect("/profile");
})

//MIddleware to cheak logged in state before entering protected routes
function isLoggedIn(req, res ,next){
 
    if(req.cookies.token === "")  res.redirect("/login");
    else{
      //Verify user and attach user data to request
      let data = jwt.verify(req.cookies.token , "shh");
      req.user = data;
      next();
    }
}
app.listen(3000);