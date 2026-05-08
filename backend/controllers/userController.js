const userService = require('../service/application/userService')
const AppError = require('../utils/AppError')

class userController {
    async signup (req, res, next) {
        try {
            const user = await userService.signup({
                body: req.body,
                user: req.user.uid
            })
            if (!user) {
                return res.status(400).json({
                    message: 'Signup failed',
                })
            }

            return res.status (201).json({
                email: user.email,
                message: 'Signup successful',
            })
        }catch (err){
            return next(err)
        }
    }

    async login (req, res, next) {
        try {
            const user = await userService.login({
                body: req.body,
                user: req.user.uid
            })

            if (!user) {
                return res.status(400).json({
                    message: 'login failed'
                })
            }

            return res.status(200).json({
                email: user.email,
                message: 'Login Successful'
            })
        } catch (err){
            return next(err)
        }
    }
}

module.exports = new userController()
