<<<<<<< HEAD
const networkService = require('../service/application/networkService')
=======
const networkAssetsService = require('../service/application/networkAssetsService')
>>>>>>> jed
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

<<<<<<< HEAD
        const network = await networkService.networkCreate({
=======
        const network = await networkAssetsService.networkCreate({
>>>>>>> jed
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
<<<<<<< HEAD
            const read = await networkService.networkRead({
=======
            const read = await networkAssetsService.networkRead({
>>>>>>> jed
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
<<<<<<< HEAD
            const channel = await networkService.channelCreate({
=======
            const channel = await networkAssetsService.channelCreate({
>>>>>>> jed
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
<<<<<<< HEAD
            const read = await networkService.channelRead({
=======
            const read = await networkAssetsService.channelRead({
>>>>>>> jed
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
<<<<<<< HEAD
            const contract = await networkService.smartContract({
=======
            const contract = await networkAssetsService.smartContract({
>>>>>>> jed
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
<<<<<<< HEAD
            const contracts = await networkService.contractReadAll({
=======
            const contracts = await networkAssetsService.contractReadAll({
>>>>>>> jed
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