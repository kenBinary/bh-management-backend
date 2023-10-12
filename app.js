// module imports
const createError = require('http-errors');
const express = require('express');
const path = require('path');
const cookieParser = require('cookie-parser');
const logger = require('morgan');
const app = express();
const bcrypt = require('bcrypt');
const pool = require('./models/dbPool')
const asyncHandler = require('express-async-handler')
const cors = require('cors');


app.use(logger('dev'));
app.use(express.json());
app.use(express.urlencoded({ extended: false }));
app.use(cookieParser());
app.use(express.static(path.join(__dirname, 'public')));
app.use(express.json());
app.set('view engine', 'ejs');

// global middleware
// app.use((req, res, next) => {
//   res.set({
//     'Access-Control-Allow-Origin': '*',
//     'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE',
//     "Access-Control-Allow-Headers": "*"
//   });
//   next();
// });
app.use(cors());


// imported routes
const tenantRouter = require('./routes/tenant');
const roomRouter = require("./routes/room");
const necessityRouter = require("./routes/necessity");
const roomFeeRouter = require("./routes/roomfee");
const utilityFeeRouter = require("./routes/utilityfee");
const necessityfeeRouter = require("./routes/necessityfee");
const paymentRouter = require("./routes/payment");
const dashboardRouter = require("./routes/dashboard");

// routes used
app.use('/tenant', tenantRouter);
app.use("/necessity", necessityRouter);
app.use("/roomfee", roomFeeRouter);
app.use("/utilityfee", utilityFeeRouter);
app.use("/necessityfee", necessityfeeRouter);
app.use("/payment", paymentRouter);
app.use("/dashboard", dashboardRouter);
app.use("/room", roomRouter);
app.post("/login", asyncHandler(async (req, res, next) => {
  const username = req.body.username;
  const password = req.body.password;
  const connection = await pool.getConnection();
  const user = await connection.execute("select * from admin where username = ? ", [username]);
  connection.end();
  if (user.length > 0) {
    bcrypt.compare(password, user[0].passHash, function (err, result) {
      res.json({
        auth: result
      })
    });
  }
}));

// catch 404 and forward to error handler
app.use(function (req, res, next) {
  next(createError(404));
});


// error handler
app.use(function (err, req, res, next) {
  // set locals, only providing error in development
  res.locals.message = err.message;
  res.locals.error = req.app.get('env') === 'development' ? err : {};
  // render the error page
  res.status(err.status || 500);
  res.render('error');
});

module.exports = app;
