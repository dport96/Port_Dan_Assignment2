// loads the products array into server memory from the products.json file
const products = require(__dirname + '/products.json');

// load user registration data from user_data.json file
let user_data_file = __dirname + '/user_data.json';
const user_data = require(user_data_file);

const express = require('express');
const app = express();

const session = require('express-session');
app.use(session({secret: "MySecretKey", resave: true, saveUninitialized: true}));

// load fs module
const fs = require('fs');

// tmp storage for user quantities from form data
let user_quantities;

const myParser = require("body-parser");
const e = require('express');
app.use(myParser.urlencoded({ extended: true }));

app.all('*', function (request, response, next) {
  console.log(request.method + ' to ' + request.path);
  next();
});

// process login form data
app.post('/process_login', function (req, res, next) {
  console.log(req.body, req.query);
  // Process login form POST and redirect to invoice in page if ok, back to login page 
  const params = new URLSearchParams(req.query);
  params.append('email', req.body.email);
  const errors = {}; // assume no errors to start
  if (req.body.email in user_data) {
    // check if the password is correct
    if (req.body.password == user_data[req.body.email].password) {
      // password ok, send to invoice
      // give the user a cookie with email
      res.cookie('login_email', req.body.email);
      params.append('quantities', req.session.quantities);
      res.redirect('./invoice.html?' + params.toString());
      return;
    } else {
      errors.password = 'Password incorrect';
    }
  } else {
    errors.email = `user ${req.body.email} does not exist`;
  }
  // if errors, send back to login page to fix
  params.append('errors', JSON.stringify(errors));
  res.redirect('./login_page.html?' + params.toString());

});


// process registration form data
app.post('/process_registration', function (req, res, next) {
  console.log(req.body, req.query);
  // Process registration form POST and redirect to invoice in page if ok, back to registraion page 
  const params = new URLSearchParams(req.query);
  params.append('email', req.body.email);

  const errors = {}; // assume no errors to start
  // validate name
  
  // check if email is already taken

  // check if passwords match

  // if errors, send back to registration page to fix otherwise send to invoice
  if (Object.keys(errors).length > 0) {
    params.append('errors', JSON.stringify(errors));
    res.redirect('./registration_page.html?' + params.toString());
  } else { // no  errors, save registration data, reduce inventory, go to invoice
    // save registration data
    let email = req.body.email;
    user_data[email] = {};
    user_data[email].password = req.body.psw;
    // write user_data JSON to file
    fs.writeFileSync(user_data_file, JSON.stringify(user_data));

    // decrease inventory here ** move to when invoice is created **

    res.redirect('./invoice.html?' + params.toString());
  }

});

// A micro-service to return the products data currently in memory on the server as
// javascript to define the products array
app.get('/products.json', function (req, res, next) {
  res.json(products);
});

// A micro-service to process the product quantities from the form data
// redirect to invoice if quantities are valid, otherwise redirect back to products_display
app.post('/process_purchase_form', function (req, res, next) {
  console.log(req.body);
  // only process if purchase form submitted
  const errors = {}; // assume no errors to start
  let quantities = [];
  if (typeof req.body['quantity_textbox'] != 'undefined') {
    quantities = req.body['quantity_textbox'];
    // validate that all quantities are non-neg ints and if any quantity > 0
    let has_quantities = false;
    for (let i in quantities) {
      if (!isNonNegInt(quantities[i])) {
        errors['quantity' + i] = isNonNegInt(quantities[i], true);
      }
      if (quantities[i] > 0) {
        has_quantities = true;
      }
    }
    // if no quanties > 0 then make a no_quanties error
    if (has_quantities === false) {
      errors['no_quanties'] = 'Hey! You need to select some products';
    }
    console.log(Date.now() + ': Purchase made from ip ' + req.ip + ' data: ' + JSON.stringify(req.body));
  }

  // create a query string with data from the form
  const params = new URLSearchParams();
  params.append('quantities', JSON.stringify(quantities));

  // If there are errors, send user back to fix otherwise send to invoice
  if (Object.keys(errors).length > 0) {
    // Have errors, redirect back to store where errors came from to fix and try again
    params.append('errors', JSON.stringify(errors));
    res.redirect('store.html?' + params.toString());
  } else { // not errors, go to invoice
    // decrease inventory here ** move to when invoice is created **
    req.session.quantities = JSON.stringify(quantities);
    res.redirect('./login_page.html');
  }

});

app.use(express.static('./public'));
app.listen(8080, () => console.log(`listening on port 8080`));


function isNonNegInt(q, returnErrors = false) {
  errors = []; // assume no errors at first
  if (q == '') q = 0; // handle blank inputs as if they are 0
  if (Number(q) != q) errors.push('Not a number!'); // Check if string is a number value
  else {
    if (q < 0) errors.push('Negative value!'); // Check if it is non-negative
    if (parseInt(q) != q) errors.push('Not an integer!'); // Check that it is an integer
  }
  return returnErrors ? errors : (errors.length == 0);
}
