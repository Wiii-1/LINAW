const userService = require('../service/application/userService')
const { auth } = require("../config/firebase-config");
const AppError = require("../utils/AppError.js");

class userController {
  async signup(req, res, next) {
    try {
      console.log("=== SIGNUP CONTROLLER START ===")
      console.log("Headers:", req.headers)
      
      // Extracts and verify firebase token
      const authHeader = req.headers.authorization
      console.log("Auth header:", authHeader ? "Present" : "Missing")
    
      if (!authHeader?.startsWith('Bearer ')) {
        console.log("ERROR: No Bearer token")
        return next(new AppError('No token provided', 401, 'AUTH_MISSING'))
      }

      const firebaseToken = authHeader.split('Bearer ')[1]
      console.log("Token extracted:", firebaseToken.substring(0, 20) + "...")
      
      console.log("Verifying token with Firebase Admin SDK...")
      const decodedToken = await auth.verifyIdToken(firebaseToken)
      console.log("Token verified. UID:", decodedToken.uid)
    
      const { uid, email } = decodedToken
      console.log("Email from token:", email)

      if (!email) {
        console.log("ERROR: No email in token")
        return next(new AppError('Email is required', 400, 'EMAIL_REQUIRED'))
      }

      console.log("Calling userService.signup...")
      // Call service layer
      const user = await userService.signup({
        email,
        firebase_uid: uid,
        tenant_id: null
      })
      console.log("User created:", user)

      console.log("Sending success response...")
      res.status(201).json({
        success: true,
        message: 'Signup Successful',
        user: {
        user_id: user.user_id,
        email: user.email,
        tenant_id: user.tenant_id
      }
    })
    
      console.log("=== SIGNUP CONTROLLER END ===")
    } catch (err) {
      console.error("=== SIGNUP CONTROLLER ERROR ===")
      console.error("Error type:", err.constructor.name)
      console.error("Error message:", err.message)
      console.error("Full error:", err)
      next(err);
    }
  }
  async login(req, res, next) {
    try {
      console.log("=== LOGIN CONTROLLER START ===")
    
      // Extract and Verify firebase token
      const authHeader = req.headers.authorization
      console.log("Auth header:", authHeader ? "Present" : "Missing")
    
      if (!authHeader?.startsWith('Bearer ')) {
        console.log("ERROR: No Bearer token")
        return next(new AppError('No token provided', 401, 'AUTH_MISSING'))
      }

      const firebaseToken = authHeader.split('Bearer ')[1]
      console.log("Token extracted")
    
      console.log("Verifying token with Firebase Admin SDK...")
      const decodedToken = await auth.verifyIdToken(firebaseToken)
      console.log("Token verified. UID:", decodedToken.uid)
    
      const { uid, email } = decodedToken
      console.log("Email from token:", email)

      if (!email) {
        console.log("ERROR: No email in token")
        return next(new AppError('Email is required', 400, 'EMAIL_REQUIRED'))
      }

      console.log("Calling userService.login...")
      // call service layer
      const user = await userService.login({
        email,
        firebase_uid: uid
      })
      console.log("User found:", user)

      console.log("Sending success response...")
      res.json({
        success: true,
        message: 'Login successful',
        user: {
          user_id: user.user_id,
          email: user.user_email,  // Note: might be user_email not email
          tenant_id: user.tenant_id
        }
      })

      console.log("=== LOGIN CONTROLLER END ===")
    } catch (err) {
      console.error("=== LOGIN CONTROLLER ERROR ===")
      console.error("Error type:", err.constructor.name)
      console.error("Error message:", err.message)
      console.error("Full error:", err)
      next(err);
    }
  }
}

module.exports = new userController();