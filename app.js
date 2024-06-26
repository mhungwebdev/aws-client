var createError = require('http-errors');
var express = require('express');
var path = require('path');
var cookieParser = require('cookie-parser');
var logger = require('morgan');
const formidable = require('formidable');
const fs = require('fs');
const CONST = require('./const');
const { initS3, uploadFileToS3 } = require('./aws-tool')

const app = express();
const port = 3000;

/* CONFIG HERE */
const s3 = initS3(CONST.REGION)
const BUCKET_NAME = CONST.BUCKET
/* END CONFIG*/

//upload file api
app.post('/uploadfile', upload_file);
// app.get('/', open_index_page);//call for main index page

var indexRouter = require('./routes/index');
var usersRouter = require('./routes/users');

// view engine setup
app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'ejs');

app.use(logger('dev'));
app.use(express.json());
app.use(express.urlencoded({ extended: false }));
app.use(cookieParser());
app.use(express.static(path.join(__dirname, 'public')));

app.use('/', indexRouter);
app.use('/users', usersRouter);

// catch 404 and forward to error handler
app.use(function(req, res, next) {
  next(createError(404));
});

// error handler
app.use(function(err, req, res, next) {
  // set locals, only providing error in development
  res.locals.message = err.message;
  res.locals.error = req.app.get('env') === 'development' ? err : {};

  // render the error page
  res.status(err.status || 500);
  res.render('error');
});

function upload_file(req, res, next) {
	if (req.method == "POST") {
		// create an incoming form object
		var form = new formidable.IncomingForm();
		// specify that we want to allow the user to upload multiple files in a single request
		form.multiples = true;
		// store all uploads in the /uploads directory
		form.uploadDir = __dirname + '/uploads/'
		// every time a file has been uploaded successfully,
		// rename it to it's orignal name
		form.on('file', async function (field, file) {
			const filename = file.originalFilename
			// console.log(new Date(), "<--- file", file)
			console.log(new Date(), "<--- filename", filename)
			console.log(new Date(), "<--- file.path", file.filepath)

			uploadFileToS3(s3, BUCKET_NAME, file.filepath, filename, file.mimetype, (err, data) => {
				if (err) {
					console.log(new Date(), "uploadFileToS3 Error", err);
				} if (data) {
					console.log(new Date(), "uploadFileToS3 Upload Success", data.Location);
					res.statusMessage = "Upload completed";
					res.statusCode = 200;
					res.json({
						url: data.Location
					})
				}
			})

			// console.log(new Date(), "form.uploadDir", form.uploadDir)
			fs.rename(file.filepath, path.join(form.uploadDir, filename), function (err) {
				if (err) throw err;
			});

		});
		// log any errors that occur
		form.on('error', function (err) {
			console.log('An error has occured: \n' + err);
		});
		// once all the files have been uploaded, send a response to the client
		form.on('end', function () {
			//res.end('success');
		});
		// parse the incoming request containing the form data
		form.parse(req);
	}
}

// function open_index_page(req, res, next) {
// 	if (req.method == "GET") {
// 		res.render('index.ejs');
// 	}
// }

module.exports = app;
