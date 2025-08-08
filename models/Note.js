const mongoose = require('mongoose');
const AutoIncrement = require('mongoose-sequence')(mongoose);

const noteSchema = new mongoose.Schema(
    {
        user: {
            type: mongoose.Schema.Types.ObjectId,
            required: true,
            ref: "User"
        },
        title: {
            type: String,
            required: true
        },
        text: {
            type: String,
            required: true
        },
        completed: {
            type: Boolean,
            default: false
        }
    },
    {
        timestamps: true //mongodb wil autmatically create create at and update at as a timestamp setting this to true
    }
)

noteSchema.plugin(AutoIncrement, {
    inc_field: 'ticket',
    id: 'ticketNums',
    start_seq: 500
})

module.exports = mongoose.model('Note', noteSchema);

/**
 * de plugin maakt een aparat collectie meestal counter of iets dergelijks
 * ticketNums is een identifier die hoort bij de counter collect en die de seq bijhoudt
 * de inc_field is bedoeld om de notes collect het nummer toetewijzen aan het veld ticket
 * 
 * 
 */