const { logEvents } = require('./logger');

const errorHandler = (err, req, res, next) => {
    logEvents(
        `${err.name}: ${err.message}\t${req.method}\t${req.url}\t${req.headers.origin}`,
        'errorLog.log'
    );
    console.log(err.stack);

    const status = res.statusCode 
        ? res.statusCode
        : 500; //servererror

    res.status(status).json({ message: err.message, isError: true });
    /**het is 1 respons en je stuur meteen json op, dus chainen voor de duidelijkheid */
}

module.exports = errorHandler;

/**
 * geen async van errorHandler en geen await bij de logEvents
 * Dit omdat de response aan de client niet vertraagd mag worden, het loggen is: 
 * ?fire and forget
 * de foutcode terug aan de client mag niet vertraging oplopen door het loggen, aanvullend wil je de server niet doorgaat op een fout en dat de fout meeteen kenbaar is voor de client
 * todo: message of 'message'
 * dat is in principe hetzelfde, voor x-error-message gebruik je wel haakjes voor message niet nodig omdat het javascript is en voldoet aan een set van regels zoals allemaal cijfers en letter, geen spatie en geen -. Alles wat afwijkt een '' gebruiken
 * redux with rtk query the is error is needed.
 *  */