

// Very early, and hopefully unnecessary, pre-flight checks. We only run on
// SunOS, and we need the support binaries listed in the core config file.

if (os.platform() !== 'sunos') {
	smfCore.log('err', 'This is not a SunOS platform.');
	process.exit(1);
}

_.each(smfConfig.required_bins, function(bin) {

	if (!fs.existsSync(bin)) {
		smfCore.log('err', 'can\'t find ' + bin);
		process.exit(1);
	}

});
