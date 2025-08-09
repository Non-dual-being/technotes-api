const User = require('../models/User')
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const asyncHandler = require('express-async-handler');

// @desc Login
// @route POST /auth
// @access PUblic

const login = asyncHandler(async (req, res) => {
    const { username, password } = req.body 

    /*
        object - destructuring (sleutels gebruiken om waarden te pakken) 
    */

    if (!username || !password ) return res.status(400).json({ message: 'All fields are required'})

    /*
        met await geen .exec() nodig, door await te gebruiken pak je data uit de promise
        onderdeel van mongoose model
    */

    const foundUser = await User.findOne({ username })

    if (!foundUser || !foundUser.active) return res.status(401).json({ message: 'Unauthorized'});

    const match = await bcrypt.compare(password, foundUser.password)

    if (!match) return res.status(401).json({ message: 'Unauthorized'});

    const accessToken = jwt.sign(
        {
            "UserInfo" : {
                "username" : foundUser.username,
                "roles" : foundUser.roles
            }
        },
        process.env.ACCESS_TOKEN_SECRET, //process.env is globaal
        { expiresIn: '15m'}
    )

    const refreshToken = jwt.sign(
        { "username" : foundUser.username },
        process.env.REFRESH_TOKEN_SECRET,
        { expiresIn : '7d' }
    )

    /**
     * jwt verwacht (payload, key, options als object, string, object)
     * de waarden uit je process.env zijn altijd strings
     * jwt zijn base64 gecodeerd en worden met de secret ondertekend
     * 
     */

    res.cookie('jwt', refreshToken, {
        httpOnly: true, //accessible onbly by the web server
        secure: true, //samesiten none moet samen met secure true, ook voor een local host
        sameSite: 'None', //Cross -site cookie,
        maxAge: 7 * 24 * 60 * 60 * 1000 //cookie 

    })

    // send accesToken containing username an roles
    res.json({ accessToken });


});

// @desc Refresh
// @Route GET /auth/refresh
// @acces Public - because acces token has expired

const refresh = (req, res ) => {
    const cookies = req.cookies

    //console.log("cookies", cookies) wat ter controle

    if (!cookies?.jwt) return res.status(401).json({ message : 'Unauthorized no data'})
    
    const refreshToken = cookies.jwt;

    jwt.verify(
        refreshToken,
        process.env.REFRESH_TOKEN_SECRET,
        asyncHandler(async (err, decoded) =>{

            //if there is a error of the verify it wil be also passend here automatically
            if (err) return res.status(403).json({ message : 'Forbidden'});

            const foundUser = await User.findOne({ username: decoded.username })
            
            if (!foundUser) return res.status(401).json({ message : 'Unauthorized'});

            const accessToken = jwt.sign
            (
                {
                "UserInfo" : 
                    {
                        "username" : foundUser.username,
                        "roles" : foundUser.roles
                    }
                },
                process.env.ACCESS_TOKEN_SECRET, //process.env is globaal
                { expiresIn: '15m'}
            )
            
            res.json({ accessToken })
        })
    )

}

// #desc Logout
// @route POST /auth/logout
// @acces PUblic - just to clear cookie if exists

const logout = (req, res) => {
    const cookies = req.cookies
    if (!cookies?.jwt) return res.sendStatus(204) // No content
    res.clearCookie('jwt', { httpOnly: true, sameSite: 'None', secure: true })
    res.json({ message: 'Cookie cleared'})

}

module.exports = {
    login,
    refresh,
    logout
}


/** -------------JWT [JSON-WEB-TOKENS] ----------------*/

/**
 * USER IDENTIFICATION -> AFTER INITIAL USER AUTHENTIFICATION
 * AFTER AUTHENFICATION A ACCESTOKEN AND REFRESHTOKEN IS GRANTED TO A USER
 * ACCESTOKEN SHORT TIME AND REFRESH TOKEN LONG TIME
 * 
 * ACCES TOKENS ARE SEND AN RECIEVED AS JSON DATA
 * ACCES TOKENS ARE STORED IN THE APPLICATION STATE AND ARE AUTOMATICALLY LOST WHEN APP IS CLOSED
 * !DO NOTE STORE IN LOCAL STORAGE OR COOKIES -> EASY ACCES VOOR HACKERS
 * 
 * REFRESH TOKENS ARE SENT IN A HTTP ONLY COOKIE NOT ACCESIBLE TROUGH JAVASCRIPT
 * HAS TO HAVE A EXPIRED POINT AND A REFRESH TOKE MAY NOT HAVE A ABBILITY TO CREATE NEW REFRESH TOKEN
 * 
 * 
 * ACCES TOKEN ISSUED AFTER AUTHENFICATION AND IS USED TO GRANT OR NOT GRANT THE ABILITY TO PEFORM CERTAIN ACTIONS
 * A EXPIRED ACCESS TOKEN MEANS THAT THE REFRESH TOKEN HAS TO BE USED TO MAKE A NEW ACCES TOKEN
 * 
 * REFRESH TOKEN ARE ALSO VERIFIED AND OFCOURS ALSO OCCUR AFTER AUTHENFICATION
 * A VALID REFRESH TOKEN CAN ISSUE A NEW ACCES TOKEN
 */

/**
 * cross site 
 * strict -> cookies alleen van zelfde site meesturen
 * Lax Cookies wordne alleen meegestuurd bij navigatie
 * Cookkies worden alijtd meegestuurd 
 * Cross site none gaat altijd samen met secure true
 */


/*
===========================
🔐 JWT STRUCTUUR — ALGEMEEN
===========================

Een JWT (JSON Web Token) bestaat altijd uit 3 delen, gescheiden door punten:
    HEADER . PAYLOAD . SIGNATURE

1. HEADER
   - Bestaat uit een JSON-object.
   - Bevat minimaal:
        • "alg": het algoritme voor ondertekening (bijv. "HS256")
        • "typ": het type token (meestal "JWT")
   - Wordt base64url-gecodeerd.

2. PAYLOAD
   - Bevat de claims of gegevens, zoals gebruikersnaam, rollen, enz.
   - Wordt ook base64url-gecodeerd.
   - Bevat automatisch gegenereerde velden zoals:
        • "iat" (issued at: tijdstip van creatie)
        • "exp" (expiration: vervaltijdstip)

3. SIGNATURE
   - Wordt berekend met:
        HMACSHA256(
            base64urlEncode(header) + "." + base64urlEncode(payload),
            SECRET
        )
   - Zorgt ervoor dat de token niet aangepast kan worden zonder geldige sleutel.
   - Als de signature niet klopt bij verificatie, is de token ongeldig.

===============================
🔍 TOEPASSING OP DEZE SITUATIE
===============================

Bij het genereren van je refresh token:

    const refreshToken = jwt.sign(
        { "username": foundUser.username },
        process.env.REFRESH_TOKEN_SECRET,
        { expiresIn: '1d' }
    );

► HEADER (automatisch door jsonwebtoken):
    {
        "alg": "HS256",
        "typ": "JWT"
    }

► PAYLOAD (door jou opgegeven + automatisch aangevuld):
    {
        "username": "kevin",
        "iat": <timestamp>,
        "exp": <timestamp>
    }

► SECRET:
    process.env.REFRESH_TOKEN_SECRET (een string uit je .env bestand)

► SIGNATURE:
    Wordt automatisch gegenereerd met HMAC-SHA256 over header + payload + secret

Bij verificatie:

    jwt.verify(
        refreshToken,
        process.env.REFRESH_TOKEN_SECRET,
        ...
    )

• jwt.verify controleert de handtekening:
    • De header en payload worden opnieuw ingelezen
    • De handtekening wordt opnieuw berekend met de opgegeven secret
    • Als die overeenkomt met de signature in de token → token is geldig
    • Anders → error (bijv. 'invalid signature' of 'jwt expired')

*/
