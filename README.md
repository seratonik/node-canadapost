node-canadapost
===============

A node module for integrating with Canada Post's shipping API

This module is early in its development and has limited functionality. Feel free to contribute.


Getting Started
---------------

The easiest way to grab the module is through `npm`:

    npm install canadapost


Pass your username, password and customer ID for the Canada Post API when requiring the library:

    var CanadaPost = require('canadapost')('<username>', '<password>', '<customerId>');

The module uses your NODE_ENV environment variable to determine if it's authenticating against their
production or development servers, if NODE_ENV is set to anything other than 'production' it will assume
development.

Start by setting up some defaults, these can be changed any time before calling the API:

    // Put your postal code here, should match the one Canada Post has on file. No spaces, all caps.
    CanadaPost.setOriginPostalCode('V1V2A2');

    // Optionally provide a contract ID and tell the system to use contract rates when calculating costs.
    // Defaults to counter rates otherwise.
    CanadaPost.setContractId(5555);
    CanadaPost.useContract(true);


Finding Rates for a Package
---------------------------

Call the `getRatesDomestic` function and pass an object containing at least a weight and destinationPostalCode.
Optionally you can send along package dimensions (length is the longest side, width the next longest, and height the
smallest of the sides). Weight is measured in KiloGrams and dimensions are in CentiMeters.

Postal codes should always be all caps with no spaces.

Example:

    CanadaPost.getRatesDomestic({
      weight: 10, // kg
      dimensions: {
        length: 64.5,
        width: 54.234,
        height: 12
      },
      destinationPostalCode: 'H0H0H0'
    }, function(err, rates) {
      console.log(err,rates);
    });


License
-------

This library is licensed under the [MIT license][license]



[license]: http://opensource.org/licenses/MIT