var express = require('express');
var router = express.Router();
var jsdom = require('jsdom');
var config = require('config');
var mysql = require('mysql');

var conn = mysql.createConnection(
    config.get('mysql')
);

var sql = "INSERT INTO company (cityID, placeID, name, email, phone, address) VALUES ?";


var emailRegex = /([\w\.\-_0-9])*(@)[\w0-9][\w\-_0-9]*((\.)[\w\-_0-9]+)/;
var placeIdRegex = /-([d]\d+)-/;
var cityIdRegex = /-([g]\d+)-/;

/* GET home page. */
router.get('/', function (req, res, next) {
    res.render('index', {title: 'Express'});
});

router.post('/', function (req, res, next) {

    var findUrl = req.body.url;
    var action = req.body.action;

    if (action == 'start' && findUrl) {

        var urlParts = findUrl.split("-");
        var endUrl = '';
        for (var j = 2; j < urlParts.length; j++) {
            endUrl += '-' + urlParts[j];
        }

        jsdom.env(findUrl, function (err, window) {
            if (!err) {
                var pCount = 0;
                var pWrapDom = window.document.getElementsByClassName('pageNumbers');
                if (pWrapDom[0]) {
                    pCount = pWrapDom[0].lastElementChild.textContent * 30;
                    console.log(pCount);
                }
                var cuurPage = 0;

                var intervalId = setInterval(function () {

                    if (cuurPage > pCount) {
                        clearInterval(intervalId);
                        return;
                    } else {
                        console.log('--------------------------------------------------' + cuurPage);
                        getPageItems(function (data) {
                            console.log(data[0][3]);
                            conn.query(sql, [data], function (err) {
                                //if (err) throw err;
                                //conn.end();
                            });
                        });
                    }
                }, 20000);

                var getPageItems = function (next) {

                    var linkPart = 'oa' + cuurPage;

                    jsdom.env(urlParts[0] + '-' + urlParts[1] + '-' + linkPart + '-' + endUrl, function (err, window) {
                        var aPlaces = window.document.getElementsByClassName('property_title');
                        for (var i = 0; i < 30; i++) {
                            setDelay(i, function (row) {
                                next(row);
                            });
                        }

                        function setDelay(i, next) {

                            jsdom.env('https://www.tripadvisor.com' + aPlaces[i].getAttribute('href', 2), function (err, window) {

                                var getEmail = function (cb) {
                                    var eWrapDom = window.document.getElementsByClassName('contact_info');
                                    if (eWrapDom[0]) {
                                        var eWrapHtml = eWrapDom[0].innerHTML;
                                        if (eWrapHtml != null) {
                                            var eRgx = emailRegex.exec(eWrapHtml);
                                            if (eRgx) {
                                                return cb(eRgx[0]);
                                            } else {
                                                return cb('');
                                            }
                                        }
                                    }
                                };


                                var getPhone = function (cb) {
                                    var pWrapDom = window.document.getElementsByClassName('phoneNumber');
                                    if (pWrapDom[0]) {
                                        var pWrapHtml = pWrapDom[0].innerHTML;
                                        if (pWrapHtml) {
                                            return cb(pWrapHtml);
                                        } else {
                                            return cb('');
                                        }
                                    }
                                };

                                var getTitle = function (cb) {
                                    var tWrapDom = window.document.getElementById('HEADING').innerHTML.toString();
                                    if (tWrapDom) {
                                        var tWrapHtml = tWrapDom.replace('<div class="heading_height"></div>', '').replace(/(\r\n|\n|\r)/gm, '').trim();
                                        if (tWrapHtml) {
                                            return cb(tWrapHtml);
                                        } else {
                                            return cb('');
                                        }
                                    }
                                };

                                var getAddress = function (cb) {
                                    var k = window.document.getElementsByClassName('info_wrapper')[0];
                                    var aWrapDom = k.getElementsByTagName('address')[0].innerHTML;
                                    if (aWrapDom) {
                                        var aWrapHtml = aWrapDom.replace(/<\/?[^>]+(>|$)/g, '').replace(/(\r\n|\n|\r)/gm, '').trim();
                                        if (aWrapHtml) {
                                            return cb(aWrapHtml);
                                        } else {
                                            return cb('');
                                        }
                                    }
                                };

                                var getPlaceId = function (cb) {
                                    var placeId = placeIdRegex.exec(window.document.URL);
                                    if (placeId) {
                                        return cb(placeId[1]);
                                    } else {
                                        return cb('');
                                    }
                                };

                                var getCityId = function (cb) {
                                    var cityId = cityIdRegex.exec(window.document.URL);
                                    if (cityId) {
                                        return cb(cityId[1]);
                                    } else {
                                        return cb('');
                                    }
                                };

                                next([
                                    [getCityId(function (cityId) {
                                        return (cityId);
                                    }),
                                        getPlaceId(function (placeId) {
                                            return (placeId);
                                        }),
                                        getTitle(function (title) {
                                            return (title);
                                        }),
                                        getEmail(function (email) {
                                            return (email);
                                        }),
                                        getPhone(function (phone) {
                                            return (phone);
                                        }),
                                        getAddress(function (address) {
                                            return (address);
                                        })]
                                ]);


                            });

                        }

                        cuurPage += 30;
                    });


                };


            }


        });

        res.json({status: "Done"});

    }


});

module.exports = router;
