const express = require('express');
const passport = require('passport');
const GoogleStrategy = require('passport-google-oauth20').Strategy;
const GitHubStrategy = require('passport-github2').Strategy;
const session = require('express-session');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3060;

// In-memory user store (replace with DB)
const users = new Map();

// Passport serialization
passport.serializeUser((user, done) => done(null, user.id));
passport.deserializeUser((id, done) => {
  const user = users.get(id);
  done(null, user || null);
});

// Google Strategy
passport.use(new GoogleStrategy({
  clientID: process.env.GOOGLE_CLIENT_ID,
  clientSecret: process.env.GOOGLE_CLIENT_SECRET,
  callbackURL: `${process.env.BASE_URL}/auth/google/callback`
}, async (accessToken, refreshToken, profile, done) => {
  let user = users.get(profile.id);
  if (!user) {
    user = {
      id: profile.id,
      provider: 'google',
      email: profile.emails?.[0]?.value,
      name: profile.displayName,
      avatar: profile.photos?.[0]?.value
    };
    users.set(profile.id, user);
  }
  done(null, user);
}));

// GitHub Strategy
passport.use(new GitHubStrategy({
  clientID: process.env.GITHUB_CLIENT_ID,
  clientSecret: process.env.GITHUB_CLIENT_SECRET,
  callbackURL: `${process.env.BASE_URL}/auth/github/callback`
}, async (accessToken, refreshToken, profile, done) => {
  let user = users.get(profile.id);
  if (!user) {
    user = {
      id: profile.id,
      provider: 'github',
      email: profile.emails?.[0]?.value,
      name: profile.displayName,
      avatar: profile.photos?.[0]?.value
    };
    users.set(profile.id, user);
  }
  done(null, user);
}));

// Middleware
app.use(session({
  secret: process.env.SESSION_SECRET,
  resave: false,
  saveUninitialized: false,
  cookie: { secure: false } // Set true in production with HTTPS
}));
app.use(passport.initialize());
app.use(passport.session());

// Routes
app.get('/', (req, res) => {
  res.send(`
    <h1>OAuth 2.0 Login Demo</h1>
    ${req.user 
      ? `<p>Logged in as: ${req.user.name}</p>
         <p>Provider: ${req.user.provider}</p>
         <a href="/logout">Logout</a>`
      : `
         <a href="/auth/google">Login with Google</a><br><br>
         <a href="/auth/github">Login with GitHub</a>`
    }
  `);
});

// Auth routes
app.get('/auth/google', passport.authenticate('google', {
  scope: ['profile', 'email']
}));

app.get('/auth/google/callback',
  passport.authenticate('google', { failureRedirect: '/' }),
  (req, res) => res.redirect('/')
);

app.get('/auth/github', passport.authenticate('github', {
  scope: ['user:email']
}));

app.get('/auth/github/callback',
  passport.authenticate('github', { failureRedirect: '/' }),
  (req, res) => res.redirect('/')
);

app.get('/logout', (req, res, next) => {
  req.logout((err) => {
    if (err) return next(err);
    res.redirect('/');
  });
});

app.get('/profile', (req, res) => {
  if (!req.user) return res.status(401).json({ error: 'Not authenticated' });
  res.json(req.user);
});

app.get('/health', (req, res) => {
  res.json({ status: 'ok', usersCount: users.size });
});

app.listen(PORT, () => {
  console.log(`OAuth Login running on http://localhost:${PORT}`);
  console.log('⚠️  Set up OAuth credentials in .env first!');
});