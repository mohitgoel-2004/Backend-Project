const express = require('express');
const app = express();
const userModel = require("./models/user");
const postModel = require("./models/post");
const cookieParser = require('cookie-parser');
const bcrypt = require('bcrypt');
const jwt = require("jsonwebtoken");

app.set('view engine', 'ejs');
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());

// Routes
app.get('/', (req, res) => {
    res.render('index');
});

app.get('/login', (req, res) => {
    const message = req.query.message;
    res.render('login', { message });
});

app.get('/register', (req, res) => {
    res.render('register');
});

app.get('/profile', isLoggedIn, async (req, res) => {
  let user = await userModel.findOne({email: req.user.email}).populate("posts");
  
    res.render('profile', { user });
    // res.render("profile");
});

//post
app.post('/post', isLoggedIn, async (req, res) => {
  let user = await userModel.findOne({email: req.user.email});
let {content} = req.body;

  let post = await postModel.create({
    user: user._id,
    content
  })
  
  user.posts.push(post._id);
  await user.save();
  res.redirect("/profile");
});

//like
app.get('/like/:id', isLoggedIn, async (req, res) => {
  let post = await postModel.findOne({_id: req.params.id}).populate("user");
    
  if(post.likes.indexOf(req.user.userid) === -1){
      post.likes.push(req.user.userid);
  }
  else{
    post.likes.splice(post.likes.indexOf(req.user.userid), 1);
  }

 await post.save();
    res.redirect("/profile");
    
});

//edit
app.get('/edit/:id', isLoggedIn, async (req, res) => {
  let post = await postModel.findOne({_id: req.params.id}).populate("user");
    
  res.render('edit', { post });

    
});

// Register Route
app.post('/register', async (req, res) => {
    try {
        const { email, password, username, name, age } = req.body;

        let existingUser = await userModel.findOne({ email });
        if (existingUser) return res.status(400).send("User already registered");

        const salt = await bcrypt.genSalt(10);
        const hash = await bcrypt.hash(password, salt);

        const newUser = await userModel.create({
            username,
            name,
            age,
            email,
            password: hash
        });

        const token = jwt.sign({ email: newUser.email, userid: newUser._id }, "shhhh");
        res.cookie("token", token);
        res.send("User registered successfully");
    } catch (err) {
        console.log(err);
        res.status(500).send("Internal Server Error");
    }
});

// Login Route
app.post('/login', async (req, res) => {
    try {
        const { email, password } = req.body;

        const user = await userModel.findOne({ email });
        if (!user) return res.status(400).send("Invalid credentials");

        const match = await bcrypt.compare(password, user.password);
        if (!match) return res.status(400).send("Invalid credentials");

        const token = jwt.sign({ email: user.email, userid: user._id }, "shhhh");
        res.cookie("token", token);
        res.status(200).redirect("/profile");
    } catch (err) {
        console.log(err);
        res.status(500).send("Internal Server Error");
    }
});

// Logout Route
app.get('/logout', (req, res) => {
    res.clearCookie("token");
    res.redirect('/login');
});

// Middleware to check login
function isLoggedIn(req, res, next) {
    const token = req.cookies.token;

    if (!token) return res.redirect('/login?message=You must be logged in');

    try {
        const data = jwt.verify(token, "shhhh");
        req.user = data;
        next();
    } catch (err) {
        res.redirect('/login?message=You must be logged in');
    }
}

app.listen(3000);
