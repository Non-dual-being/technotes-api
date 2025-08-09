require('dotenv').config()
const express = require('express');
const app = express();
const path = require('path');
const PORT = process.env.PORT || 3500;
const router = require(path.join(__dirname, 'routes', 'root'));
const { logEvents, logger } = require(path.join(__dirname, 'middleware', 'logger'));
const errorHandler = require(path.join(__dirname, 'middleware', 'errorHandler' ));
const cookieParser = require('cookie-parser');
const cors = require('cors');
const connnectDB = require(path.join(__dirname, 'config', 'dbConn'))
const mongoose = require('mongoose');
const corsOptions = require(path.join(__dirname, 'config', 'corsOptions'))


app.use(logger);
connnectDB();


app.set('trust proxy', 1); 

/**
 * Met render (een reverse proxy) is deze instelling belangrijk
 * Je vertelt express dat je precies 1 proxy moet vertrouwen
 * Dit helpt expres om de X-forwarder headers om
 *  -------reg procotol goed te bepalen
 * --------reg.secure op true te zetten
 * ---------reg.ip correct te bepalen
 * 
 */
app.use(cors(corsOptions));
app.use(express.json());

/**
 * !express.json() niet mounten op de '/'
 * kan ertoe leiden dat preflights en headers niet goed worden gezet
 * en dat req.cookies niet beschikbaar is als het de endpoints bereikt
 * 
 * 
 * 
 * */

app.use(cookieParser());

app.use('/', express.static(path.join(__dirname, 'public')));

app.use('/', router);

app.use('/auth', require('./routes/authRoutes'));


app.use('/users', require('./routes/userRoutes'));

app.use(/^\/notes$/, require(path.join(__dirname, 'routes', 'notesRoutes')));

app.all(/^\/.*/, (req, res) => {
    res.status(404);
    if (req.accepts('html')){
        res.sendFile(path.join(__dirname, 'views', '404.html'));
    } else if (req.accepts('json')){
        res.json({ 'message' : 'Sorry Not Found'});
    } else {
        res.type('txt').send('404 not found');
    }

});

app.use(errorHandler);
mongoose.connection.once('open', () => {
    console.log('Connected to MongoDB')
    app.listen(PORT, () => console.log(`server running on ${PORT}`));
});

mongoose.connection.on('error', err => {
    console.log(err);
    logEvents(`${err.no}: ${err.code}\t${err.syscall}\t${err.hostname}`,
        'mongoErrLog.log'
    )
})


/** -------  [require('dontenv').config explanation]------- */

/**
 * bij de opstart worden je variabelen geladen in je .env
 * In Globale VARIABELE proccess.env kom ze te staan
 * in andere bestand is die globale variable beschikbaar
 * 
 */