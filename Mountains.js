/**
 * 
 */
"use strict";



function Mountain(){
	this.mean = 0.0; // Mean height
	this.mwidth = 1.0; /*
	 * longest fractal lengthscale in same
	 * units as height
	 */
	this.rg1= false;
	this.rg2= false;
	this.rg3= true;
	this.cross= true;
	this.force_front= 1;
	this.force_back= 0;
	this.forceval= 0.0;
	this.mix= 0.0;
	this.midmix= 0.0;
	this.fdim= 0.65;
	this.levels= 10;
	this.stop= 2;
	this.f= null;
	this.initialised= false;
	this.set_size=function ( l,  s) {
		if (s < 0 || l < s)
			return;
		if (this.initialised) {
			this.clear();
		}
		this.levels = l;
		this.stop = s;
	};
	this.set_rg= function(r1,r2, r3) {
		// Changing this would mess up the pipeline so re-initialise
		if (this.initialised) {
			this.clear();
		}
		if( r1 != null ){
			this.rg1 = r1;
		}
		if( r2 != null ){
			this.rg2 = r2;
		}
		if( r3 != null){
			this.rg3 = r3;
		}
	};
	this.set_cross=function ( c) {
		// We can change this during the update
		this.cross = c;
	};
	this.set_fdim= function ( fd) {
		// We can change this during the update
		if (fd < 0.5 || fd > 1.0)
			return;
		this.fdim = fd;
		if (this.initialised) {
			this.f.sync();
		}
	};

	this.set_front= function( l) {
		this.force_front = l;
	};

	this.set_back= function( l) {
		this.force_back = l;
		
	};
	this.get_width= function() {
		if (!this.initialised)
			this.init();

		return this.width;
	};

	this.get_fwidth=function() {
		if (!this.initialised)
			this.init();

		return this.fwidth;
	};

	this.init=function() {
		var pwid;
		var len;

		if (this.initialised) {
			return;
		}
		/* the fractal width should be 1.0 */
		pwid = 1 + (1 << (this.levels - this.stop));
		this.width = 1 + (1 << this.levels);
		this.fwidth = this.mwidth * this.width / pwid;
		len = this.mwidth / pwid;
		this.f = new Fold(this, this.levels, this.stop, len);
		this.f.sync();
		this.initialised = true;
	};

	this.clear=function() {
		if (!this.initialised)
			return;

		this.f.clear();
		this.f = null;
		this.initialised = false;
	};

	this.next_strip=function() {
		if (!this.initialised) {
			this.init();
		}
		return this.f.next_strip();
	};

}










	function Fold( param,  levels,  stop,  length) {
		
		var START = 0;
		var STORE = 1;
		var NSTRIP = 8;
		
		var i;

		this.state=START;
		this.p = param;
		if ((levels < stop) || (stop < 0)) {
			// error
			System.exit(1);
		}
		this.length = length;
		this.level = levels;
		this.count = (1 << levels) + 1;
		this.stop = stop;
		this.s = [];
		for (i = 0; i < NSTRIP; i++) {
			this.s[i] = null;
		}
		if (levels > stop) {
			this.next = new Fold(param, (levels - 1), stop, (2.0 * length));
		} else {
			this.next = null;
		}
		this.clear= function() {
			var i;

			/* null all pointers to speed memory reclaim */
			if (this.next != null) {
				this.next.clear();
				this.next = null;
			}
			for (i = 0; i < NSTRIP; i++) {
				this.s[i] = null;
			}
			this.save = null;
		};

		this.sync=function() {
			var root2 = Math.sqrt(2.0);

			this.scale = Math.pow(this.length, (2.0 * this.p.fdim));
			this.midscale = Math.pow((this.length * root2), (2.0 * this.p.fdim));
			if (this.next != null) {
				this.next.sync();
			}
		};
		this.next_strip=function() {
			var result = null;
			var t, i, iter;



			if (this.level == this.stop) {
				result = this.random_strip();
			} else {
				/*
				 * There are two types of strip, A strips - generated by the lower
				 * recursion layers. these contain the corner points and half the
				 * side points B strips - added by this layer, this contains the mid
				 * points and half the side points.
				 *
				 * The various update routines test for null pointer arguments so
				 * that this routine will not fail while filling the pipeline.
				 */
				while (result == null) {
					//

					switch (this.state) {
					case START:
						// perform an update. return first result

						t = 0;
						/* read in a new A strip at the start of the pipeline */
						this.s[t + 0] = double_strip(this.next.next_strip());
						/* make the new B strip */
						this.s[t + 1] = this.Strip(0.0);
						if (this.s[t + 2] == null) {
							/*
							 * we want to have an A B A pattern of strips at the
							 * start of the pipeline. force this when starting the
							 * pipe
							 */
							this.s[t + 2] = this.s[t + 0];
							this.s[t + 0] = double_strip(this.next.next_strip());
						}
						/*
						 * create the mid point t := A B A
						 */
						this.x_update(this.midscale, 0.0, this.s[t + 0], this.s[t + 1], this.s[t + 2]);

						if (this.p.rg1) {
							/*
							 * first possible regeneration step use the midpoints to
							 * regenerate the corner values increment t by 2 so we
							 * still have and A B A pattern
							 */
							if (this.s[t + 3] == null) {
								/*
								 * rather than do no update add offset to old value
								 */
								this.v_update(this.midscale, 1.0, this.s[t + 1], this.s[t + 2], this.s[t + 1]);
							} else {
								this.v_update(this.midscale, this.p.midmix, this.s[t + 1], this.s[t + 2], this.s[t + 3]);
							}
							t += 2;
						}

						/*
						 * fill in the edge points increment t by 2 to preserve the
						 * A B A pattern
						 */
						if (this.p.cross) {
							this.t_update(this.scale, 0.0, this.s[t + 0], this.s[t + 1], this.s[t + 2]);
							this.p_update(this.scale, 0.0, this.s[t + 1], this.s[t + 2], this.s[t + 3]);
							t += 2;
						} else {
							this.hside_update(this.scale, 0.0, this.s[t + 0], this.s[t + 1], this.s[t + 2]);
							this.vside_update(this.scale, 0.0, this.s[t + 2]);
							t += 2;
						}

						if (this.p.rg2) {
							/*
							 * second regeneration step update midpoint from the new
							 * edge values
							 */
							if (this.p.cross) {
								if (this.s[t + 2] == null) {
									/*
									 * add random offset to old rather than skip
									 * update
									 */
									this.p_update(this.scale, this.p.mix, this.s[t + 0], this.s[t + 1], this.s[t + 0]);
								} else {
									this.p_update(this.scale, this.p.mix, this.s[t + 0], this.s[t + 1], this.s[t + 2]);
								}
							} else {
								this.vside_update(this.scale, this.p.mix, this.s[t + 1]);
							}

						}
						/*
						 * increment t by 1 this gives a B A B pattern to regen-3 if
						 * regen 3 is not being used it leaves t pointing to the 2
						 * new result strips
						 */
						t++;
						if (this.p.rg3) {
							/*
							 * final regenration step regenerate the corner points
							 * from the new edge values this needs a B A B pattern
							 * leave t pointing to the 2 new result strips
							 *
							 * this has to be a t_update
							 */
							if (this.s[t + 2] == null) {
								/*
								 * add random offset to old rather than skip update
								 */
								this.t_update(this.scale, 1.0       , this.s[t + 0], this.s[t + 1], this.s[t + 0]);
							} else {
								this.t_update(this.scale, this.p.mix, this.s[t + 0], this.s[t + 1], this.s[t + 2]);
							}
							t++;

						}
						result = this.s[t + 1];
						this.save = this.s[t + 0];
						this.s[t + 0] = this.s[t + 1] = null;
						this.state = STORE;
						break;

					case STORE:
						// return second value from previous update.
						result = this.save;
						this.save = null;
						for (i = NSTRIP - 1; i > 1; i--) {
							this.s[i] = this.s[i - 2];
						}
						this.s[0] = this.s[1] = null;
						this.state = START;
						break;

					default:
						console.log("Unexpected state "+this.state);
					}

				}
			}
			iter = this.level - this.stop;
			if (this.p.force_front > iter) {
				result[0] = this.p.forceval;
			}
			if (this.p.force_back > iter) {
				result[this.count - 1] = this.p.forceval;
			}
			// for(i=0;i<result.length;i++){
			// System.out.println(result[i]);
			// }
			return result;
		};

		this.x_update=function( scale, mix,  a,  b,  c) {
			var i;
			var w;
			var mp, lp, rp;

			/* don't run unless we have all the parameters */
			if (a == null || c == null)
				return;

			w = (1.0 - mix) * 0.25;
			mp = b;
			lp = a;
			rp = c;

			if (mix <= 0.0) {
				// random offset to average of new points
				for (i = 0; i < this.count - 2; i += 2) {
					mp[i + 1] = 0.25 * (lp[i] + rp[i] + lp[i + 2] + rp[i + 2]) + (scale * nextGaussian());
				}
				/* }}} */
			} else if (mix >= 1.0) {
				// random offset to old value
				for (i = 0; i < this.count - 2; i += 2) {
					mp[i + 1] = mp[i + 1] + (scale * nextGaussian());
				}
			} else {
				// mixed update
				for (i = 0; i < this.count - 2; i += 2) {
					mp[i + 1] = (mix * mp[i + 1]) + w * (lp[i] + rp[i] + lp[i + 2] + rp[i + 2])
					+ (scale * nextGaussian());
				}
			}
		};

		this.p_update=function( scale,  mix,  a,  b, c) {
			var i;
			var w;
			var mp, lp, rp;

			/* don't run if we have no parameters */
			if (a == null || b == null)
				return;

			/*
			 * if c is missing we can do a vside update instead should really be a
			 * sideways t but what the heck we only need this at the start
			 */
			if (c == null) {
				this.vside_update(scale, mix, b);
				return;
			}

			w = (1.0 - mix) * 0.25;
			mp = b;
			lp = a;
			rp = c;

			if (mix <= 0.0) {
				// random offset to average of new points
				for (i = 0; i < this.count - 2; i += 2) {
					mp[i + 1] = 0.25 * (lp[i + 1] + rp[i + 1] + mp[i] + mp[i + 2]) + (scale * nextGaussian());
				}
			} else if (mix >= 1.0) {
				// random offset to old values
				for (i = 0; i < this.count - 2; i += 2) {
					mp[i + 1] = mp[i + 1] + (scale * nextGaussian());
				}
			} else {
				// mixed update
				for (i = 0; i < this.count - 2; i += 2) {
					mp[i + 1] = (mix * mp[i + 1]) + w * (lp[i + 1] + rp[i + 1] + mp[i] + mp[i + 2])
					+ (scale * nextGaussian());
				}

			}

		};

		this.t_update=function( scale, mix,  a,  b,  c) {
			var i;
			var w, we;
			var mp, lp, rp;
			var THIRD = (1.0 / 3.0);

			/* don't run unless we have all the parameters */
			if (a == null || c == null)
				return;

			w = (1.0 - mix) * 0.25;
			we = (1.0 - mix) * THIRD;
			mp = b;
			lp = a;
			rp = c;

			if (mix <= 0.0) {
				// random offset to average of new points

				mp[0] = THIRD * (lp[0] + rp[0] + mp[1]) + (scale * nextGaussian());
				for (i = 1; i < this.count - 3; i += 2) {
					mp[i + 1] = 0.25 * (lp[i + 1] + rp[i + 1] + mp[i] + mp[i + 2]) + (scale * nextGaussian());
				}
				mp[i + 1] = THIRD * (lp[i + 1] + rp[i + 1] + mp[i]) + (scale * nextGaussian());

			} else if (mix >= 1.0) {
				// random offset to old values
				for (i = 0; i < this.count; i += 2) {
					mp[i] = mp[i] + (scale * nextGaussian());
				}
			} else {
				// mixed update
				mp[0] = (mix * mp[0]) + we * (lp[0] + rp[0] + mp[1]) + (scale * nextGaussian());
				for (i = 1; i < this.count - 3; i += 2) {
					mp[i + 1] = (mix * mp[i + 1]) + w * (lp[i + 1] + rp[i + 1] + mp[i] + mp[i + 2])
					+ (scale * nextGaussian());
				}
				mp[i + 1] = (mix * mp[i + 1]) + we * (lp[i + 1] + rp[i + 1] + mp[i]) + (scale * nextGaussian());
			}
		};
		this.v_update=function( scale, mix,  a,  b,  c) {
			var i;
			var w, we;
			var mp, lp, rp;

			// don't run unless we have all the parameters
			if (a == null || c == null)
				return;

			w = (1.0 - mix) * 0.25;
			we = (1.0 - mix) * 0.5;
			mp = b;
			lp = a;
			rp = c;

			if (mix <= 0.0) {
				// random offset of average of new points
				mp[0] = 0.5 * (lp[1] + rp[1]) + (scale * nextGaussian());
				for (i = 1; i < this.count - 3; i += 2) {
					mp[i + 1] = 0.25 * (lp[i] + rp[i] + lp[i + 2] + rp[i + 2]) + (scale * nextGaussian());
				}
				mp[i + 1] = 0.5 * (lp[i] + rp[i]) + (scale * nextGaussian());
			} else if (mix >= 1.0) {
				// random offset to old values
				for (i = 0; i < this.count; i += 2) {
					mp[i] = mp[i] + (scale * nextGaussian());
				}
			} else {
				// mixed update
				mp[0] = (mix * mp[0]) + we * (lp[1] + rp[1]) + (scale * nextGaussian());
				for (i = 1; i < this.count - 3; i += 2) {
					mp[i + 1] = (mix * mp[i + 1]) + w * (lp[i] + rp[i] + lp[i + 2] + rp[i + 2])
					+ (scale * nextGaussian());
				}
				mp[i + 1] = (mix * mp[i + 1]) + we * (lp[i] + rp[i]) + (scale * nextGaussian());
			}
		};

		this.hside_update=function(scale, mix, a, b,  c) {
			var i;
			var w;
			var mp, lp, rp;

			// don't run unless we have all the parameters
			if (a == null || c == null)
				return;

			w = (1.0 - mix) * 0.5;
			mp = b;
			lp = a;
			rp = c;

			if (mix <= 0.0) {
				// random offset to average of new points
				for (i = 0; i < this.count; i += 2) {
					mp[i] = 0.5 * (lp[i] + rp[i]) + (scale * nextGaussian());
				}
			} else if (mix >= 1.0) {
				// random offset to old points
				for (i = 0; i < this.count; i += 2) {
					mp[i] = mp[i] + (scale * nextGaussian());
				}
			} else {
				// mixed update
				for (i = 0; i < this.count; i += 2) {
					mp[i] = (mix * mp[i]) + w * (lp[i] + rp[i]) + (scale * nextGaussian());
				}
			}
		};
		this.vside_update=function( scale,  mix,  a) {
			var i;
			var w;
			var mp = [];

			// don't run unless we have all the parameters
			if (a == null)
				return;

			w = (1.0 - mix) * 0.5;
			mp = a;

			if (mix <= 0.0) {
				// random offset to average of new points
				for (i = 0; i < this.count - 2; i += 2) {
					mp[i + 1] = 0.5 * (mp[i] + mp[i + 2]) + (scale * nextGaussian());
				}
			} else if (mix >= 1.0) {
				// random offset to old values
				for (i = 0; i < this.count - 2; i += 2) {
					mp[i + 1] = mp[i + 1] + (scale * nextGaussian());
				}
			} else {
				// mixed update
				for (i = 0; i < this.count - 2; i += 2) {
					mp[i + 1] = (mix * mp[i + 1]) + w * (mp[i] + mp[i + 2]) + (scale * nextGaussian());
				}
			}
		};
		this.random_strip=function() {
			var result = [];
			var i;

			for (i = 0; i < this.count; i++) {
				result[i] = this.p.mean + (this.scale * nextGaussian());
			}
			return result;
		};
		this.Strip=function( value) {
			var res = [];
			var i;
			for (i = 0; i < this.count; i++) {
				res[i] = value;
			}
			return res;
		};

		function double_strip(orig) {
			var l, i, j;
			var result;

			l = orig.length * 2 - 1;
			result = [];
			result[0] = orig[0];
			j = 1;
			for (i = 2; i < l; i = i + 2) {
				result[i - 1] = 0.0;
				result[i] = orig[j];
				j++;
			}
			return result;
		}
	}
