/*jslint browser: true, regexp: true */
/*global module, require */

// Description:
//   Checks the salesforce trust site and alerts a channel if there is a service interruption
//
// Dependencies:
//   None
//
// Configuration:
//   HUBOT_SFDCTRUST_CHANNELS - A comma separated list of channels to announce to
//
// Commands:
//   status <instance>
//
// Author:
//   pcon

var https = require('https');
var Q = require('q');

function getInstanceInfo(instance) {
    'use strict';

    var deferred = Q.defer(),
        data = '',
        url = 'https://api.status.salesforce.com/v1/instances/' + instance.toUpperCase() + '/status';

    https.get(url, function (res) {
        res.on('data', function (d) {
            data += d;
        });

        res.on('end', function () {
            deferred.resolve(JSON.parse(data));
        });

    }).on('error', function (e) {
        deferred.reject(e);
    });

    return deferred.promise;
}

module.exports = function (robot) {
    'use strict';

    robot.respond(/status ([A-Za-z0-9]+)$/i, function (msg) {
        var match = msg.match[1];

        getInstanceInfo(match)
            .then(function (data) {
                msg.reply('Wat? ' + data.environment);
            });
    });

    robot.respond(/version ([A-Za-z0-9]+)$/i, function (msg) {
        var match = msg.match[1],
            attachment = {};

        getInstanceInfo(match)
            .then(function (data) {
                attachment.title = data.key + ' version information';
                attachment.title_link = 'https://status.salesforce.com/status/' + data.key;
                attachment.fields = [
                    {
                        "title": "Release Version",
                        "value": data.releaseVersion,
                        "short": false
                    }
                ];

                msg.send({attachments: [attachment], username: msg.robot.name, as_user: true});
            });
    });
};