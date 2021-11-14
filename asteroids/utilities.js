function clamp(a,b,c) {
	return Math.max(b,Math.min(c,a));
}

/**
* Takes three floats ranging 0-1 and returns CSS rgb value
*/
function rgb(r, g, b) {
	return "rgb(" +
		shortString((clamp(r, 0, 1) * 255), 5) + ", " +
		shortString((clamp(g, 0, 1) * 255), 5) + ", " +
		shortString((clamp(b, 0, 1) * 255), 5) + ")"
}

function shortString(number, length) {
	return number.toString().substring(0, length);
}

function decimalPlace(number, decimals) {
	let pow = Math.pow(10, decimals);
	return Math.floor(number * pow) / pow
}

function scientificNotation(number, sigfigs = 3) {
    let log = Math.floor(Math.log10(number));
	if(isFinite(number)) return shortString(number * Math.pow(10, -log), sigfigs + 2) + "e" + log;
	return number;
}