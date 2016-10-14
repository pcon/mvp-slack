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

    var parsed_data,
        deferred = Q.defer(),
        data = '',
        url = 'https://api.status.salesforce.com/v1/instances/' + instance.toUpperCase() + '/status';

    https.get(url, function (res) {
        if (res.statusCode !== 200) {
            deferred.reject(new Error(res.statusCode));
        } else {
            res.on('data', function (d) {
                data += d;
            });

            res.on('end', function () {
                parsed_data = JSON.parse(data);

                if (parsed_data.key === undefined || parsed_data.key !== instance.toUpperCase()) {
                    deferred.reject(new Error('Unknown instance'));
                } else {
                    deferred.resolve(parsed_data);
                }
            });
        }
    }).on('error', function (e) {
        deferred.reject(e);
    });

    return deferred.promise;
}

function getInstanceAlias(instance) {
    'use strict';

    var parsed_data,
        deferred = Q.defer(),
        data = '',
        url = 'https://api.status.salesforce.com/v1/instanceAliases/' + instance;

    https.get(url, function (res) {
        if (res.statusCode !== 200) {
            deferred.reject(new Error(res.statusCode));
        } else {
            res.on('data', function (d) {
                data += d;
            });

            res.on('end', function () {
                parsed_data = JSON.parse(data);
                deferred.resolve(parsed_data);
            });
        }
    }).on('error', function (e) {
        deferred.reject(e);
    });

    return deferred.promise;
}

module.exports = function (robot) {
    'use strict';

    robot.respond(/status ([A-Za-z0-9]+)$/i, function (msg) {
        var attachment, msg_data,
            match = msg.match[1];

        getInstanceInfo(match)
            .then(function (data) {
                attachment = {
                    title: data.key + ' status',
                    title_link: 'https://status.salesforce.com/status/' + data.key
                };

                if (data.Incidents.length === 0) {
                    attachment.fallback = 'No incidents reported';
                    attachment.thumb_url = 'https://trust.salesforce.com/static/images/user_guide/Healthy@2x.png';
                    attachment.text = 'No incidents reported';
                }

                msg_data = {
                    attachments: [attachment],
                    channel: msg.message.room
                };

                robot.adapter.customMessage(msg_data);
            }).fail(function () {
                msg.reply('Unknown instance "' + match + '"');
            });
    });

    robot.respond(/version ([A-Za-z0-9]+)$/i, function (msg) {
        var attachment, msg_data,
            match = msg.match[1];

        getInstanceInfo(match)
            .then(function (data) {
                attachment = {
                    title: data.key + ' version information',
                    title_link: 'https://status.salesforce.com/status/' + data.key,
                    fields: [
                        {
                            "title": "Release Version",
                            "value": data.releaseVersion,
                            "short": false
                        }
                    ]
                };

                msg_data = {
                    attachments: [attachment],
                    channel: msg.message.room
                };

                robot.adapter.customMessage(msg_data);
            }).fail(function () {
                msg.reply('Unknown instance "' + match + '"');
            });
    });

    robot.respond(/alias ([A-Za-z0-9\.\-]+)$/i, function (msg) {
        var match = msg.match[1];

        getInstanceAlias(match)
            .then(function (data) {
                msg.reply(match + ' runs on ' + data.instanceKey);
            }).fail(function (e) {
                console.log(e);
            });
    });
};