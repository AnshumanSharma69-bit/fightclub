const passport      = require('passport');
const GoogleStrategy = require('passport-google-oauth20').Strategy;
const User          = require('../models/User');
const Fighter       = require('../models/Fighter');

passport.use(
  new GoogleStrategy(
    {
      clientID:     process.env.GOOGLE_CLIENT_ID,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET,
      callbackURL:  process.env.GOOGLE_CALLBACK_URL ||
                    'http://localhost:5000/api/auth/google/callback',
    },
    async (accessToken, refreshToken, profile, done) => {
      try {
        // Check if user already exists with this Google ID
        let user = await User.findOne({ googleId: profile.id });

        if (user) {
          // Returning Google user — just return them
          return done(null, user);
        }

        // Check if email already registered with password
        const email = profile.emails?.[0]?.value;
        if (email) {
          user = await User.findOne({ email });
          if (user) {
            // Link Google ID to existing account
            user.googleId  = profile.id;
            user.avatarUrl = user.avatarUrl || profile.photos?.[0]?.value || null;
            await user.save();
            return done(null, user);
          }
        }

        // Brand new user — create account
        // Username: derive from display name, make unique
        let baseUsername = (profile.displayName || 'fighter')
          .replace(/\s+/g, '_')
          .replace(/[^a-zA-Z0-9_]/g, '')
          .substring(0, 18)
          .toLowerCase();

        // Ensure uniqueness by appending random digits if taken
        let username = baseUsername;
        let attempt  = 0;
        while (await User.findOne({ username })) {
          username = `${baseUsername}_${Math.floor(Math.random() * 9000 + 1000)}`;
          if (++attempt > 5) break;
        }

        user = await User.create({
          username,
          email:        email || `${profile.id}@google.com`,
          googleId:     profile.id,
          avatarUrl:    profile.photos?.[0]?.value || null,
          // Google users don't have a passwordHash — we mark it with a sentinel
          // so the schema required: true is satisfied but login with password is blocked
          passwordHash: `google_oauth_${profile.id}`,
          authProvider: 'google',
        });

        // Create a blank fighter profile — they'll fill in stats after first login
        await Fighter.create({
          userId:   user._id,
          heightCm: 170, // default placeholder
          weightKg: 70,
          needsOnboarding: true, // flag to show stats form on first login
        });

        return done(null, user);
      } catch (err) {
        return done(err, null);
      }
    }
  )
);

// We don't use sessions (JWT-based) but passport requires these
passport.serializeUser((user, done) => done(null, user._id));
passport.deserializeUser(async (id, done) => {
  try {
    const user = await User.findById(id);
    done(null, user);
  } catch (err) {
    done(err, null);
  }
});

module.exports = passport;
