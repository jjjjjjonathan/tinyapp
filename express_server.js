const express = require("express");
const bodyParser = require("body-parser");
const cookieSession = require('cookie-session');
const bcrypt = require("bcryptjs");
const app = express();
app.use(cookieSession({
  name: "session",
  keys: ["be28c579-2a86-447e-8481-98d59a9d4333", "f3d68b93-86f0-4f22-95e2-cc3087447f5f"]
}));
const PORT = 8080; // default port 8080

app.set("view engine", "ejs");
app.use(bodyParser.urlencoded({extended: true}));

// Objects

const urlDatabase = {
  "b2xVn2": {
    longURL: "http://www.lighthouselabs.ca",
    userID: "test"
  }
};

const users = {};

// Functions

const generateRandomString = () => {
  return Math.floor((1 + Math.random()) * 0x1000000).toString(16).substring(1);
};

const emailLookup = (email, password) => {
  for (const user in users) {
    if (users[user]['email'] === email) {
      if (password === undefined) {
        return user;
      } else {
        return passwordLookup(user, password);
      }
    }
  } return false;
};

const passwordLookup = (user, password) => {
  return bcrypt.compareSync(password, users[user]['password']);
};

const urlsForUser = id => {
  const userUrls = {};
  for (const entry in urlDatabase) {
    if (urlDatabase[entry]['userID'] === id) {
      userUrls[entry] = {
        longURL: urlDatabase[entry].longURL,
        userID: urlDatabase[entry].userID
      };
    }
  } return userUrls;
};

app.listen(PORT, () => {
  console.log(`Tiny App listening on port ${PORT}!`);
});

// Stuff probably that will be removed

app.get("/", (req, res) => {
  res.send("Hello!");
});

app.get("/hello", (req, res) => {
  res.send("<html><body>Hello <b>World</b></body></html>\n");
});

// JSON

app.get("/urls.json", (req, res) => {
  res.json(urlDatabase);
});

// /urls

app.get("/urls", (req, res) => {
  if (!("user_id" in req.session)) {
    const templateVars = { user: users[req.session['user_id']], error: "Log in to see your URLs."};
    res.render("login", templateVars);
  } else {
    const templateVars = { urls: urlsForUser(req.session["user_id"]), user: users[req.session['user_id']], error: false };
    res.render("urls_index", templateVars);
  }
});

app.post("/urls", (req, res) => {
  if (req.session['user_id'] === undefined) {
    res.sendStatus(403);
  } else {
    const newShortURL = generateRandomString();
    urlDatabase[newShortURL] = {
      longURL: req.body.longURL,
      userID: req.session['user_id']
    };
    res.redirect(`/urls/${newShortURL}`);
  }
});

// /urls/new

app.get("/urls/new", (req, res) => {
  if (!("user_id" in req.session)) {
    res.redirect("/login");
  }
  const templateVars = { user: users[req.session['user_id']] };
  res.render("urls_new", templateVars);
});

// /urls/:shortURL

app.get("/urls/:shortURL", (req, res) => {
  if (urlDatabase[req.params.shortURL] === undefined) {
    res.status(404).send("This page doesn't exist.");
  } else if (urlDatabase[req.params.shortURL]["userID"] !== req.session['user_id']) {
    res.status(403).send("Error code: 403\nYou can't go to URL edit pages that aren't yours or if you're not logged in.");
  } else {
    const templateVars = { shortURL: req.params.shortURL, longURL: urlDatabase[req.params.shortURL]['longURL'], user: users[req.session['user_id']] };
    res.render("urls_show", templateVars);
  }
});

app.post("/urls/:shortURL/delete", (req, res) => {
  if (urlDatabase[req.params.shortURL] === undefined) {
    res.status(404).send("This page doesn't exist.");
  } else if (urlDatabase[req.params.shortURL]["userID"] !== req.session['user_id']) {
    res.status(403).send("Error code: 403\nYou can't go to URL edit pages that aren't yours or if you're not logged in.");
  } else {
    delete urlDatabase[req.params.shortURL];
    res.redirect("/urls");
  }
});

app.post("/urls/:shortURL/update", (req, res) => {
  if (urlDatabase[req.params.shortURL] === undefined) {
    res.status(404).send("This page doesn't exist.");
  } else if (urlDatabase[req.params.shortURL]["userID"] !== req.session['user_id']) {
    res.status(403).send("Error code: 403\nYou can't go to URL edit pages that aren't yours or if you're not logged in.");
  } else {
    urlDatabase[req.params.shortURL].longURL = req.body.newURL;
    res.redirect(`/urls/${req.params.shortURL}`);
  }
});

// Redirect to longURL

app.get("/u/:shortURL", (req, res) => {
  if (urlDatabase[req.params.shortURL] === undefined) {
    res.sendStatus(404);
  } else {
    const longURL = urlDatabase[req.params.shortURL].longURL;
    res.redirect(longURL);
  }
});

// /login and /logout

app.get("/login", (req, res) => {
  if ("user_id" in req.session) {
    res.redirect("/urls");
  } else {
    const templateVars = { user: users[req.session['user_id']], error: false };
    res.render("login", templateVars);
  }
});

app.post("/login", (req, res) => {
  if (!emailLookup(req.body.email, req.body.password)) {
    const templateVars = { error: "Either your email or password is incorrect.", user: users[req.session['user_id']] };
    res.render("login", templateVars);
  } else {
    for (const user in users) {
      if (users[user].email === req.body.email) {
        req.session["user_id"] = user;
      }
    } res.redirect("/urls");
  }
});

app.post("/logout", (req, res) => {
  req.session = null;
  res.redirect("/login");
});

// /register

app.get("/register", (req, res) => {
  if ("user_id" in req.session) {
    res.redirect("/urls");
  } else {
    const templateVars = { user: users[req.session['user_id']], error: false };
    res.render("register", templateVars);
  }
});

app.post("/register", (req, res) => {
  if (req.body.email === "" || req.body.password === "") {
    const templateVars = { user: users[req.session['user_id']], error: "You can't have a blank email or password field." };
    res.render("register", templateVars);
  } else if (emailLookup(req.body.email)) {
    const templateVars = { user: users[req.session["user_id"]], error: "This email has already been used for registration." };
    res.render("register", templateVars);
  } else {
    const newUser = generateRandomString();
    users[newUser] = {
      id: newUser,
      email: req.body.email,
      password: bcrypt.hashSync(req.body.password, 10)
    };
    req.session["user_id"] = newUser;
    res.redirect("/urls");
  }
});