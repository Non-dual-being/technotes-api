const Users = require('./../models/User');
const Notes = require('./../models/Note');
const asyncHandler = require('express-async-handler');
const { text } = require('express');

const getAllNotes = asyncHandler(
    async (req, res) => {
        const notes = await Notes.find();
        /**
         * met select -password zorgt de - voor dat je geen password ophaalt
         * lean zorgt ervoor dat je de kale json structuur krijgt en niet de volledige documenten
         */

        if (!notes) {
            return res.status(400).json({ message: 'No notes found', notes: []});
        } else if (!notes.length) {
             return res.status(200).json({ message: 'No notes in the current list', notes: []});
        }   else {
            const notesornote = notes.length > 1
                ?   "notes"
                :   "note"
            return res.status(200).json({message: `The list consist of ${notes.length} ${notesornote} `, notes});
        }       
    }
)
const createNewNote = asyncHandler(
    async (req, res) => {
        const { user, title, text } = req.body //pakt hier de waarden op basis van de sleutel
        let validTitle;

        const validRequest = [user, text, title].every(field => typeof field === "string" && field.length > 0);

        const duplicateTitle = await Notes.findOne({ title }).collation({ locale: 'nl', strength: 2}).lean();

        if (duplicateTitle && duplicate?._id.toString() !== id) {
            validTitle = false;
            return res.status(409).json(
                {
                    message: 'title already in use by another note',
                    notes: {}
                }
            )

        } else { validTitle = true };

        if (validRequest && validTitle){
            const foundUser = await Users.findById(user);
            if (!foundUser){
                return res.status(400).json({message: `The provide userId ${user} doesn't corespond with a user`, notes: {}});
            } else if (!foundUser.active){
                return res.status(400).json({message: `The user ${foundUser.username} with id: ${user} is currently not active`, notes: {}});
            } else {
                 const notesObject = { user, title, text, completed: false};
                 const createdNote = await Notes.create(notesObject);
                 if (createdNote){
                    return res.json(
                        {
                            message: `The notes with title ${createdNote.title} is succesfully created and assigned to ${foundUser.username}`, 
                            notes: createdNote
                        });
                 }
            }

        } else {
            return res.status(400).json({message: `Provide a title, text and userId to create a note`, notes: {}});
        }
    }
)

const updateNote = asyncHandler(
    async (req, res) => {
        const { id, user, title, text, completed } = req.body
        const requiredFields = [ id, user ].every(field => typeof field === "string" && field.length > 0);
        let validTitle;


        if (!requiredFields) return res.status(400).json({
            message : "ticket-id and userId are required to update a note",
            notes: {}
        })

        noteToUpdate = await Notes.findById(id).lean();

        if (!noteToUpdate) return res.status(400).json({
            message : `Provided id ${id.toString()} does not refer to a note in the database`,
            notes: {}
        })

            /*         
                    if (user !== noteToUpdate.user.toString()) return res.status(400).json({
                        message : `Provided userId ${user} does not correspond with the user of the ticket`,
                        notes: {}
                    })
                        todo:dave gray laat toe dat je een andere eigenaar toewijst aan een ticket
            */
        const ProvidedUserExists = await Users.exists({ _id : user });

        if (!ProvidedUserExists) return res.status(400).json({
            message: `The provide userid ${user} doesnt refer to a existing User`,
            notes : {}
        })

        const updateNoteObject = {
            user,
            title,
            text,
            completed : false
        }

        const duplicateTitle = await Notes.exists({ title }).collation({ locale: 'nl', strength: 2});

        if (duplicateTitle && duplicate?._id.toString() !== id) {
            validTitle = false;
            return res.status(409).json(
                {
                    message: 'title already in use by another note',
                    notes: {}
                }
            )
        } else { validTitle = true}

        if (validTitle){
             updateNoteObject.title = (typeof title === 'string' && title.length)
                ? title
                : noteToUpdate.title;
        
            updateNoteObject.text = (typeof text === 'string' && text.length)
                ? text
                : noteToUpdate.text;

            updateNoteObject.completed = typeof completed === 'boolean'
                ? completed
                : noteToUpdate.completed;
        
        

            const update = await Notes.findByIdAndUpdate(
                id,
                {$set : updateNoteObject},
                {new: true, runValidators: true}
            )

            if (update) {
                return res.status(200).json({
                    message : `Succesfully update Note with ticket number ${update.ticket}`,
                    notes: update
                })
            } else {
                return res.status(400).json({
                    message : `Enable to update the Note`,
                    notes: {}
                })
            }

        }
    }
)

const deleteNote = asyncHandler(
    async (req, res) => {
        const { id } = req.body;

        if (!id || typeof id !== 'string') return res.status(400).json({
            message: "The id needed to delete a note",
            notes : {}
        });

        const noteExists = await Notes.exists({ _id : id });

        if (!noteExists) return res.status(400).json({
            message: `The provide id ${id} doesnt refer to a existing note`,
            notes : {}
        })

        const noteToDelete = await Notes.findById({ _id : id })
        
        const deletedNoteResult = await Notes.deleteOne({ _id: id });

        if (deletedNoteResult.deletedCount === 1){
            const reply = `Note with id ${id} was succesfully deleted`
            return res.status(200).json({ 
                message: reply,
                notes : noteToDelete
            })
        } else {
              const reply = `Note with id ${id} was not deleted`
            return res.status(400).json({
                message: reply,
                notes : {}
            })
        }
    }
)

module.exports = {
    getAllNotes,
    createNewNote,
    updateNote,
    deleteNote
}