const express = require('express');
const bodyParser = require('body-parser');
const userRoute = require('./routes/mhsRoutes');

const app = express();
const port = process.env.PORT || 3000;

//middleware
app.use(bodyParser.json());

//routing
app.use(userRoute);

// run server
app.listen(port, () => {
    console.log(`Server berjalan pada port ${port}`);
});