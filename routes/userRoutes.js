const express = require('express');
const router = express.Router();
const usersController = require('./../controllers/usersController');
const verfiyJWT = require('../middleware/verifyJWT');

router.use(verfiyJWT);

router.route('/')
    .get(usersController.getAllUsers)
    .post(usersController.createNewUser)
    .patch(usersController.updateUser)
    .delete(usersController.deleteUser)
module.exports = router;