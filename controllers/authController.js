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

    res.cookie('__Host-jwt', refreshToken, {
        httpOnly: true, //accessible onbly by the web server
        secure: true, //samesiten none moet samen met secure true, ook voor een local host
        sameSite: 'None', //Cross -site cookie,
        path: '/',
        maxAge: 7 * 24 * 60 * 60 * 1000, //cookie,
        partitioned: true,  // <-- essentieel voor 3P cookies anno 2025

    })

    // send accesToken containing username an roles
    res.json({ accessToken });

    /**
     * path bepaalt op welke url paden van je de site de brouwerser dei cookie meestuurt
     * met path '/' stuuir je de cookie applicatoie breed mee
     * Niet onveilig vanwege http only en https, de same site none is nodig vanwege backend -frontend
     * Maar door de cors bepaal jij welke sites allowed zijn
     * 
     * de partioned cookie: __Host-jwt is nooding om dat de backend via render op verschillende domainen zitten
     * 
     */


});

// @desc Refresh
// @Route GET /auth/refresh
// @acces Public - because acces token has expired

const refresh = (req, res ) => {
    const cookies = req.cookies

    //console.log("cookies", cookies) wat ter controle

    if (!cookies?.['__Host-jwt']) return res.status(401).json({ message: 'Unauthorized request' });


    const refreshToken = cookies['__Host-jwt'];
    
    

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
    res.clearCookie('__Host-jwt', { httpOnly: true, sameSite: 'None', secure: true, partitioned: true })
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


/*
===========================================
🍪 PARTITIONED COOKIES (CHIPS) — UITLEG
===========================================

PROBLEEM (2024/2025):
---------------------
Browsers (Chrome, Edge, later ook anderen) blokkeren "third‑party cookies"
standaard. Een cookie die door domein A is gezet, wordt NIET meer meegestuurd
wanneer je vanaf top-level site B een XHR/fetch naar A doet. Gevolg:
- Refresh-tokens in HttpOnly cookies tussen FE (onrender.com) en API (onrender.com met andere subdomain) gaan NIET mee.
- /auth/refresh geeft 401 omdat req.cookies leeg is.

OPLOSSING: CHIPS / Partitioned Cookies
--------------------------------------
CHIPS = Cookies Having Independent Partitioned State.
In plaats van één globale cookie per domein, krijgt elk cookie een "partition key":
de top-level site (het domein dat in de adresbalk staat). De browser bewaart dus
een **gescheiden kopie** van dezelfde cookie per top-level site. Dat levert:

- ✅ Cookie mag weer worden meegestuurd in een third‑party context (cross-site),
  ZONDER cross-site tracking mogelijk te maken.
- ✅ Werkt voor XHR/fetch, iframes, en andere embed-scenario’s.
- ✅ Geschikt voor refresh-tokens: je API ziet de cookie wanneer je FE die inlaadt.

BELANGRIJKE EISEN (moeten kloppen):
-----------------------------------
1) `partitioned: true`  -> markeert het als CHIPS-cookie.
2) `secure: true`       -> alleen via HTTPS (verplicht).
3) `sameSite: 'None'`   -> omdat het cookie in een cross-site context meegestuurd wordt.
4) `path: '/'`          -> best practice; verplicht als je het __Host- prefix gebruikt.
5) *Geen* `domain`-attribuut bij __Host- cookies.
6) Zet het cookie als `HttpOnly: true` (beschermt tegen XSS).

__Host- PREFIX (aanrader):
--------------------------
Naam je cookie `__Host-jwt`. Dit prefix dwingt extra veiligheid af:
- Vereist `Secure` en `Path=/`.
- Verbiedt het zetten van een `Domain`-attribuut (cookie geldt alleen voor exact host).
- Maakt "cookie fixation" moeilijker.

CONCREET VOORBEELD:
-------------------
res.cookie('__Host-jwt', refreshToken, {
  httpOnly: true,       // JS kan cookie niet lezen (bescherming bij XSS)
  secure: true,         // alleen via HTTPS
  sameSite: 'None',     // nodig voor cross-site requests
  path: '/',            // site-breed (en vereist voor __Host-)
  partitioned: true,    // <-- CHIPS aanzetten
  maxAge: 7 * 24 * 60 * 60 * 1000
});

En bij uitloggen moet je dezelfde flags gebruiken:
res.clearCookie('__Host-jwt', {
  httpOnly: true, secure: true, sameSite: 'None', path: '/', partitioned: true
});

HOE HET WERKT (mentaal model):
------------------------------
- De browser slaat het cookie op als:  (topLevelSite, cookieHost) -> cookieValue
- Sta je op top-level https://technotesmernstack.onrender.com en doe je een fetch
  naar https://technotes-api-qgcr.onrender.com, dan wordt de "partition" herkend:
  topLevelSite = technotesmernstack.onrender.com.
- De browser kan het cookie nu meesturen, maar alléén binnen deze partition.
- Ga je dezelfde API benaderen vanuit een ándere top-level site, krijg je een
  lege (nieuwe) partition. Tracking tussen sites wordt zo voorkomen.
- de prefix gaat dus over backend domain

VEILIGHEID / BEST PRACTICES:
----------------------------
- Partitioned cookies voorkomen tracking, maar je moet nog steeds:
  • `HttpOnly` gebruiken (tegen XSS).
  • Access token in memory houden (niet in cookies/localStorage).
  • CORS correct instellen: server `credentials: true`, client `credentials: 'include'`.
- Overweeg op termijn **één custom (sub)domein** voor FE en API. Dan kun je
  `SameSite=Lax` gebruiken en ben je niet afhankelijk van third‑party policies.
- Gebruik korte TTL voor access tokens (bv. 15m) en een langere voor refresh (bv. 7d).

BROWSER SUPPORT / FALLBACK:
---------------------------
- CHIPS is breed beschikbaar in moderne Chromium-browsers. Up-to-date versies van
  Express' cookie lib ondersteunen `partitioned`.
- Oudere browsers: partitioned wordt genegeerd -> cookie valt terug op third‑party
  rules (en dus mogelijk niet meegestuurd). In praktijk: detecteer fout bij refresh
  en toon een nette melding of adviseer "same-site deployment".

DEBUGGING CHECKLIST:
--------------------
1) Login → Network → /auth → Response Headers: staat `Set-Cookie` met:
   HttpOnly; Secure; SameSite=None; Path=/; Partitioned  ✅
2) DevTools → Application → Cookies → API-host: staat cookie met vlag "Partitioned"? ✅
3) Fetch naar /auth/refresh met `credentials: 'include'`:
   Request Headers bevat `Cookie: __Host-jwt=...` ✅
4) Server-side log `req.cookies` in refresh; als leeg → CORS/credentials niet goed.

TL;DR:
------
Partitioned cookies (CHIPS) maken third‑party cookies weer bruikbaar voor
legitieme cross-site use-cases (zoals refresh-tokens), zónder gebruikers over
sites te kunnen tracken. Met `partitioned: true`, `SameSite=None`, `Secure`,
`HttpOnly` en `Path=/` werkt je refresh-flow weer in 2025‑browsers.
*/
