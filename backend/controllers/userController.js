const userService = require('../service/application/userService')

class userController {
    async signup(req, res, next) {
    try {
      const email = req.body?.email;
      
      if (!email) {
        return res.status(400).json({ message: "Email is required" });
      }

      const user = await userService.signup(req.body, req.user);
      if (!user) {
        return res.status(400).json({
          message: "Signup failed",
        });
      }

      return res.status(201).json({
        email: user.email,
        message: "Signup successful",
      });
    } catch (err) {
      return next(err);
    }
  }

  async login(req, res, next) {
    try {
      /* 
        this is login, the user already has a valid UID from firebase the only thing
        that doesn't need an auth is the signup. 
      */
      const user = await userService.login({
                body: req.body,
                user: req.user
            });

      if (!user) {
        return res.status(400).json({
          message: "login failed",
        });
      }

      return res.status(200).json({
        email: user.email,
        message: "Login Successful",
      });
    } catch (err) {
      return next(err);
    }
  }
}

module.exports = new userController();
