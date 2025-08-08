const mongoose = require('mongoose');

connectDB = async () => {
    try {
        await mongoose.connect(process.env.DATABASECONNECTIONSTRING)
    } catch (err) {
        console.log(err);
    }
}

module.exports = connectDB;