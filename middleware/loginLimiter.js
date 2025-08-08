const rateLimit = require('express-rate-limit');
const { logEvents } = require('./logger');

const loginLimiter = rateLimit({
    windowMs: 60 * 1000, // 1 minute
    max: 5, //Limit each IP to 5 login requests per `window` per minute
    message: {
        error: 'Too many login attempts from this IP, please try again after a 60 second pause'
    },
    handler: (req, res, next, options) => {
        logEvents(
            `Too many login Requests: ${options.message.error}\t${req.method}\t${req.url}\t${req.headers.origin}`, 
            'errorLog.log'
        )
        res.status(options.statusCode).send(options.message)  
    },
    standardHeaders: true, //return rate limit info in the `RateLimit` headers
    legacyHeaders: false, //Disable the `X-RateLimit` headers
});

module.exports = loginLimiter;


/**
 * handler overschrijft dat stanbdaard middleware en gaat in van zodra je rate limite van 5 per minuut per ip wordt overschreden
 * De status wordt 429 (too many requests): standaard uit  de interne config van rate limit
 * 
 * ----------------------[rate limite info in de respons headers]----------
 * 
 * standard headers true zorgt er voor dat op de moderne manier je header voorziet van de rate-limit info 
 * Een header is metadata toegevoegd aan je respons'
 * In dit geval gebruik je de keys RateLimit-Limit: 5 en RateLimit-Remaning: 2
 * De oude manier is emt de X ervoor
 */