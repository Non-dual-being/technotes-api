const User = require('./../models/User');
const Note = require('./../models/Note');
const asyncHandler = require('express-async-handler'); /**alternative express-async-erros */
const bcrypt = require('bcrypt');


//@desc Get all users
//@route GET /users
//@access Private

//async handler regelt voor de catch err en dus hoef je geen try catch te gebruiken hier 

const capitalize = str => str.charAt(0).toUpperCase() + str.slice(1);

/**
 * anomieme functie dus de return kan impleciet
 */

const getAllUsers = asyncHandler(
    async (req, res) => {
        const users = await User.find().select('-password').lean();
        /**
         * met select -password zorgt de - voor dat je geen password ophaalt
         * lean zorgt ervoor dat je de kale json structuur krijgt en niet de volledige documenten
         */

        if (!users || !users.length) {
            return res.status(200).json({ message: 'No users found', users: []});
        } else {
            return res.json({message: `Technotes has ${users.length} users`, users});
        }       
    }
)

//@desc create new user
//@route POST /users
//@access Private

const createNewUser = asyncHandler(
    async (req, res) => {
        const { username, password, roles } = req.body
        //confirm data
        //object desconstuering op basis van sleutels waarden ophalens

        if (!username ||  !password || !Array.isArray(roles) || !roles.length){
            return res.status(400).json({ message: 'all fields are required', user: {}});
        }

        //check duplicate
        //exec cuz your passing something in
        const duplicate = await User.findOne({ username }).collation({ locale: 'nl', strength: 2}).lean();
        
        /**collation maaks the search case insensitieve so Dave or DAvE wourld be reqarded the same */
        
        if (duplicate){
            return res.status(409).json({ message: 'Duplicate username', user: {}});
        }

        //hash password
        const hashedPwd = await bcrypt.hash(password, 10) //salt round

        const userObject = { username, "password": hashedPwd, roles };

        const user = await User.create(userObject);

        if (user){
           return res.status(200).json({ message: `New user ${username} created`, user: {username, roles}});
        } else {
            return res.status(400).json({ message: 'Invalid user data received', user: {}});
        }
    }
)

//@desc Update a users
//@route PATCH /users
//@access Private

const updateUser = asyncHandler(
    async (req, res) => {
        const { id, username, roles, active, password } = req.body

        if (!id || !username ||  !Array.isArray(roles) || !roles.length || typeof active !== 'boolean'){
             return res.status(400).json({ message: 'all fields are required', user: {}});
        }

        const user = await User.findById(id);

        if (!user){
            return res.status(400).json({ message: 'user not found'});
        }

        const duplicate = await User.findOne({ username }).collation({ locale: 'nl', strength: 2}).lean();

        // Allow update to the orignal user

        if (duplicate && duplicate._id.toString() !== id){
            return res.status(409).json({ message: `The username ${username}' is already registered under a different user.`, user: {}})
        }

        user.username = username;
        user.roles = roles;
        user.active = active;

        if (password){
            const hashedPassword = await bcrypt.hash(password, 10);
            user.password = hashedPassword;
        }

        const updatedUser = await user.save()

        if (updatedUser){
            const activetext = updatedUser.active 
                ? 'active' 
                : 'not active';
            const rolestext = updatedUser.roles.map(capitalize).join(', ');

            const rolesTextPrefix = updatedUser.roles.length > 2
                ? 'and has these following roles:'
                : 'and has taken up the role of';

            /**
             * je referereert hier naar de functies zodat map hm zelf kan aanroepen met elke rol, zelf als:
             * @role => capitileze(role)
             * join werkt ook met 1 item
             */

            return res.status(200).json(
                { 
                    message: `The user ${updatedUser.username} is set to ${activetext} ${rolesTextPrefix} ${rolestext}`,
                    user: {username: updatedUser.username, active, roles}
                }
            );
        } else {
            return res.status(400).json(
                { 
                    message: 'user could not be update with given properties',
                    user: {}
                }
            );
        }
    }
)
//@desc Delete a users
//@route delete /users
//@access Private

const deleteUser = asyncHandler(
    async (req, res) => {
        const { id } = req.body;

        if (!id) return res.status(400).json({ message: 'please provide the required id', user: {}});

        const notes = await Note.exists({ user: id });

        if (notes) return res.status(400).json({ message: `User with id ${id} has assigned notes to his name`, user: {}});

        const userToDelete = await User.findById(id);

        if (!userToDelete) return res.status(400).json(
            {
                message: `User with id ${id} could not be found`,
                user: {}
            }
        )

        const deletedResult = await userToDelete.deleteOne();
     
        const reply = `user ${userToDelete.username} with id ${userToDelete._id} deleted`

        if (deletedResult.deletedCount === 1){
            return res.status(200).json(
                { 
                    message: reply, 
                    user: {id, username: userToDelete.username, active: userToDelete.active, roles: userToDelete.roles}
                });
        } else {
            return  res.status(400).json(
                { message : 'User could not be deleted', user: {}}
            );
        }

    }
)

module.exports = {
    getAllUsers,
    createNewUser,
    updateUser,
    deleteUser
}


/**
 * exec is in sommige gevallen nodig om de query uit te voeren en de promise te ontvangen die via await data wordt
 * door exec te chaingen kan je vooraf werken met select, sort of andere manupilatie voor dat je query uitvoert
 */

/**
 * asynchandler is prima om de try catch te vermijden
 * de async moet gewrapped worden
 * er is een package die het nog makkelijker maakt: `npm i express-async-errors`
 * deze hoef alleen gerequired te worden in je servers.js en dan kan je het hier zonder import gebruiken
 */