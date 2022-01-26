const express = require("express");
const bodyParser = require("body-parser");
const cookieParser = require("cookie-parser");
const app = express();
app.use(cookieParser());
const PORT = 8080; // default port 8080

app.set("view engine", "ejs");
app.use(bodyParser.urlencoded({extended: true}));

// Objects

const urlDatabase = {
  "b2xVn2": "http://www.lighthouselabs.ca",
  "9sm5xK": "http://www.google.com"
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
        return true;
      } else {
        return passwordLookup(user, password);
      }
    }
  } return false;
};

const passwordLookup = (user, password) => {
  if (users[user]['password'] === password) {
    return true;
  } else {
    return false;
  }
};

// Stuff probably that will be removed

app.get("/", (req, res) => {
  res.send("Hello!");
});

app.listen(PORT, () => {
  console.log(`Example app listening on port ${PORT}!`);
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
  const templateVars = { urls: urlDatabase, user: users[req.cookies['user_id']] };
  res.render("urls_index", templateVars);
});

app.post("/urls", (req, res) => {
  const newShortURL = generateRandomString();
  if (!req.body.longURL.includes(`://`)) {
    urlDatabase[newShortURL] = `https://${req.body.longURL}`;
  } else {
    urlDatabase[newShortURL] = req.body.longURL;
  }
  res.redirect(`/urls/${newShortURL}`);
});

// /urls/new

app.get("/urls/new", (req, res) => {
  if (!("user_id" in req.cookies)) {
    res.redirect("/login");
  }
  const templateVars = { user: users[req.cookies['user_id']] };
  res.render("urls_new", templateVars);
});

// /urls/:shortURL

app.get("/urls/:shortURL", (req, res) => {
  const templateVars = { shortURL: req.params.shortURL, longURL: urlDatabase[req.params.shortURL], user: users[req.cookies['user_id']] };
  res.render("urls_show", templateVars);
});

app.post("/urls/:shortURL/delete", (req, res) => {
  delete urlDatabase[req.params.shortURL];
  res.redirect("/urls");
});

app.post("/urls/:shortURL/update", (req, res) => {
  urlDatabase[req.params.shortURL] = req.body.newURL;
  res.redirect(`/urls/${req.params.shortURL}`);
});

// Redirect to longURL

app.get("/u/:shortURL", (req, res) => {
  const longURL = urlDatabase[req.params.shortURL];
  res.redirect(longURL);
});

// /login and /logout

app.get("/login", (req, res) => {
  if ("user_id" in req.cookies) {
    res.redirect("/urls");
  } else {
    const templateVars = { user: users[req.cookies['user_id']] };
    res.render("login", templateVars);
  }
});

app.post("/login", (req, res) => {
  if (!emailLookup(req.body.email, req.body.password)) {
    res.sendStatus(403);
  } else {
    for (const user in users) {
      if (users[user].email === req.body.email) {
        res.cookie("user_id", user);
      }
    }
  }
  res.redirect("/urls");
});

app.post("/logout", (req, res) => {
  res.clearCookie("user_id");
  res.redirect("/urls");
});

// /register

app.get("/register", (req, res) => {
  if ("user_id" in req.cookies) {
    res.redirect("/urls");
  } else {
    const templateVars = { user: users[req.cookies['user_id']] };
    res.render("register", templateVars);
  }
});

app.post("/register", (req, res) => {
  if (req.body.email === "" || req.body.password === "" || emailLookup(req.body.email)) {
    res.sendStatus(400);
  } else {
    const newUser = generateRandomString();
    users[newUser] = {
      id: newUser,
      email: req.body.email,
      password: req.body.password
    };
    res.cookie("user_id", newUser);
    res.redirect("/urls");
  }
});