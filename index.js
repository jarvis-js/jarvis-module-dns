var dns = require('dns');

module.exports = function(jarvis, module) {

	var recordTypes = [ 'A', 'AAAA', 'MX', 'TXT', 'PTR', 'NS', 'CNAME' ];

	module.addAction(module.createCommand({
		match: /^resolve (?:(.*) record for )?(.*)$/i,
		func: function(message, type, domain) {
			if (type === undefined) {
				type = 'A';
			}
			type = type.toUpperCase();
			if (recordTypes.indexOf(type) === -1) {
				jarvis.reply(message, 'Invalid record type. ' + recordTypes.slice(0, -1).join(', ') + ' and ' + recordTypes.slice(-1) + ' available.');
				return;
			}
			dns.resolve(domain, type, function(err, addresses) {
				var reply;
				if (err) {
					jarvis.reply(message, handleError(err.code));
					return;
				}
				reply = type + ' record for ' + domain + ' resolves to ';
				switch (type) {
					case 'A':
					case 'AAAA':
						reply += addresses[0];
						break;

					case 'MX':
						var domains = [];
						addresses.forEach(function(value) {
							domains.push(value.exchange + ' (' + value.priority + ')');
						});
						reply += domains.join(', ');
						break;

					case 'TXT':
						var results = [];
						addresses.forEach(function(value) {
							results.push('"' + value + '"');
						});
						reply += results.join(', ');
						break;

					case 'PTR':
					case 'NS':
					case 'CNAME':
						reply += addresses.join(', ');
						break;
				}
				jarvis.reply(message, reply);
			});
		}
	}));

	module.addAction(module.createCommand({
		match: 'reverse resolve :ip',
		func: function(message, ip) {
			dns.reverse(ip, function(err, domains) {
				if (err) {
					jarvis.reply(message, handleError(err.code));
					return;
				}
				jarvis.reply(message, ip + ' reverse resolves to ' + domains.join(', '));
			});
		}
	}));

};

function handleError(code) {
	var reply;
	switch(code) {
		case 'ETEMPFAIL':
			reply = 'Timeout containg DNS server.';
			break;

		case 'EPROTOCOL':
			reply = 'Got garbled reply.';
			break;

		case 'ENXDOMAIN':
			reply = 'Domain does not exist.';
			break;

		case 'ENODATA':
			reply = 'No record found.';
			break;

		case 'ENOMEM':
			reply = 'Out of memory while processing.';
			break;

		case 'EBADQUERY':
			reply = 'The query was malformed.';
			break;
	}
	return reply;
}
