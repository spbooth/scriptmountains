/**
 * 
 */

"use strict";

function Artist(image,width, height,  mm) {
	var SIDE = 1.0;
	var BLACK = 0;
	var WHITE = 1;
	var SEA_LIT = 2;
	var SEA_UNLIT = 3;
	var SKY = 4;
	var BAND_BASE = 5;
	var BAND_SIZE = 80;
	var N_BANDS = 3;
	var DEF_COL = (BAND_BASE + (N_BANDS * BAND_SIZE));
	var MIN_COL = (BAND_BASE + (N_BANDS * 2));

	
	
	this.initialised = false;
	this.m = mm;
	this.image=image;
	this.graph_width = width;
	this.graph_height = height;
	
	

	
	this.base = 0;
	this.shadow=[];
	this.a_strip = null;
	this.b_strip = null;

	
	this.clut=[];
	this.n_col = DEF_COL;
	this.band_size = BAND_SIZE;

	this.width; /* width of terrain strip */

	this.ambient = 0.3; /* level of ambient light */
	this.contrast = 1.0; /*
									 * contrast, increases or decreases effect
									 * of cosine rule
									 */
	this.contour = 0.3;
	this.vfract = 0.6; /*
								 * relative strength of vertical light relative
								 * to the main light source
								 */
	this.altitude = 2.5;
	this.distance = 4.0;
	this.phi = (40.0 * Math.PI)
			/ 180.0;/* angle of the light (vertical plane) */
	this.alpha = 0.0; /*
								 * angle of the light (horizontal plane) must
								 * have -pi/4 < alpha < pi/4
								 */
	this.base_shift = 0.5; /*
									 * offset from calcalt to artist coordinates
									 */
	this.sealevel = 0.0;
	this.stretch = 0.6; /* vertical stretch */
	this.draw_map = false;
	this.reflec = true;
	this.repeat = 1;
	this.pos = 0;
	this.scroll = 0;

		
	this.rgb=function(r,g,b){
		return [
			(r * 255) & 255,
			(g * 255) & 255,
			(b * 255) & 255
			
		];
	};
	
	this.set_clut=function() {
		var band, shade;
		var red, green, blue, top, bot;

		var rb = [ 0.450, 0.600, 1.000 ];
		var gb = [ 0.500, 0.600, 1.000 ];
		var bb = [ 0.333, 0.000, 1.000 ];

		
		
		this.clut[BLACK] = [0,0,0];
		this.clut[WHITE] = [255,255,255];
		this.clut[SKY] = this.rgb(0.404, 0.588, 1.000);
		this.clut[SEA_LIT] = this.rgb(0.000, 0.500, 0.700);
		this.clut[SEA_UNLIT] = this.rgb(0.000, ((this.ambient + (this.vfract / (1.0 + this.vfract))) * 0.500),
				((this.ambient + (this.vfract / (1.0 + this.vfract))) * 0.700));

		/* max_col can over-rule band_size */
		while ((BAND_BASE + this.band_size * N_BANDS) > this.n_col) {
			this.band_size--;
		}

		for (band = 0; band < N_BANDS; band++) {
			for (shade = 0; shade < this.band_size; shade++) {
				/* {{{ set red */

				top = rb[band];
				bot = this.ambient * top;
				red = bot + ((shade * (top - bot)) / (this.band_size - 1));
				if (red < 0)
					red = 0.0;
				if (red > 1.0)
					red = 1.0;

				/* }}} */
				/* {{{ set green */
				top = gb[band];
				bot = this.ambient * top;
				green = bot + ((shade * (top - bot)) / (this.band_size - 1));
				if (green < 0)
					green = 0.0;
				if (green > 1.0)
					green = 1.0;

				/* }}} */
				/* {{{ set blue */
				top = bb[band];
				bot = this.ambient * top;
				blue = bot + ((shade * (top - bot)) / (this.band_size - 1));
				if (blue < 0)
					blue = 0.0;
				if (blue > 1.0)
					blue = 1.0;
				/* }}} */
				this.clut[BAND_BASE + (band * this.band_size) + shade] = this.rgb(red, green, blue);
			}
		}
	};

	this.extract=function() {
		var res;
		var i;
		
		res = this.m.next_strip();
		for (i = 0; i < res.length; i++) {
			res[i] = this.shift + (this.vscale * res[i]);
			// System.out.print(shift);
			// System.out.print(" ");
			// System.out.print(vscale);
			// System.out.print(" ");
			// System.out.println(res[i]);
		}
		return res;
	};

	this.init_artist_variables=function() {
		var dh, dd;

		if (this.initialised) {
			return;
		}
		this.initialised = true;
		this.m.init(); // We have to initialize to ensure width etc are set.
		this.width = this.m.width;

		this.set_clut();
		this.cos_phi = Math.cos(this.phi);
		this.sin_phi = Math.sin(this.phi);
		this.tan_phi = Math.tan(this.phi);

		this.x_fact = this.cos_phi * Math.cos(this.alpha);
		this.y_fact = this.cos_phi * Math.sin(this.alpha);
		/* Need to make space between columns 1.0 for get_col */
		this.vscale = this.stretch * this.m.width / this.m.fwidth;
		// System.out.println(m.mwidth);
		// System.out.println(m.fwidth);
		// System.out.println(m.width);
		this.delta_shadow = this.tan_phi / Math.cos(this.alpha);
		this.shadow_slip = Math.tan(this.alpha);
		/* guess the average height of the fractal */
		this.varience = Math.pow(this.m.mwidth, (2.0 * this.m.fdim));
		this.varience = this.vscale * this.varience;
		this.shift = this.base_shift * this.varience;
		this.varience = this.varience + this.shift;

		/* set the position of the view point */
		this.viewheight = this.altitude * this.width;
		this.viewpos = -this.distance * this.width;

		/*
		 * set viewing angle and focal length (vertical-magnification) try
		 * mapping the bottom of the fractal to the bottom of the screen. Try to
		 * get points in the middle of the fractal to be 1 pixel high
		 */
		dh = this.viewheight;
		dd = (this.width / 2.0) - this.viewpos;
		this.focal = Math.sqrt((dd * dd) + (dh * dh));
		this.tan_vangle = ((this.viewheight - this.sealevel) / -this.viewpos);
		this.vangle = Math.atan(this.tan_vangle);
		this.vangle -= Math.atan( (this.graph_height / 2) / this.focal);

		/* initialise the light strengths */
		this.vstrength = this.vfract * this.contrast / (1.0 + this.vfract);
		this.lstrength = this.contrast / (1.0 + this.vfract);
		if (this.repeat >= 0) {
			this.pos = 0;
		} else {
			this.pos = this.graph_width - 1;
		}
		
		/* use first set of heights to set shadow value */
		this.shadow = this.extract();
		this.a_strip = this.extract();
		this.b_strip = this.extract();

		this.blank_region(0,0,this.graph_width,this.graph_height);
	};

	this.get_col=function( p,  p_minus_x,  p_minus_y,  shadow) {
		var delta_x, delta_y;
		var delta_x_sqr, delta_y_sqr;
		var hypot_sqr;

		var norm, dshade;
		var effective;
		var index;
		var band, shade;
		// if underwater
		if (p < this.sealevel) {
			if (shadow > this.sealevel) {
				return (SEA_UNLIT);
			} else {
				return (SEA_LIT);
			}
		}

		/*
		 * We have three light sources, one slanting in from the left one
		 * directly from above and an ambient light. For the directional sources
		 * illumination is proportional to the cosine between the normal to the
		 * surface and the light.
		 *
		 * The surface contains two vectors ( 1, 0, delta_x ) ( 0, 1, delta_y )
		 *
		 * The normal therefore is parallel to ( -delta_x, -delta_y, 1)/sqrt( 1
		 * + delta_x^2 + delta_y^2)
		 *
		 * For light parallel to ( cos_phi, 0, -sin_phi) the cosine is
		 * (cos_phi*delta_x + sin_phi)/sqrt( 1 + delta_x^2 + delta_y^2)
		 *
		 * For light parallel to ( cos_phi*cos_alpha, cos_phi*sin_alpha,
		 * -sin_phi) the cosine is (cos_phi*cos_alpha*delta_x +
		 * cos_phi*sin_alpha*delta_y+ sin_phi)/sqrt( 1 + delta_x^2 + delta_y^2)
		 *
		 * For vertical light the cosine is 1 / sqrt( 1 + delta_x^2 + delta_y^2)
		 */

		delta_x = p - p_minus_x;
		delta_y = p - p_minus_y;
		delta_x_sqr = delta_x * delta_x;
		delta_y_sqr = delta_y * delta_y;
		hypot_sqr = delta_x_sqr + delta_y_sqr;
		norm = Math.sqrt(1.0 + hypot_sqr);

		// calculate effective height
		effective = (p + (this.varience * this.contour * (1.0 / (1.0 + hypot_sqr))));

		// calculate colour band.

		band =  ((effective / this.varience) *  N_BANDS) | 0;
		if (band < 0) {
			band = 0;
		}
		if (band > (N_BANDS - 1)) {
			band = (N_BANDS - 1);
		}
		index = (BAND_BASE + (band * this.band_size));

		// calculate the illumination stength
		/*
		 * add in a contribution for the vertical light. The normalisation
		 * factor is applied later
		 *
		 */
		dshade = this.vstrength;

		if (p >= shadow) {
			/*
			 * add in contribution from the main light source
			 */
			/*
			 * dshade += ((double) lstrength * ((delta_x * cos_phi) + sin_phi));
			 */
			dshade += (this.lstrength * ((delta_x * this.x_fact) + (delta_y * this.y_fact) + this.sin_phi));
		}
		/*
		 * divide by the normalisation factor (the same for both light sources)
		 */
		dshade /= norm;

		// calculate shading

		/*
		 * dshade should be in the range 0.0 -> 1.0 if the light intensities add
		 * to 1.0 now convert to an integer
		 */
		shade = (dshade * this.band_size) | 0;
		if (shade > (this.band_size - 1)) {
			shade = (this.band_size - 1);
		}
		// if shade is negative then point is really in deep shadow
		if (shade < 0) {
			shade = 0;
		}

		index += shade;

		return index;

	};

	this.makemap=function() {
		var res = [];
		var i;

		

		res[0] = BLACK;
		for (i = 1; i < this.width; i++) {
			res[i] = this.get_col(this.b_strip[i], this.a_strip[i], this.b_strip[i - 1], this.shadow[i]);
		}
		return res;

	};

	this.camera=function() {
		var i, j, coord, last;
		var res = [];
		var col;

		
		/* this routine returns a perspective view of the surface */

		/*
		 * optimised painters algorithm
		 *
		 * scan from front to back, we can avoid calculating the colour if the
		 * point is not visable.
		 */
		for (i = 0, last = 0; (i < this.width) && (last < this.graph_height); i++) {
			if (this.a_strip[i] < this.sealevel) {
				this.a_strip[i] = this.sealevel;
			}
			coord = 1 + this.project(i, this.a_strip[i]);
			if (coord > last) {
				/*
				 * get the colour of this point, the front strip should be black
				 */
				if (i == 0) {
					col = BLACK;
				} else {
					col = this.get_col(this.b_strip[i], this.a_strip[i], this.b_strip[i - 1], this.shadow[i]);
				}
				if (coord > this.graph_height) {
					coord = this.graph_height;
				}
				for (; last < coord; last++) {
					res[last] = col;
				}
			}
		}
		for (; last < this.graph_height; last++) {
			res[last] = SKY;
		}
		return res;
	};

	this.mirror=function() {
		
	    var res=[], map=[];
		var last_col;
		var i, j, top, bottom, coord;
		var last_top, last_bottom;
		var pivot;
		/*
		 * this routine returns a perspective view of the surface with
		 * reflections in the water
		 *
		 */
		
	
		last_col = SKY;
		last_top = this.graph_height - 1;
		last_bottom = 0;
		/*
		 * many of the optimisation in the camera routine are hard to implement
		 * in this case so we revert to the simple painters algorithm modified
		 * to produce reflections scan from back to front drawing strips between
		 * the projected position of height and -height. for water stipple the
		 * colour so the reflection is still visable
		 */
		map = this.makemap();
		pivot = 2.0 * this.sealevel;
		for (i = this.width - 1; i > 0; i--) {
			if (map[i] < BAND_BASE) {
				// stipple water values

				for (j = last_bottom; j <= last_top; j++) {
					res[j] = last_col;
				}
				last_col = map[i];
				/* invalidate strip so last stip does not exist */
				last_bottom = this.graph_height;
				last_top = -1;
				/* fill in water values */
				coord = 1 + this.project(i, this.sealevel);
				for (j = 0; j < coord; j++) {
					/*
					 * do not print on every other point if the current value is
					 * a land value
					 */
					if (((j + this.base) % 2 == 1) || (res[j] < BAND_BASE)) {
						res[j] = map[i];
					}
				}
				/* skip any adjacent bits of water with the same colour */
				while (map[i] == last_col) {
					i--;
				}
				i++; /* the end of the for loop will decrement as well */

			} else {
				// draw land values

				top = this.project(i, this.a_strip[i]);
				bottom = this.project(i, pivot - this.a_strip[i]);
				if (last_col == map[i]) {
					if (top > last_top) {
						last_top = top;
					}
					if (bottom < last_bottom) {
						last_bottom = bottom;
					}
				} else {
					if (top < last_top) {
						for (j = top + 1; j <= last_top; j++) {
							res[j] = last_col;
						}
					}
					if (bottom > last_bottom) {
						for (j = last_bottom; j < bottom; j++) {
							res[j] = last_col;
						}
					}
					last_top = top;
					last_bottom = bottom;
					last_col = map[i];
				}

			}
		}
		// draw in front face

		for (j = last_bottom; j <= last_top; j++) {
			res[j] = last_col;
		}
		if (this.a_strip[0] < this.sealevel) {
			coord = 1 + this.project(0, this.sealevel);
		} else {
			coord = 1 + this.project(0, this.a_strip[0]);
		}
		for (j = 0; j < coord; j++) {
			res[j] = map[0];
		}

		this.base = 1 - this.base;
		return res;
	};

	this.project=function( x, y) {
		var pos;
		var theta;

		theta = Math.atan( ((this.viewheight - y) / (x - this.viewpos)));
		theta = theta - this.vangle;
		pos = (this.graph_height / 2) -  (this.focal * Math.tan(theta));
		pos = pos | 0;  // convert to integer
		if (pos > (this.graph_height - 1)) {
			pos = this.graph_height - 1;
		} else if (pos < 0) {
			pos = 0;
		}
		return pos;
	};

	this.next_col=function() {
		if( ! this.initialised){
			this.init_artist_variables();
		}
		var res=[];
		var i, offset = 0;

		/* {{{ update strips */
		if (!this.draw_map) {
			if (this.reflec) {
				res = this.mirror();
			} else {
				res = this.camera();
			}
		} else {
			res = this.makemap();
		}
		this.a_strip = this.b_strip;
		this.b_strip = this.extract();

		/*
		 * shadow_slip is the Y component of the light vector. The shadows can
		 * only step an integer number of points in the Y direction so we
		 * maintain shadow_register as the deviation between where the shadows
		 * are and where they should be. When the magnitude of this gets larger
		 * then 1 the shadows are slipped by the required number of points. This
		 * will not work for very oblique angles so the horizontal angle of
		 * illumination should be constrained.
		 */
		this.shadow_register += this.shadow_slip;
		if (this.shadow_register >= 1.0) {
			// negative offset

			while (this.shadow_register >= 1.0) {
				this.shadow_register -= 1.0;
				offset++;
			}
			for (i = width - 1; i >= offset; i--) {
				this.shadow[i] = this.shadow[i - offset] - this.delta_shadow;
				if (this.shadow[i] < this.b_strip[i]) {
					this.shadow[i] = this.b_strip[i];
				}

				if (this.shadow[i] < this.sealevel) {
					this.shadow[i] = this.sealevel;
				}

			}
			for (i = 0; i < offset; i++) {
				this.shadow[i] = this.b_strip[i];
				// stop shadow at sea level
				if (this.shadow[i] < this.sealevel) {
					this.shadow[i] = this.sealevel;
				}

			}

		} else if (this.shadow_register <= -1.0) {
			// positive offset
			while (this.shadow_register <= -1.0) {
				this.shadow_register += 1.0;
				offset++;
			}
			for (i = 0; i < this.width - offset; i++) {
				this.shadow[i] = this.shadow[i + offset] - this.delta_shadow;
				if (this.shadow[i] < this.b_strip[i]) {
					this.shadow[i] = this.b_strip[i];
				}
				// stop shadow at sea level
				if (this.shadow[i] < this.sealevel) {
					this.shadow[i] = this.sealevel;
				}

			}
			for (; i < this.width; i++) {
				this.shadow[i] = this.b_strip[i];
				/* {{{ stop shadow at sea level */
				if (this.shadow[i] < this.sealevel) {
					this.shadow[i] = this.sealevel;
				}

			}
		} else {
			// no offset
			for (i = 0; i < this.width; i++) {
				this.shadow[i] -= this.delta_shadow;
				if (this.shadow[i] < this.b_strip[i]) {
					this.shadow[i] = this.b_strip[i];
				}
				// stop shadow at sea level
				if (this.shadow[i] < this.sealevel) {
					this.shadow[i] = this.sealevel;
				}

			}

		}

		return res;
	};

	this.blank_region=function( lx,  ly,  hx,  hy) {
		var i,j,pos=0;
		var sky=this.clut[SKY];
		for(i=ly;i<hy;i++){
			pos=i*this.graph_width*4;
			pos += (4*lx);
			for(j=lx;j<hx;j++){
				this.image.data[pos++]= sky[0];
				this.image.data[pos++]= sky[1];
				this.image.data[pos++]= sky[2];
				this.image.data[pos++]=255;
			}
		}
	};

	this.scroll_screen=function(dist) {
		var i,j,pos=0;
		var sky=this.clut[SKY];
		for(i=0;i<this.graph_height;i++){
			pos=i*this.graph_width*4;
		if (dist > 0) {
			for(j=0;j<this.graph_width-dist;j++){
				this.image.data[pos]=this.image.data[pos+(4*dist)];
				pos++;
				this.image.data[pos]=this.image.data[pos+(4*dist)];
				pos++;
				this.image.data[pos]=this.image.data[pos+(4*dist)];
				pos++;
				pos++;
			}
			for(j=0;j<dist;j++){
				this.image.data[pos]=sky[0];
				pos++;
				this.image.data[pos]=sky[1];
				pos++;
				this.image.data[pos]=sky[2];
				pos++;
				pos++;
			}
		} else {
			pos = pos +(4*this.graph_width) -1; // last position
			for(j=0;j<this.graph_width-dist;j++){
				pos--;
				this.image.data[pos]=this.image.data[pos+(4*dist)];
				pos--;
				this.image.data[pos]=this.image.data[pos+(4*dist)];
				pos--;
				this.image.data[pos]=this.image.data[pos+(4*dist)];
				pos--;
			}
			for(j=0;j<-dist;j++){
				pos--;
				this.image.data[pos]=sky[2];
				pos--;
				this.image.data[pos]=sky[1];
				pos--;
				this.image.data[pos]=sky[0];
				pos--;
			}
		}
		}
	};

	this.plot_pixel=function( x,  y,  col) {
		
		var c =this.clut[col];
		var pos = 4 * ( x + (y*this.graph_width));
		this.image.data[pos]=c[0];
		this.image.data[pos+1]=c[1];
		this.image.data[pos+2]=c[2];
		this.image.data[pos+3]=255;
	};

	this.plot_column=function() {
		var l =[];
		var j;
		var mapwid;

		if (!this.initialised) {
			this.init_artist_variables();
		}
		

		/* blank if we are doing the full window */
		if (this.repeat >= 0) {
			if (this.pos == 0) {
				this.blank_region(0, 0, this.graph_width, this.graph_height);
			}
		} else {
			if (this.pos == this.graph_width - 1) {
				this.blank_region(0, 0, this.graph_width, this.graph_height);
			}
		}
		if (this.scroll != 0) {
			this.scroll_screen(this.scroll);
		}

		l = this.next_col();
		if (this.draw_map) {
			if (this.graph_height > this.width) {
				mapwid = this.width;
			} else {
				mapwid = this.graph_height;
			}
			for (j = 0; j < (this.graph_height - this.mapwid); j++) {
				this.plot_pixel(this.pos, ((this.graph_height - 1) - j), BLACK);
			}
			for (j = 0; j < mapwid; j++) {
				this.plot_pixel(this.pos, ((mapwid - 1) - j), l[j]);
			}
		} else {
			for (j = 0; j < this.graph_height; j++) {
				/*
				 * we assume that the scroll routine fills the new region with a
				 * SKY value. This allows us to use a textured sky for B/W
				 * displays
				 */
				var c = l[j];
				//if (c != undefined && c != SKY ) {
					this.plot_pixel(this.pos, ((this.graph_height - 1) - j), c);
				//}
			}
		}
		this.scroll = 0;
		/* now update pos ready for next time */
		if (this.repeat >= 0) {
			this.pos++;
			if (this.pos >= this.graph_width) {
				this.pos -= this.repeat;
				if (this.pos < 0 || this.pos > this.graph_width - 1) {
					this.pos = 0;
				} else {
					this.scroll = this.repeat;
				}
			}
		} else {
			this.pos--;
			if (this.pos < 0) {
				this.pos -= this.repeat;
				if (this.pos < 0 || this.pos > (this.graph_width - 1)) {
					this.pos = this.graph_width - 1;
				} else {
					this.scroll = this.repeat;
				}
			}
		}

	};
}


