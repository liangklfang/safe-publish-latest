'use strict';

var packageVersions = require('npm-package-versions');
var semver = require('semver');
var format = require('util').format;
var getTag = require('./getTag');

var regex = /-/g;
var isPrerelease = function (v) {
	return regex.test(v);
};
var isNotPrerelease = function (v) {
	return !isPrerelease(v);
};

module.exports = function getLatestError(name, version, options, callback) {
	if (process.env.PUBLISH_LATEST_DANGEROUSLY === 'true') {
		return callback(null, '$PUBLISH_LATEST_DANGEROUSLY override enabled.');
	}
	if (getTag() !== 'latest') {
		return callback(null, 'Non-latest dist-tag detected.');
	}
	return packageVersions(name, function (err, allVersions) {
		if (err) {
			return callback([
				'Error fetching package versions:',
				err
			]);
		}

		var versions = allVersions.filter(isNotPrerelease);
		if (versions.length === 0) {
			return callback(null, 'No non-prerelease versions detected.');
		}

		var max = semver.maxSatisfying(versions, '*');
		if (semver.eq(version, max)) {
			return callback([
				'Attempting to publish already-published version v' + version + '.'
			]);
		}

		var greater = semver.gtr(version, versions.join('||'));
		var prerelease = isPrerelease(version);
		if (!greater || prerelease) {
			var msg = prerelease
				? format('Attempting to publish v%s as "latest", but it is a prerelease version.', version)
				: format('Attempting to publish v%s as "latest", but it is not later than v%s.', version, max);
			return callback([
				msg,
				'\nPossible Solutions:',
				'\t1) Provide a dist-tag: `npm publish --tag=backport`, for example',
				'\t2) Use the very dangerous override: `PUBLISH_LATEST_DANGEROUSLY=true npm publish`'
			]);
		}

		return callback(null, format('v%s is later than v%s.', version, max));
	});
};