var request = require('request')
  , builder = require('xmlbuilder')
  , parseXML = require('xml2js').parseString
  , sys = require('sys');


var CanadaPost = function CanadaPost(apiUsername, apiPassword, customerNumber) {
  this.username = apiUsername;
  this.password = apiPassword;

  this.customerNumber = customerNumber;

  this.env = process.env.NODE_ENV || 'development';

  if (this.env !== 'production') {
    this.endpoint = 'https://ct.soa-gw.canadapost.ca';
  } else {
    this.endpoint = 'https://soa-gw.canadapost.ca';
  }

  this.headers = {
    'Authorization': 'Basic ' + new Buffer(this.username + ':' + this.password).toString('base64'),
    'Content-Type': 'application/vnd.cpc.ship.rate-v2+xml',
    'Accept': 'application/vnd.cpc.ship.rate-v2+xml'
  };

};

module.exports = function(apiUsername, apiPassword, customerNumber) {
  return new CanadaPost(apiUsername, apiPassword, customerNumber);
};

CanadaPost.prototype.setOriginPostalCode = function(postalCode) {
  this.originPostalCode = postalCode;
}

CanadaPost.prototype.getRatesDomestic = function(params, callback) {

  var xml = builder.create('mailing-scenario', { 'version': '1.0', 'encoding': 'UTF-8' })
    .att('xmlns', 'http://www.canadapost.ca/ws/ship/rate-v2')
    .ele('customer-number', this.customerNumber).up()
    .ele('parcel-characteristics')
      .ele('weight', params.weight.toString()).up().up()
    .ele('origin-postal-code', this.originPostalCode).up()
    .ele('destination')
      .ele('domestic')
        .ele('postal-code', params.destinationPostalCode)
    .end({ pretty: true });

  request({
    uri: this.endpoint + '/rs/ship/price',
    headers: this.headers,
    method: 'POST',
    body: xml
  }, function (err, response, body) {
    if (err) return callback(err);

    parseXML(body, function(err, result) {
      if (err) return callback(err);

      if (response.statusCode === 403) {
        return callback(new Error(result.messages.message[0].description[0]));
      }

      return callback(null, result['price-quotes']);

    });

  });

};

