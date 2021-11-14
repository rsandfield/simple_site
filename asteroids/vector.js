class Vector {
	/**
	 * A two dimenionsal vector
	 * @param {Number} x 
	 * @param {Number} y 
	 */
	constructor(x, y) {
		this.x = x;
		this.y = y;
	}
	
	/**
	 * Adds the x and y values of another vector to this one
	 * @param {Vector} vector Two dimensional vector to add to this one
	 */
	add(vector) {
		return new Vector(
			this.x + vector.x,
			this.y + vector.y
		);
	}

	/**
	 * Subtracts the x and y values of another vector from this one
	 * @param {Vector} vector Two dimensional vector to subtract from this one
	 */
	subtract(vector) {
		return new Vector(
			this.x - vector.x,
			this.y - vector.y
		);
	}
	
	/**
	 * Multiplies the x and y values of the vector by a scalar
	 * @param {Number} scalar Value to multiply vector x and y by
	 */
	multiply(scalar) {
		return new Vector(
			this.x * scalar,
			this.y * scalar
		);
	}
	
	/**
	 * Divides the x and y values of the vector by a scalar
	 * @param {Number} scalar Value to divide vector x and y by
	 */
	divide(scalar) {
		return new Vector(
			this.x / scalar,
			this.y / scalar
		);
	}
	
	/**
	 * Rotates the vector around its origin by a given number of radians
	 * @param {Number} radians Amount to rotate by
	 */
	rotate(radians) {
		let magnitude = this.magnitude();
		let angle = this.angle();
		return new Vector(
			magnitude * Math.cos(angle + radians),
			magnitude * Math.sin(angle + radians)
		);
	}
	
	/**
	 * Get the angle of the vector relative to its origin
	 */
	angle() {
		return Math.atan2(this.y, this.x);
	}
	
	/**
	 * Get the squared magnitude of the vector relative to its origin
	 */
	magnitudeSquared() {
		return Math.pow(this.x, 2) + Math.pow(this.y, 2);
	}
	
	/**
	 * Get the magnitude of the vector relative to its origin
	 */
	magnitude() {
		return Math.pow(this.magnitudeSquared(), 0.5);
	}
	
	/**
	 * Get the norm of the vector
	 */
	normalized() {
		let magnitude = this.magnitude();
		return new Vector(
			this.x / magnitude,
			this.y / magnitude
		);
	}
	
	/**
	 * Get the scalar dot product of this vector and another
	 * @param {Vector} vector Vector to find dot product with
	 */
	dotProduct(vector) {
		return this.x * vector.x + this.y * vector.y;
	}
	
	crossProduct(vector) {
		return this.x * vector.y - this.y * vector.x;
	}
	
	toString() {
		return shortString(this.x, 5) + ", " + shortString(this.y, 5);
	}
}

/**
 * Draws an arrow at a position pointing at another position
 * @param {Vector} position Vector of origin
 * @param {Vector} target Vector arrow points at
 * @param {Number} radius Radius of arc
 * @param {Number} arrowLenth Length of arrow past arc
 * @param {Number} arrowArc Full width of arrow arc in radians
 */
function arrowToTarget(position, target, radius, arrowLenth, arrowArc) {
	let angle = position.subtract(target).angle();
	context.rotate(angle);
	context.beginPath();
	context.beginPath();
	context.moveTo(-(radius + arrowLenth), 0);
	context.arc(
		0,0,
		radius,
		Math.PI * (1 - arrowArc / 2),
		Math.PI * (1 + arrowArc / 2)
	);
	context.lineTo(-(radius + arrowLenth), 0);
	context.stroke();
	context.rotate(-angle);
	return angle;
}