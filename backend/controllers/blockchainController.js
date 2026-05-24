const networkService = require('../service/application/networkService')
const AppError = require('../utils/AppError')

// blockchainController: Network and channel provisioning
// assetRegistryController: Asset lifecycle (create, read, update, delete, transfer)
class fabricController {

// Blockchain
    async networkCreate(req, res, next) {
        try {
        // Debug logging removed to avoid noisy output in production

        if (!req.user) {
            return next(new AppError('Authorization required', 401, 'AUTH_MISSING'))
        }

        const user = req.user

        const network = await networkService.networkCreate({
            body: req.body,
            user: user
        }); 
        return res.status(201).json(network);
        } catch (error) {
            next(error);
        }
    }

    async networkRead (req, res, next) {
        try {
            const read = await networkService.networkRead({
                params: req.params,
                user: req.user
            })

            return res.status(200).json(read)
        } catch (error) {
            next(error)
        }
    }


    async channelCreate (req, res, next) {
        try {
            const channel = await networkService.channelCreate({
                params: req.params,
                body: req.body,
                user: req.user
            })

            return res.status(201).json(channel)
        } catch (error) {
            next(error)
        }
    }

    async channelRead (req, res, next) {
       try {
            const read = await networkService.channelRead({
            params: req.params,
            user: req.user
            })

              return res.status(200).json(read)
       } catch (error) {
            next(error)
       }
    }

    async smartContract (req, res, next) {
        try {
            const contract = await networkService.smartContract({
                params: req.params,
                body: req.body,
                user: req.user
            })

            return res.status(201).json(contract)
        } catch (error) {
            next(error)
        }
    }

    async contractReadAll (req, res, next) {
        try {
            const contracts = await networkService.contractReadAll({
                params: req.params,
                user: req.user
            })

            return res.status(200).json(contracts)
        } catch (error) {
            next(error)
        }
    }
}

module.exports = new fabricController()