// loads the products array into server memory from the products.json file
const products = require(__dirname + '/products.json');

const express = require('express');
const app = express();

const myParser = require("body-parser");
app.use(myParser.urlencoded({ extended: true }));

app.all('*', function (request, response, next) {
  console.log(request.method + ' to ' + request.path);
  next();
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
  const errors = { }; // assume no errors to start
  let quantities = [];
  if (typeof req.body['quantity_textbox'] != 'undefined') {
     quantities = req.body['quantity_textbox'];
    // validate that all quantities are non-neg ints and if any quantity > 0
    let has_quantities = false;
    for (let i in quantities) {
      if (!isNonNegInt(quantities[i])) {
        errors['quantity' + i] = isNonNegInt(quantities[i], true);
      }
      if(quantities[i] > 0) {
        has_quantities = true;
      }
    }
    // if no quanties > 0 then make a no_quanties error
    if(has_quantities === false) {
      errors['no_quanties'] = 'Hey! You need to select some products';
    }
    console.log(Date.now() + ': Purchase made from ip ' + req.ip + ' data: ' + JSON.stringify(req.body));
  }

  // create a query string with data from the form
  const params = new URLSearchParams();
  params.append('quantities', JSON.stringify(quantities));

  // If there are errors, send user back to fix otherwise send to invoice
  if(Object.keys(errors).length > 0) {
    // Have errors, redirect back to store where errors came from to fix and try again
    params.append('errors', JSON.stringify(errors));
    res.redirect( 'store.html?' + params.toString());
  } else {
    // decrease inventrory here
    res.redirect('./invoice.html?' + params.toString());
  }

});

app.use(express.static('./public'));
app.listen(8080, () => console.log(`listening on port 8080`));


function isNonNegInt(q, returnErrors = false) {
  errors = []; // assume no errors at first
  if(q == '') q = 0; // handle blank inputs as if they are 0
  if (Number(q) != q) errors.push('Not a number!'); // Check if string is a number value
  else {
    if (q < 0) errors.push('Negative value!'); // Check if it is non-negative
    if (parseInt(q) != q) errors.push('Not an integer!'); // Check that it is an integer
  }
  return returnErrors ? errors : (errors.length == 0);
}
