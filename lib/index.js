var request = require('request')
  , builder = require('xmlbuilder')
  , moment = require('moment')
  , parseXML = require('xml2js').parseString
  , sys = require('sys');


var CanadaPost = function CanadaPost(apiUsername, apiPassword, customerNumber) {
  this.username = apiUsername;
  this.password = apiPassword;

  this.contract = false;
  this.contractId = 0;
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
};

CanadaPost.prototype.setContractId = function(contractId) {
  this.contractId = contractId;
};

CanadaPost.prototype.useContract = function(useContract) {
  this.contract = useContract;
};

/**
 * Finds domestic shipping rates from the Canada Post API
 *
 * @param {json} params Shipment Information
 *  @param {String} params.destinationPostalCode Postal code where package is being shipped to (no spaces, all caps)
 *  @param {Integer} params.weight Weight in kilograms
 *  @param {json} [params.dimensions] Package dimensions in centimeters
 *    @param {Number} params.dimensions.length Longest side in cm (3.0 to 999.9)
 *    @param {Number} params.dimensions.width Second longest side in cm (3.0 to 999.9)
 *    @param {Number} params.dimensions.height Third longest side in cm (3.0 to 999.9)
 * @param callback
 */
CanadaPost.prototype.getRatesDomestic = function(params, callback) {

  var xml = builder.create('mailing-scenario', { 'version': '1.0', 'encoding': 'UTF-8' })
    .att('xmlns', 'http://www.canadapost.ca/ws/ship/rate-v2');

  xml.ele('origin-postal-code', this.originPostalCode).up()
    .ele('destination')
      .ele('domestic')
        .ele('postal-code', params.destinationPostalCode).up().up().up();

  if (this.contract) {
    xml.ele('customer-number', this.customerNumber.toString()).up();
    xml.ele('contract-id', this.contractId.toString()).up();
  } else {
    xml.ele('quote-type', 'counter').up();
  }

  var c = xml.ele('parcel-characteristics')
    .ele('weight', params.weight.toString()).up();

  if (params.dimensions) {
    c.ele('dimensions')
      .ele('length', parseFloat(params.dimensions.length).toFixed(1).toString()).up()
      .ele('width', parseFloat(params.dimensions.width).toFixed(1).toString()).up()
      .ele('height', parseFloat(params.dimensions.height).toFixed(1).toString()).up();
  }

  var xmlString = xml.end({ pretty: true });

  request({
    uri: this.endpoint + '/rs/ship/price',
    headers: this.headers,
    method: 'POST',
    body: xmlString
  }, function (err, response, body) {
    if (err) return callback(err);

    parseXML(body, function(err, result) {
      if (err) return callback(err);

      if (response.statusCode === 403) {
        return callback(new Error(result.messages.message[0].description[0]));
      }

      var r = [];

      for (var q in result['price-quotes']['price-quote']) {
        var cq = result['price-quotes']['price-quote'][q];

        var outQuote = { service: {}, price: {}, serviceStandard: {} };
        outQuote.service.code = cq['service-code'][0];
        outQuote.service.link = cq['service-link'][0]['$']['href'];
        outQuote.service.name = cq['service-name'][0];
        outQuote.price.base = parseFloat(cq['price-details'][0].base[0]);
        outQuote.price.gst = parseFloat(cq['price-details'][0].taxes[0].gst[0]['_'] || 0);
        outQuote.price.pst = parseFloat(cq['price-details'][0].taxes[0].pst[0]['_'] || 0);
        outQuote.price.hst = parseFloat(cq['price-details'][0].taxes[0].hst[0]['_'] || 0);
        outQuote.price.total = parseFloat(cq['price-details'][0].due[0]);
        outQuote.serviceStandard.amDelivery = (cq['service-standard'][0]['am-delivery'][0] == 'true');
        outQuote.serviceStandard.guaranteedDelivery = (cq['service-standard'][0]['guaranteed-delivery'][0] == 'true');
        outQuote.serviceStandard.expectedTransitTime = parseInt(cq['service-standard'][0]['expected-transit-time'][0]);
        outQuote.serviceStandard.expectedDeliveryDate = moment(cq['service-standard'][0]['expected-delivery-date'][0], 'YYYY-MM-DD').unix();

        r.push(outQuote);

      }

      return callback(null, r);

    });

  });

};

