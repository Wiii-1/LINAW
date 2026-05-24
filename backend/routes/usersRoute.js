const express = require('express')
const router = express.Router()
const userController = require('../controllers/userController')
const authenticate = require('../middleware/authenticate')
const { strictLimiter } = require('../middleware/rateLimiter')



router.post('/auth/signup', strictLimiter, userController.signup) // (create users)
router.post('/auth/login', strictLimiter,userController.login) // (create session)
// router.get ('/user')// get user data or profile.

module.exports = {router};
